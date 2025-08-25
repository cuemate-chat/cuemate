import { withErrorLogging } from '@cuemate/logger';
import * as crypto from 'crypto';
import type { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// License 常量 (修正密钥长度为 16 字节)
const SECRET_KEY = 'CueMateService16';
const IV = '1QALXsP2GEdCvfR4';

interface LicenseData {
  corporation: string;
  expired: string; // YYYY-MM-DD format
  edition: string;
  product: string;
  count: number;
  licenseVersion: string;
}

interface LicenseExpand {
  create: string;
  version: string;
  license: LicenseData;
  random: string;
}

enum LicenseStatus {
  Success = 'Success',
  Fail = 'Fail',
  Expired = 'Expired',
}

interface LicenseResponse {
  status: LicenseStatus;
  message?: string;
  license?: LicenseData;
}

// AES 加解密工具函数
function aesDecrypt(cipherText: string, key: string, iv: string): string {
  try {
    // Base64 解码
    const cipherBytes = Buffer.from(cipherText, 'base64');

    // AES 解密
    const decipher = crypto.createDecipheriv(
      'aes-128-cbc',
      Buffer.from(key, 'utf8'),
      Buffer.from(iv, 'utf8'),
    );
    let decrypted = decipher.update(cipherBytes);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    // Base64 解码
    const base64String = decrypted.toString('utf8').trim();
    const jsonString = Buffer.from(base64String, 'base64').toString('utf8');

    return jsonString;
  } catch (error) {
    throw new Error('License 解密失败');
  }
}

// AES 加密功能已移除，仅保留解密验证功能

// License 验证函数
function validateLicenseKey(licenseKey: string): LicenseResponse {
  try {
    if (!licenseKey || licenseKey.trim() === '') {
      return { status: LicenseStatus.Fail, message: 'Invalid License' };
    }

    // 解密 License
    const decryptedJson = aesDecrypt(licenseKey, SECRET_KEY, IV);
    const licenseExpand: LicenseExpand = JSON.parse(decryptedJson);
    const license = licenseExpand.license;

    // 检查产品类型 (这里暂时不做严格检查)
    // if (license.product !== expectedProduct) {
    //   return { status: LicenseStatus.Fail, message: 'The license is unavailable for this product.' };
    // }

    // 检查过期时间
    const expiredDate = new Date(license.expired + 'T23:59:59.999Z');
    const currentDate = new Date();

    if (currentDate > expiredDate) {
      return { status: LicenseStatus.Expired, message: 'License has expired', license };
    }

    return { status: LicenseStatus.Success, license };
  } catch (error) {
    return { status: LicenseStatus.Fail, message: 'Invalid License' };
  }
}

export function registerLicenseRoutes(app: FastifyInstance) {
  // multipart 插件已在 files.ts 中注册，不需要重复注册

  // 上传和验证 License (文件上传)
  app.post(
    '/license/upload-file',
    withErrorLogging(app.log as any, 'license.upload-file', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();

        // 处理文件上传
        const data = await (req as any).file();
        if (!data) {
          return reply.code(400).send({ error: '请选择要上传的 License 文件' });
        }

        // 检查文件类型
        const filename = data.filename || '';
        if (!filename.toLowerCase().endsWith('.key')) {
          return reply.code(400).send({ error: '只支持上传 .key 文件' });
        }

        // 读取文件内容
        let licenseKey = '';
        for await (const chunk of data.file) {
          licenseKey += chunk.toString();
        }

        licenseKey = licenseKey.trim();
        if (!licenseKey) {
          return reply.code(400).send({ error: 'License 文件内容为空' });
        }

        // 验证 License
        const validationResult = validateLicenseKey(licenseKey);

        if (validationResult.status === LicenseStatus.Fail) {
          return reply.code(400).send({ error: validationResult.message || 'License 验证失败' });
        }

        if (validationResult.status === LicenseStatus.Expired) {
          return reply.code(400).send({ error: 'License 已过期' });
        }

        const license = validationResult.license!;
        const now = Date.now();

        // 删除现有的 License (每次只能有一个有效 License)
        (app as any).db.prepare('DELETE FROM licenses WHERE status = ?').run('active');

        // 插入新的 License
        const licenseId = uuidv4();
        (app as any).db
          .prepare(
            `
        INSERT INTO licenses (
          id, corporation, edition, expire_time, product_type, authorize_count, 
          apply_user, status, license_key, license_version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
          )
          .run(
            licenseId,
            license.corporation,
            license.edition,
            new Date(license.expired + 'T23:59:59.999Z').getTime(),
            license.product,
            license.count,
            payload.uid,
            'active',
            licenseKey,
            license.licenseVersion,
            now,
            now,
          );

        return {
          success: true,
          message: 'License 上传成功',
          license: {
            id: licenseId,
            corporation: license.corporation,
            edition: license.edition,
            expireTime: new Date(license.expired + 'T23:59:59.999Z').getTime(),
            productType: license.product,
            authorizeCount: license.count,
            licenseVersion: license.licenseVersion,
            applyUser: payload.uid,
            status: 'active',
          },
        };
      } catch (error: any) {
        app.log.error('上传 License 文件失败:', error);
        if (error.name === 'PayloadTooLargeError') {
          return reply.code(413).send({ error: '文件太大，请上传小于 10MB 的文件' });
        }
        return reply.code(500).send({ error: '上传失败: ' + error.message });
      }
    }),
  );

  // 上传和验证 License (文本方式，保持兼容性)
  const uploadLicenseSchema = z.object({
    licenseKey: z.string().min(1, 'License Key 不能为空'),
  });

  app.post(
    '/license/upload',
    withErrorLogging(app.log as any, 'license.upload', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const body = uploadLicenseSchema.parse(req.body);

        // 验证 License
        const validationResult = validateLicenseKey(body.licenseKey);

        if (validationResult.status === LicenseStatus.Fail) {
          return reply.code(400).send({ error: validationResult.message || 'License 验证失败' });
        }

        if (validationResult.status === LicenseStatus.Expired) {
          return reply.code(400).send({ error: 'License 已过期' });
        }

        const license = validationResult.license!;
        const now = Date.now();

        // 删除现有的 License (每次只能有一个有效 License)
        (app as any).db.prepare('DELETE FROM licenses WHERE status = ?').run('active');

        // 插入新的 License
        const licenseId = uuidv4();
        (app as any).db
          .prepare(
            `
        INSERT INTO licenses (
          id, corporation, edition, expire_time, product_type, authorize_count, 
          apply_user, status, license_key, license_version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
          )
          .run(
            licenseId,
            license.corporation,
            license.edition,
            new Date(license.expired + 'T23:59:59.999Z').getTime(),
            license.product,
            license.count,
            payload.uid,
            'active',
            body.licenseKey,
            license.licenseVersion,
            now,
            now,
          );

        return {
          success: true,
          message: 'License 上传成功',
          license: {
            id: licenseId,
            corporation: license.corporation,
            edition: license.edition,
            expireTime: new Date(license.expired + 'T23:59:59.999Z').getTime(),
            productType: license.product,
            authorizeCount: license.count,
            licenseVersion: license.licenseVersion,
            applyUser: payload.uid,
            status: 'active',
          },
        };
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({ error: error.errors[0].message });
        }
        return reply.code(401).send({ error: '未认证' });
      }
    }),
  );

  // 获取当前 License 信息
  app.get(
    '/license/info',
    withErrorLogging(app.log as any, 'license.info', async (req, reply) => {
      try {
        await (req as any).jwtVerify();

        const license = (app as any).db
          .prepare('SELECT * FROM licenses WHERE status = ? ORDER BY created_at DESC LIMIT 1')
          .get('active');

        if (!license) {
          return { license: null, message: '暂无有效的 License' };
        }

        // 检查是否过期
        if (Date.now() > license.expire_time) {
          // 删除过期的 License
          (app as any).db.prepare('DELETE FROM licenses WHERE id = ?').run(license.id);
          return { license: null, message: 'License 已过期' };
        }

        return {
          license: {
            id: license.id,
            corporation: license.corporation,
            edition: license.edition,
            expireTime: license.expire_time,
            productType: license.product_type,
            authorizeCount: license.authorize_count,
            licenseVersion: license.license_version || 'v1',
            applyUser: license.apply_user,
            status: license.status,
            createdAt: license.created_at,
            updatedAt: license.updated_at,
          },
        };
      } catch (error) {
        return reply.code(401).send({ error: '未认证' });
      }
    }),
  );

  // 删除 License
  app.delete(
    '/license/:id',
    withErrorLogging(app.log as any, 'license.delete', async (req, reply) => {
      try {
        await (req as any).jwtVerify();

        const params = z.object({ id: z.string() }).parse(req.params);

        const result = (app as any).db.prepare('DELETE FROM licenses WHERE id = ?').run(params.id);

        if (result.changes === 0) {
          return reply.code(404).send({ error: 'License 不存在' });
        }

        return { success: true, message: 'License 删除成功' };
      } catch (error) {
        return reply.code(401).send({ error: '未认证' });
      }
    }),
  );

  // 上传内置题库 SQL 文件
  app.post(
    '/license/upload-questions',
    withErrorLogging(app.log as any, 'license.upload-questions', async (req, reply) => {
      try {
        await (req as any).jwtVerify();

        // 检查是否有有效的 License
        const activeLicense = (app as any).db
          .prepare(
            'SELECT * FROM licenses WHERE status = ? AND expire_time >= ? ORDER BY created_at DESC LIMIT 1',
          )
          .get('active', Date.now());

        if (!activeLicense) {
          return reply.code(403).send({ error: '请先上传有效的 License' });
        }

        // 处理文件上传
        const data = await (req as any).file();
        if (!data) {
          return reply.code(400).send({ error: '请选择要上传的 SQL 文件' });
        }

        // 检查文件类型
        const filename = data.filename || '';
        if (!filename.toLowerCase().endsWith('.sql')) {
          return reply.code(400).send({ error: '只支持上传 .sql 文件' });
        }

        // 读取文件内容
        let sqlContent = '';
        for await (const chunk of data.file) {
          sqlContent += chunk.toString();
        }

        if (!sqlContent.trim()) {
          return reply.code(400).send({ error: 'SQL 文件内容为空' });
        }

        // 解析并执行 SQL 语句
        let insertedCount = 0;
        let existingCount = 0;
        let totalAttempted = 0;

        const statements = sqlContent
          .split(';')
          .map((stmt) => stmt.trim())
          .filter((stmt) => stmt.length > 0);

        const db = (app as any).db;

        // 准备检查ID是否存在的语句
        const checkExistsStmt = db.prepare(
          'SELECT COUNT(*) as count FROM preset_questions WHERE id = ?',
        );

        const transaction = db.transaction(() => {
          for (const statement of statements) {
            try {
              // 只允许执行 INSERT 语句，并且只能插入到 preset_questions 表
              if (
                statement.toLowerCase().includes('insert') &&
                statement.toLowerCase().includes('preset_questions')
              ) {
                totalAttempted++;

                // 提取ID字段值
                const idMatch = statement.match(/VALUES\s*\(\s*'([^']+)'/i);
                if (!idMatch) {
                  app.log.warn(`无法从语句中提取ID: ${statement.substring(0, 100)}...`);
                  continue;
                }

                const id = idMatch[1];

                // 检查ID是否已存在
                const existsResult = checkExistsStmt.get(id);
                if (existsResult && existsResult.count > 0) {
                  existingCount++;
                  app.log.info(`题库ID ${id} 已存在，跳过插入`);
                  continue;
                }

                // ID不存在，执行插入
                try {
                  const result = db.prepare(statement).run();
                  if (result.changes > 0) {
                    insertedCount++;
                    app.log.info(`成功插入题库ID: ${id}`);
                  }
                } catch (insertError: any) {
                  // 如果是唯一性约束错误，也算作已存在
                  if (insertError.message && insertError.message.includes('UNIQUE')) {
                    existingCount++;
                    app.log.info(`题库ID ${id} 插入时发现重复，算作已存在`);
                  } else {
                    app.log.error(`插入题库ID ${id} 失败:`, insertError);
                    throw insertError;
                  }
                }
              } else if (statement.toLowerCase().includes('insert')) {
                // 如果是其他表的插入语句，记录日志但不执行
                app.log.warn(
                  `跳过非 preset_questions 表的插入语句: ${statement.substring(0, 100)}...`,
                );
              }
            } catch (error: any) {
              app.log.error(`SQL 语句处理失败: ${statement.substring(0, 100)}...`, error);
              // 对于单个语句的错误，我们记录日志但不中止整个事务
            }
          }
        });

        try {
          transaction();

          if (totalAttempted === 0) {
            return reply.code(400).send({
              error: 'SQL 文件中没有找到有效的 preset_questions 插入语句',
            });
          }

          const message = `内置题库导入完成: ${insertedCount}/${totalAttempted} 条新增，${existingCount} 条已存在`;
          app.log.info(message);

          return {
            success: true,
            message,
            insertedCount,
            existingCount,
            totalAttempted,
            summary: `${insertedCount}/${totalAttempted}`,
          };
        } catch (error: any) {
          app.log.error('执行 SQL 事务失败:', error);
          return reply.code(500).send({ error: 'SQL 执行失败: ' + error.message });
        }
      } catch (error: any) {
        app.log.error('上传内置题库失败:', { 
          error: error?.message || 'No message',
          name: error?.name || 'No name',
          stack: error?.stack || 'No stack',
          type: typeof error,
          errorObj: error
        });
        if (error.name === 'PayloadTooLargeError') {
          return reply.code(413).send({ error: '文件太大，请上传小于 10MB 的文件' });
        }
        return reply.code(500).send({ error: '上传失败: ' + (error?.message || '未知错误') });
      }
    }),
  );
}
