import { withErrorLogging } from '@cuemate/logger';
import type { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { buildPrefixedError } from '../utils/error-response.js';
import { logOperation, OPERATION_MAPPING } from '../utils/operation-logger-helper.js';
import { OperationType } from '../utils/operation-logger.js';

// 广告数据验证模式
const pixelAdSchema = z.object({
  title: z.string().min(1, '广告标题不能为空').max(100, '广告标题不能超过 100 字符'),
  description: z.string().min(1, '广告描述不能为空').max(500, '广告描述不能超过 500 字符'),
  link_url: z.string().url('请输入有效的 URL').max(1000, 'URL 不能超过 1000 字符'),
  image_path: z.string().min(1, '图片路径不能为空').max(500, '图片路径不能超过 500 字符'),
  block_config_id: z.string().min(1, '必须选择一个广告块').max(10, '块 ID 不能超过 10 字符'),
  contact_info: z.string().max(200, '联系信息不能超过 200 字符').optional(),
  notes: z.string().max(500, '备注不能超过 500 字符').optional(),
  expires_at: z.number().int().min(Date.now(), '过期时间不能早于当前时间'),
});

const updatePixelAdSchema = pixelAdSchema.partial();

// 检查块是否被占用
function checkBlockOccupied(db: any, blockConfigId: string, excludeId?: string): boolean {
  const query = excludeId
    ? `SELECT COUNT(*) as count FROM pixel_ads 
       WHERE status = 'active' AND expires_at > ? AND block_config_id = ? AND id != ?`
    : `SELECT COUNT(*) as count FROM pixel_ads 
       WHERE status = 'active' AND expires_at > ? AND block_config_id = ?`;

  const now = Date.now();
  const params = excludeId ? [now, blockConfigId, excludeId] : [now, blockConfigId];

  const result = db.prepare(query).get(...params);
  return result.count > 0;
}

export function registerAdsRoutes(app: FastifyInstance) {
  // 获取所有块配置（用于前端展示布局）
  app.get(
    '/block-configs',
    withErrorLogging(app.log as any, 'block-configs.list', async (_req, reply) => {
      try {
        const blockConfigs = app.db
          .prepare(
            `
            SELECT bc.*, bp.price 
            FROM block_configs bc
            LEFT JOIN base_prices bp ON bc.price_id = bp.id
            ORDER BY CAST(bc.id AS INTEGER)
          `,
          )
          .all();

        return { blockConfigs };
      } catch (error: any) {
        app.log.error({ err: error }, '获取块配置失败');
        return reply.code(500).send({
          error: '服务器错误',
          details: error.message || error,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
      }
    }),
  );

  // 获取所有价格配置
  app.get(
    '/base-prices',
    withErrorLogging(app.log as any, 'base-prices.list', async (_req, reply) => {
      try {
        const basePrices = app.db.prepare('SELECT * FROM base_prices ORDER BY price ASC').all();

        return { basePrices };
      } catch (error: any) {
        app.log.error({ err: error }, '获取价格配置失败');
        return reply.code(500).send({
          error: '服务器错误',
          details: error.message || error,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
      }
    }),
  );

  // 获取可用的块配置（未被占用的）
  app.get(
    '/block-configs/available',
    withErrorLogging(app.log as any, 'block-configs.available', async (req, reply) => {
      try {
        const now = Date.now();
        const query = req.query as { exclude_ad_id?: string };

        let sql = `
          SELECT bc.*, bp.price 
          FROM block_configs bc
          LEFT JOIN base_prices bp ON bc.price_id = bp.id
          WHERE bc.id NOT IN (
            SELECT block_config_id 
            FROM pixel_ads 
            WHERE status = 'active' AND expires_at > ?`;

        const params: any[] = [now];

        // 如果是编辑模式，排除当前编辑的广告记录
        if (query.exclude_ad_id) {
          sql += ` AND id != ?`;
          params.push(query.exclude_ad_id);
        }

        sql += `
          )
          ORDER BY CAST(bc.id AS INTEGER)
        `;

        const availableBlocks = app.db.prepare(sql).all(...params);

        return { availableBlocks };
      } catch (error: any) {
        app.log.error({ err: error }, '获取可用块配置失败');
        return reply.code(500).send({
          error: '服务器错误',
          details: error.message || error,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
      }
    }),
  );
  // 获取所有广告（分页）
  app.get(
    '/pixel-ads',
    withErrorLogging(app.log as any, 'pixel-ads.list', async (req, reply) => {
      try {
        await req.jwtVerify();
        const query = z.object({
          page: z
            .string()
            .transform((val) => parseInt(val))
            .pipe(z.number().int().min(1))
            .optional()
            .default('1'),
          limit: z
            .string()
            .transform((val) => parseInt(val))
            .pipe(z.number().int().min(1).max(100))
            .optional()
            .default('20'),
          status: z.enum(['active', 'inactive', 'expired']).optional(),
          search: z.string().optional(),
          block_config_id: z.string().optional(),
        });

        const { page, limit, status, search, block_config_id } = query.parse(req.query);
        const offset = (page - 1) * limit;

        let whereClause = '1=1';
        let params: any[] = [];

        if (status) {
          whereClause += ' AND pa.status = ?';
          params.push(status);
        }

        if (search) {
          whereClause += ' AND (pa.title LIKE ? OR pa.description LIKE ?)';
          params.push(`%${search}%`, `%${search}%`);
        }

        if (block_config_id) {
          whereClause += ' AND pa.block_config_id = ?';
          params.push(block_config_id);
        }

        // 获取总数
        const countQuery = `SELECT COUNT(*) as total FROM pixel_ads pa WHERE ${whereClause}`;
        const { total } = app.db.prepare(countQuery).get(...params);

        // 获取数据，JOIN block_configs 和 base_prices 获取完整信息
        const dataQuery = `
          SELECT pa.*, 
                 bc.block_id, bc.x, bc.y, bc.width, bc.height, bc.type,
                 bp.price,
                 pa.block_config_id
          FROM pixel_ads pa
          LEFT JOIN block_configs bc ON pa.block_config_id = bc.id
          LEFT JOIN base_prices bp ON bc.price_id = bp.id
          WHERE ${whereClause}
          ORDER BY pa.created_at DESC
          LIMIT ? OFFSET ?
        `;
        const ads = app.db.prepare(dataQuery).all(...params, limit, offset);

        return {
          ads,
          pagination: {
            total,
            page,
            limit,
          },
        };
      } catch (err: any) {
        app.log.error({ err }, '获取广告列表失败');
        return reply.code(401).send(buildPrefixedError('获取广告列表失败', err, 401));
      }
    }),
  );

  // 获取单个广告
  app.get(
    '/pixel-ads/:id',
    withErrorLogging(app.log as any, 'pixel-ads.get', async (req, reply) => {
      try {
        await req.jwtVerify();
        const params = z.object({ id: z.string() }).parse(req.params);

        const ad = app.db
          .prepare(
            `
          SELECT pa.*, 
                 bc.block_id, bc.x, bc.y, bc.width, bc.height, bc.type,
                 bp.price,
                 pa.block_config_id
          FROM pixel_ads pa
          LEFT JOIN block_configs bc ON pa.block_config_id = bc.id
          LEFT JOIN base_prices bp ON bc.price_id = bp.id
          WHERE pa.id = ?
        `,
          )
          .get(params.id);

        if (!ad) {
          return reply.code(404).send({ error: '广告不存在' });
        }

        return { ad };
      } catch (err: any) {
        app.log.error({ err }, '获取广告详情失败');
        return reply.code(401).send(buildPrefixedError('获取广告详情失败', err, 401));
      }
    }),
  );

  // 获取所有活跃广告（用于像素广告页面显示）
  app.get(
    '/pixel-ads/public/active',
    withErrorLogging(app.log as any, 'pixel-ads.public', async (_req, reply) => {
      try {
        const now = Date.now();
        const ads = app.db
          .prepare(
            `
            SELECT pa.id, pa.title, pa.description, pa.link_url, pa.image_path, 
                   pa.contact_info, pa.notes, pa.expires_at,
                   bc.block_id, bc.x, bc.y, bc.width, bc.height, bc.type,
                   bp.price
            FROM pixel_ads pa
            JOIN block_configs bc ON pa.block_config_id = bc.id
            LEFT JOIN base_prices bp ON bc.price_id = bp.id
            WHERE pa.status = 'active' AND pa.expires_at > ?
            ORDER BY pa.created_at ASC
          `,
          )
          .all(now);

        return { ads };
      } catch (error: any) {
        app.log.error({ err: error }, '获取公开广告失败');
        return reply.code(500).send({
          error: '服务器错误',
          details: error.message || error,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
      }
    }),
  );

  // 创建广告
  app.post(
    '/pixel-ads',
    withErrorLogging(app.log as any, 'pixel-ads.create', async (req, reply) => {
      try {
        const payload = await req.jwtVerify();
        const data = pixelAdSchema.parse(req.body);
        const now = Date.now();
        const adId = uuidv4();

        // 检查块配置是否存在
        const blockConfig = app.db
          .prepare('SELECT * FROM block_configs WHERE id = ?')
          .get(data.block_config_id);

        if (!blockConfig) {
          return reply.code(400).send({ error: '指定的广告块不存在' });
        }

        // 检查块是否被占用
        if (checkBlockOccupied(app.db, data.block_config_id)) {
          return reply.code(400).send({ error: '该广告块已被占用，请选择其他块' });
        }

        // 创建广告
        app.db
          .prepare(
            `INSERT INTO pixel_ads (
              id, title, description, link_url, image_path, 
              status, contact_info, notes, user_id, block_config_id,
              created_at, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          )
          .run(
            adId,
            data.title,
            data.description,
            data.link_url,
            data.image_path,
            'active',
            data.contact_info || '',
            data.notes || '',
            payload.uid, // 从 JWT 获取用户 ID
            data.block_config_id,
            now,
            data.expires_at,
          );

        // 获取创建的广告及其块配置信息
        const createdAd = app.db
          .prepare(
            `
            SELECT pa.*, bc.block_id, bc.x, bc.y, bc.width, bc.height, bc.type, bp.price
            FROM pixel_ads pa
            JOIN block_configs bc ON pa.block_config_id = bc.id
            LEFT JOIN base_prices bp ON bc.price_id = bp.id
            WHERE pa.id = ?
          `,
          )
          .get(adId);

        // 记录操作日志
        await logOperation(app, req, {
          ...OPERATION_MAPPING.ADS,
          resourceId: adId,
          resourceName: data.title,
          operation: OperationType.CREATE,
          message: `创建像素广告: ${data.title}`,
          status: 'success',
          userId: payload.uid
        });

        return {
          success: true,
          message: '广告创建成功',
          ad: createdAd,
        };
      } catch (err: any) {
        app.log.error({ err }, '创建广告失败');
        if (err.name === 'ZodError') {
          return reply.code(400).send(buildPrefixedError('创建广告失败', err, 400));
        }
        return reply.code(401).send(buildPrefixedError('创建广告失败', err, 401));
      }
    }),
  );

  // 更新广告
  app.put(
    '/pixel-ads/:id',
    withErrorLogging(app.log as any, 'pixel-ads.update', async (req, reply) => {
      try {
        await req.jwtVerify();
        const params = z.object({ id: z.string() }).parse(req.params);
        const data = updatePixelAdSchema.parse(req.body);

        // 检查广告是否存在
        const existingAd = app.db.prepare('SELECT * FROM pixel_ads WHERE id = ?').get(params.id);

        if (!existingAd) {
          return reply.code(404).send({ error: '广告不存在' });
        }

        // 如果修改了块配置，检查新块是否可用
        if (data.block_config_id !== undefined) {
          // 检查块配置是否存在
          const blockConfig = app.db
            .prepare('SELECT * FROM block_configs WHERE id = ?')
            .get(data.block_config_id);

          if (!blockConfig) {
            return reply.code(400).send({ error: '指定的广告块不存在' });
          }

          // 检查块是否被其他广告占用
          if (checkBlockOccupied(app.db, data.block_config_id, params.id)) {
            return reply.code(400).send({ error: '该广告块已被占用，请选择其他块' });
          }
        }

        // 构建更新语句
        const updateFields: string[] = [];
        const updateValues: any[] = [];

        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined) {
            updateFields.push(`${key} = ?`);
            updateValues.push(value);
          }
        });

        if (updateFields.length === 0) {
          return reply.code(400).send({ error: '没有提供更新字段' });
        }

        updateFields.push('updated_at = ?');
        updateValues.push(Date.now(), params.id);

        app.db
          .prepare(`UPDATE pixel_ads SET ${updateFields.join(', ')} WHERE id = ?`)
          .run(...updateValues);

        // 获取更新后的广告及其块配置信息
        const updatedAd = app.db
          .prepare(
            `
            SELECT pa.*, bc.block_id, bc.x, bc.y, bc.width, bc.height, bc.type, bp.price,
                   pa.block_config_id
            FROM pixel_ads pa
            JOIN block_configs bc ON pa.block_config_id = bc.id
            LEFT JOIN base_prices bp ON bc.price_id = bp.id
            WHERE pa.id = ?
          `,
          )
          .get(params.id);

        // 记录操作日志
        const payload = req.user as any;
        await logOperation(app, req, {
          ...OPERATION_MAPPING.ADS,
          resourceId: params.id,
          resourceName: existingAd.title,
          operation: OperationType.UPDATE,
          message: `更新像素广告: ${existingAd.title}`,
          status: 'success',
          userId: payload.uid
        });

        return {
          success: true,
          message: '广告更新成功',
          ad: updatedAd,
        };
      } catch (err: any) {
        app.log.error({ err }, '更新广告失败');
        if (err.name === 'ZodError') {
          return reply.code(400).send(buildPrefixedError('更新广告失败', err, 400));
        }
        return reply.code(401).send(buildPrefixedError('更新广告失败', err, 401));
      }
    }),
  );

  // 删除广告
  app.delete(
    '/pixel-ads/:id',
    withErrorLogging(app.log as any, 'pixel-ads.delete', async (req, reply) => {
      try {
        await req.jwtVerify();
        const params = z.object({ id: z.string() }).parse(req.params);

        // 检查广告是否存在
        const existingAd = app.db.prepare('SELECT * FROM pixel_ads WHERE id = ?').get(params.id);

        if (!existingAd) {
          return reply.code(404).send({ error: '广告不存在' });
        }

        // 权限检查已移除 - 允许任何已认证用户删除广告

        const result = app.db.prepare('DELETE FROM pixel_ads WHERE id = ?').run(params.id);

        if (result.changes === 0) {
          return reply.code(404).send({ error: '广告不存在' });
        }

        // 记录操作日志
        const payload = req.user as any;
        await logOperation(app, req, {
          ...OPERATION_MAPPING.ADS,
          resourceId: params.id,
          resourceName: existingAd.title,
          operation: OperationType.DELETE,
          message: `删除像素广告: ${existingAd.title}`,
          status: 'success',
          userId: payload.uid
        });

        return {
          success: true,
          message: '广告删除成功',
        };
      } catch (err: any) {
        app.log.error({ err }, '删除广告失败');
        if (err.name === 'ZodError') {
          return reply.code(400).send(buildPrefixedError('删除广告失败', err, 400));
        }
        return reply.code(401).send(buildPrefixedError('删除广告失败', err, 401));
      }
    }),
  );

  // 检查广告块是否可用
  app.post(
    '/pixel-ads/check-block',
    withErrorLogging(app.log as any, 'pixel-ads.check-block', async (req, reply) => {
      try {
        await req.jwtVerify();
        const body = z
          .object({
            block_config_id: z.string(),
            exclude_id: z.string().optional(),
          })
          .parse(req.body);

        // 检查块配置是否存在
        const blockConfig = app.db
          .prepare('SELECT * FROM block_configs WHERE id = ?')
          .get(body.block_config_id);

        if (!blockConfig) {
          return {
            available: false,
            message: '广告块不存在',
          };
        }

        const isOccupied = checkBlockOccupied(app.db, body.block_config_id, body.exclude_id);

        return {
          available: !isOccupied,
          message: isOccupied ? '该广告块已被占用' : '该广告块可用',
        };
      } catch (err: any) {
        app.log.error({ err }, '检查广告块失败');
        if (err.name === 'ZodError') {
          return reply.code(400).send(buildPrefixedError('检查广告块失败', err, 400));
        }
        return reply.code(401).send(buildPrefixedError('检查广告块失败', err, 401));
      }
    }),
  );
}
