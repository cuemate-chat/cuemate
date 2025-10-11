import * as crypto from 'crypto';

// License 常量 (与license.ts保持一致)
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

// AES 解密工具函数
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

// 启动时验证所有License
export async function validateLicenseAtStartup(db: any, logger: any): Promise<void> {
  try {
    const now = Date.now();

    // 获取所有状态为active的License
    const licenses = db.prepare('SELECT * FROM licenses WHERE status = ?').all('active');

    if (!licenses || licenses.length === 0) {
      logger.warn('当前没有激活状态的 License');
      return;
    }

    let validCount = 0;
    let invalidCount = 0;
    let expiredCount = 0;

    for (const license of licenses) {
      try {
        // 验证License key
        const validationResult = validateLicenseKey(license.license_key);

        if (validationResult.status === LicenseStatus.Success) {
          // License验证成功，检查是否与数据库时间一致
          const dbExpireTime = license.expire_time;
          const currentTime = now;

          if (currentTime > dbExpireTime) {
            // 数据库记录显示已过期，更新状态为expired
            db.prepare('UPDATE licenses SET status = ? WHERE id = ?').run('expired', license.id);
            expiredCount++;
            // 降噪：改为 warn，仅保留必要信息
            logger.warn(`License ${license.id} 已过期，状态已更新为 expired`);
          } else {
            // License有效
            validCount++;
            // 降噪：成功不再打 info，避免批量刷屏
            logger.debug(`License ${license.id} 验证成功`);
          }
        } else if (validationResult.status === LicenseStatus.Expired) {
          // License key验证显示已过期，更新状态
          db.prepare('UPDATE licenses SET status = ? WHERE id = ?').run('expired', license.id);
          expiredCount++;
          logger.warn(`License ${license.id} key验证显示已过期，状态已更新为 expired`);
        } else {
          // License验证失败，更新状态为invalid
          db.prepare('UPDATE licenses SET status = ? WHERE id = ?').run('invalid', license.id);
          invalidCount++;
          logger.warn(`License ${license.id} 验证失败: ${validationResult.message}`);
        }
      } catch (error: any) {
        // 验证过程出错，标记为invalid
        db.prepare('UPDATE licenses SET status = ? WHERE id = ?').run('invalid', license.id);
        invalidCount++;
        logger.error({ err: error }, `License ${license.id} 验证过程出错`);
      }
    }

    if (validCount === 0) {
      logger.warn('当前没有有效的 License，请上传有效的 License 文件');
    }
  } catch (error: any) {
    logger.error({ err: error }, 'License 验证过程中发生错误');
  }
}
