import type { FastifyInstance } from 'fastify';
import { withErrorLogging } from '@cuemate/logger';
import { buildPrefixedError } from '../utils/error-response.js';
import { logOperation, OPERATION_MAPPING } from '../utils/operation-logger-helper.js';
import { OperationType } from '../utils/operation-logger.js';
import { notifyNewVersionAvailable } from '../utils/notification-helper.js';

// 腾讯云 COS 公共读 bucket 的直接访问 URL
// 使用 COS 原生域名，因为自定义域名需要配置 HTTPS 证书
const COS_BUCKET_URL = 'https://cuemate-1300709663.cos.ap-beijing.myqcloud.com';

/**
 * 比较版本号，返回 true 如果 v1 > v2
 */
function compareVersions(v1: string, v2: string): boolean {
  const parts1 = v1.replace(/^v/, '').split('.').map(Number);
  const parts2 = v2.replace(/^v/, '').split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return true;
    if (p1 < p2) return false;
  }
  return false;
}

/**
 * 检查并创建新版本通知
 */
async function checkAndNotifyNewVersion(db: any, userId: string, latestVersion: any) {
  try {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // 获取用户当前版本（从 users 表获取）
    const user = db.prepare('SELECT client_version FROM users WHERE uid = ?').get(userId);
    const currentVersion = user?.client_version || 'v0.0.0';

    // 比较版本号，如果最新版本大于当前版本
    if (compareVersions(latestVersion.version, currentVersion)) {
      // 检查24小时内是否已经创建过该版本的通知
      const existingNotification = db
        .prepare(
          `
          SELECT id FROM user_notifications
          WHERE user_id = ?
          AND type = 'version_update'
          AND resource_id = ?
          AND created_at > ?
        `,
        )
        .get(userId, latestVersion.version, now - dayMs);

      if (!existingNotification) {
        // 创建新版本通知
        notifyNewVersionAvailable(db, userId, {
          version: latestVersion.version,
          releaseNotes: latestVersion.release_notes || '请查看版本详情了解更新内容',
          updateTime: latestVersion.create_time,
          platform: latestVersion.platform,
          features: latestVersion.features || [],
        });

        (db as any).log?.info(
          { userId, version: latestVersion.version, currentVersion },
          '已创建新版本通知',
        );
      }
    }
  } catch (error) {
    // 版本检查失败不影响主流程，只记录日志
    (db as any).log?.error({ err: error }, '检查新版本通知失败');
  }
}

export function registerVersionRoutes(app: FastifyInstance) {
  const db = (app as any).db;

  // 获取版本列表
  app.get(
    '/api/versions',
    withErrorLogging(app.log as any, 'versions.list', async (request, reply) => {
      try {
        // 从索引文件获取版本文件列表
        const indexUrl = `${COS_BUCKET_URL}/cuemate-version/index.json`;
        const indexResponse = await fetch(indexUrl);

        if (!indexResponse.ok) {
          throw new Error(`Failed to fetch index: ${indexResponse.statusText}`);
        }

        const indexData = (await indexResponse.json()) as {
          latest?: string;
          files?: string[];
        };
        const versionFiles = indexData.files || [];

        // 获取每个版本文件的内容
        const versionPromises = versionFiles.map(async (filename: string) => {
          try {
            const fileUrl = `${COS_BUCKET_URL}/cuemate-version/${filename}`;
            const fileResponse = await fetch(fileUrl);

            if (!fileResponse.ok) {
              throw new Error(`Failed to fetch ${filename}: ${fileResponse.statusText}`);
            }

            const content = await fileResponse.json();
            return content;
          } catch (error) {
            app.log.error({ err: error }, `Failed to fetch version file ${filename}`);
            return null;
          }
        });

        const versions = await Promise.all(versionPromises);

        // 过滤掉失败的请求并按时间排序
        const validVersions = versions
          .filter((v) => v !== null)
          .sort((a: any, b: any) => {
            return new Date(b.create_time).getTime() - new Date(a.create_time).getTime();
          });

        // 检查用户是否已登录，如果已登录则检查新版本并创建通知
        try {
          const payload = await (request as any).jwtVerify();
          const userId = payload.uid;

          // 如果有最新版本，检查并创建通知
          if (validVersions.length > 0) {
            const latestVersion = validVersions[0];
            await checkAndNotifyNewVersion(db, userId, latestVersion);
          }
        } catch (error) {
          // 用户未登录，跳过通知检查
        }

        // 记录操作日志
        await logOperation(app, request, {
          ...OPERATION_MAPPING.SYSTEM,
          resourceId: 'version-list',
          resourceName: '版本列表查询',
          operation: OperationType.VIEW,
          message: `查询版本列表，共 ${validVersions.length} 个版本`,
          status: 'success',
        });

        return reply.send({ versions: validVersions });
      } catch (error) {
        app.log.error({ err: error }, 'Failed to fetch version list');

        // 记录失败日志
        await logOperation(app, request, {
          ...OPERATION_MAPPING.SYSTEM,
          resourceId: 'version-list',
          resourceName: '版本列表查询',
          operation: OperationType.VIEW,
          message: `查询版本列表失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
          status: 'failed',
        });

        return reply.status(500).send(buildPrefixedError('获取版本列表失败', error as Error, 500));
      }
    }),
  );

  // 获取单个版本详情
  app.get(
    '/api/versions/:version',
    withErrorLogging(app.log as any, 'versions.detail', async (request, reply) => {
      try {
        const { version } = request.params as { version: string };
        const key = `cuemate-version/cuemate-version-${version}.json`;
        const fileUrl = `${COS_BUCKET_URL}/${key}`;

        const fileResponse = await fetch(fileUrl);

        if (!fileResponse.ok) {
          throw new Error(`Version not found: ${fileResponse.statusText}`);
        }

        const content = await fileResponse.text();
        const versionData = JSON.parse(content);

        // 记录操作日志
        await logOperation(app, request, {
          ...OPERATION_MAPPING.SYSTEM,
          resourceId: version,
          resourceName: `版本详情: ${version}`,
          operation: OperationType.VIEW,
          message: `查询版本 ${version} 详情`,
          status: 'success',
        });

        return reply.send(versionData);
      } catch (error) {
        app.log.error({ err: error }, 'Failed to fetch version detail');

        const { version } = request.params as { version: string };

        // 记录失败日志
        await logOperation(app, request, {
          ...OPERATION_MAPPING.SYSTEM,
          resourceId: version,
          resourceName: `版本详情: ${version}`,
          operation: OperationType.VIEW,
          message: `查询版本 ${version} 详情失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
          status: 'failed',
        });

        return reply.status(404).send(buildPrefixedError('版本不存在', error as Error, 404));
      }
    }),
  );
}
