import { withErrorLogging } from '@cuemate/logger';
import CryptoJS from 'crypto-js';
import type { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { buildPrefixedError } from '../utils/error-response.js';
import { logOperation, OPERATION_MAPPING } from '../utils/operation-logger-helper.js';
import { OperationType } from '../utils/operation-logger.js';
import { notifyLicenseImported } from '../utils/notification-helper.js';

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

// AES 解密工具函数（使用 CryptoJS，与加密端保持一致）
function aesDecrypt(cipherText: string, key: string, iv: string): string {
  try {
    // 使用 CryptoJS 进行 AES 解密
    const decrypted = CryptoJS.AES.decrypt(
      cipherText,
      CryptoJS.enc.Utf8.parse(key),
      {
        iv: CryptoJS.enc.Utf8.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );

    // 解密后得到 Base64 编码的字符串
    const base64String = decrypted.toString(CryptoJS.enc.Utf8);

    // Base64 解码得到 JSON 字符串
    const jsonString = CryptoJS.enc.Base64.parse(base64String).toString(CryptoJS.enc.Utf8);

    return jsonString;
  } catch (error) {
    throw new Error('License 解密失败');
  }
}

// License 验证函数
function validateLicenseKey(licenseKey: string): LicenseResponse {
  try {
    if (!licenseKey || licenseKey.trim() === '') {
      return { status: LicenseStatus.Fail, message: 'License 文件为空' };
    }

    // 解密 License
    let decryptedJson: string;
    try {
      decryptedJson = aesDecrypt(licenseKey, SECRET_KEY, IV);
    } catch (decryptError) {
      return { status: LicenseStatus.Fail, message: 'License 解密失败，请确认文件格式正确' };
    }

    // 解析 JSON
    let licenseExpand: LicenseExpand;
    try {
      licenseExpand = JSON.parse(decryptedJson);
    } catch (parseError) {
      return { status: LicenseStatus.Fail, message: 'License 格式无效，解析失败' };
    }

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
  // multipart 插件已在 index.ts 中全局注册，这里直接使用

  // 上传和验证 License (文件上传)
  app.post(
    '/license/upload-file',
    withErrorLogging(app.log as any, 'license.upload-file', async (req, reply) => {
      // JWT 认证检查
      let payload: any;
      try {
        payload = await (req as any).jwtVerify();
      } catch (jwtError: any) {
        app.log.warn({ err: jwtError }, 'JWT 认证失败');
        return reply.code(401).send({ error: 'JWT 认证失败，请重新登录' });
      }

      try {
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

        // 记录操作日志
        await logOperation(app, req, {
          ...OPERATION_MAPPING.LICENSE,
          resourceId: licenseId,
          resourceName: `${license.corporation}_${license.edition}`,
          operation: OperationType.CREATE,
          message: `上传 License 文件: ${license.corporation} (${license.edition})`,
          status: 'success',
          userId: payload.uid
        });

        // 发送许可证激活通知
        try {
          const expireTime = new Date(license.expired + 'T23:59:59.999Z').getTime();
          notifyLicenseImported((app as any).db, payload.uid, {
            id: licenseId,
            type: license.edition,
            expireAt: expireTime,
          });
        } catch (notifyError) {
          app.log.error({ err: notifyError }, '发送许可证激活通知失败');
        }

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
        app.log.error({ err: error }, '上传 License 文件失败');
        if (error.name === 'PayloadTooLargeError') {
          return reply.code(413).send(buildPrefixedError('License 文件上传失败', error, 413));
        }
        return reply.code(500).send(buildPrefixedError('License 文件上传失败', error, 500));
      }
    }),
  );

  // 上传和验证 License (文本方式，保持兼容性)
  const uploadLicenseSchema = z.object({
    license_key: z.string().min(1, 'License Key 不能为空'),
  });

  app.post(
    '/license/upload',
    withErrorLogging(app.log as any, 'license.upload', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const body = uploadLicenseSchema.parse(req.body);

        // 验证 License
        const validationResult = validateLicenseKey(body.license_key);

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
            body.license_key,
            license.licenseVersion,
            now,
            now,
          );

        // 记录操作日志
        await logOperation(app, req, {
          ...OPERATION_MAPPING.LICENSE,
          resourceId: licenseId,
          resourceName: `${license.corporation}_${license.edition}`,
          operation: OperationType.CREATE,
          message: `上传 License 文本: ${license.corporation} (${license.edition})`,
          status: 'success',
          userId: payload.uid
        });

        // 发送许可证激活通知
        try {
          const expireTime = new Date(license.expired + 'T23:59:59.999Z').getTime();
          notifyLicenseImported((app as any).db, payload.uid, {
            id: licenseId,
            type: license.edition,
            expireAt: expireTime,
          });
        } catch (notifyError) {
          app.log.error({ err: notifyError }, '发送许可证激活通知失败');
        }

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
          return reply.code(400).send(buildPrefixedError('License 文本上传失败', error, 400));
        }
        return reply.code(401).send(buildPrefixedError('License 文本上传失败', error, 401));
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
      } catch (error: any) {
        return reply.code(401).send(buildPrefixedError('获取 License 信息失败', error, 401));
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

        // 先获取 license 信息用于日志记录
        const existingLicense = (app as any).db.prepare('SELECT * FROM licenses WHERE id = ?').get(params.id);
        
        const result = (app as any).db.prepare('DELETE FROM licenses WHERE id = ?').run(params.id);

        if (result.changes === 0) {
          return reply.code(404).send({ error: 'License 不存在' });
        }

        // 记录操作日志
        const payload = (req as any).user as any;
        await logOperation(app, req, {
          ...OPERATION_MAPPING.LICENSE,
          resourceId: params.id,
          resourceName: existingLicense ? `${existingLicense.corporation}_${existingLicense.edition}` : 'License',
          operation: OperationType.DELETE,
          message: `删除 License: ${existingLicense ? existingLicense.corporation : 'Unknown'}`,
          status: 'success',
          userId: payload.uid
        });

        return { success: true, message: 'License 删除成功' };
      } catch (error: any) {
        return reply.code(401).send(buildPrefixedError('删除 License 失败', error, 401));
      }
    }),
  );

}
