import type { FastifyInstance } from 'fastify';
import { withErrorLogging } from '@cuemate/logger';
import { buildPrefixedError } from '../utils/error-response.js';
import { logOperation, OPERATION_MAPPING } from '../utils/operation-logger-helper.js';
import { OperationType } from '../utils/operation-logger.js';

// 腾讯云 COS 公共读 bucket 的直接访问 URL
const COS_BUCKET_URL = 'https://cuemate.chat';

export function registerVersionRoutes(app: FastifyInstance) {
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
