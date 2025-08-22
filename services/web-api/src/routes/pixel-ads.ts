import { withErrorLogging } from '@cuemate/logger';
import type { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// 广告数据验证模式
const pixelAdSchema = z.object({
  title: z.string().min(1, '广告标题不能为空').max(100, '广告标题不能超过100字符'),
  description: z.string().min(1, '广告描述不能为空').max(500, '广告描述不能超过500字符'),
  link_url: z.string().url('请输入有效的URL').max(1000, 'URL不能超过1000字符'),
  image_path: z.string().min(1, '图片路径不能为空').max(500, '图片路径不能超过500字符'), // 图片路径必填
  block_id: z.string().min(1, '块ID不能为空').max(20, '块ID不能超过20字符').optional(), // 新增block_id字段
  x_position: z.number().int().min(0, 'X坐标不能小于0').max(9999, 'X坐标不能大于9999'),
  y_position: z.number().int().min(0, 'Y坐标不能小于0').max(9999, 'Y坐标不能大于9999'),
  width: z.number().int().min(1, '宽度至少为1像素').max(1000, '宽度不能超过1000像素'),
  height: z.number().int().min(1, '高度至少为1像素').max(1000, '高度不能超过1000像素'),
  z_index: z.number().int().min(1, '层级至少为1').max(999, '层级不能超过999').optional(),
  contact_info: z.string().max(200, '联系信息不能超过200字符').optional(),
  price: z.number().min(0, '价格不能为负数').optional(),
  notes: z.string().max(500, '备注不能超过500字符').optional(), // 新增notes字段
  expires_at: z.number().int().min(Date.now(), '过期时间不能早于当前时间'),
});

const updatePixelAdSchema = pixelAdSchema.partial();

// 检查像素位置是否冲突
function checkPositionConflict(
  db: any,
  x: number,
  y: number,
  width: number,
  height: number,
  excludeId?: string,
): boolean {
  const query = excludeId
    ? `SELECT COUNT(*) as count FROM pixel_ads 
       WHERE status = 'active' AND id != ? AND
       NOT (x_position + width <= ? OR ? >= x_position + width OR
            y_position + height <= ? OR ? >= y_position + height)`
    : `SELECT COUNT(*) as count FROM pixel_ads 
       WHERE status = 'active' AND
       NOT (x_position + width <= ? OR ? >= x_position + width OR
            y_position + height <= ? OR ? >= y_position + height)`;

  const params = excludeId
    ? [excludeId, x, x + width, y, y + height]
    : [x, x + width, y, y + height];

  const result = db.prepare(query).get(...params);
  return result.count > 0;
}

export function registerPixelAdsRoutes(app: FastifyInstance) {
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
        });

        const { page, limit, status, search } = query.parse(req.query);
        const offset = (page - 1) * limit;

        let whereClause = '1=1';
        let params: any[] = [];

        if (status) {
          whereClause += ' AND status = ?';
          params.push(status);
        }

        if (search) {
          whereClause += ' AND (title LIKE ? OR description LIKE ?)';
          params.push(`%${search}%`, `%${search}%`);
        }

        // 获取总数
        const countQuery = `SELECT COUNT(*) as total FROM pixel_ads WHERE ${whereClause}`;
        const { total } = app.db.prepare(countQuery).get(...params);

        // 获取数据
        const dataQuery = `
          SELECT * FROM pixel_ads 
          WHERE ${whereClause}
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `;
        const ads = app.db.prepare(dataQuery).all(limit, offset);

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
        return reply.code(401).send({ error: '未认证：' + err });
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

        const ad = app.db.prepare('SELECT * FROM pixel_ads WHERE id = ?').get(params.id);

        if (!ad) {
          return reply.code(404).send({ error: '广告不存在' });
        }

        return { ad };
      } catch (err: any) {
        app.log.error({ err }, '获取广告详情失败');
        return reply.code(401).send({ error: '未认证：' + err });
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
            SELECT id, title, description, link_url, image_path, block_id,
                   x_position, y_position, width, height, z_index, 
                   contact_info, notes, expires_at
            FROM pixel_ads 
            WHERE status = 'active' AND expires_at > ?
            ORDER BY z_index ASC, created_at ASC
          `,
          )
          .all(now);

        return { ads };
      } catch (error: any) {
        app.log.error('获取公开广告失败:', error);
        return reply.code(500).send({ error: '服务器错误' });
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

        // 检查位置冲突
        if (
          checkPositionConflict(app.db, data.x_position, data.y_position, data.width, data.height)
        ) {
          return reply.code(400).send({ error: '该像素区域已被占用，请选择其他位置' });
        }

        // 创建广告
        app.db
          .prepare(
            `INSERT INTO pixel_ads (
              id, title, description, link_url, image_path, block_id,
              x_position, y_position, width, height, z_index,
              status, contact_info, price, notes, user_id, created_at, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          )
          .run(
            adId,
            data.title,
            data.description,
            data.link_url,
            data.image_path, // 使用传入的image_path
            data.block_id || '', // 新增block_id字段
            data.x_position,
            data.y_position,
            data.width,
            data.height,
            data.z_index || 1,
            'active',
            data.contact_info || '',
            data.price || 0,
            data.notes || '', // 新增notes字段
            payload.uid, // 从JWT获取用户ID
            now,
            data.expires_at,
          );

        const createdAd = app.db.prepare('SELECT * FROM pixel_ads WHERE id = ?').get(adId);

        return {
          success: true,
          message: '广告创建成功',
          ad: createdAd,
        };
      } catch (err: any) {
        app.log.error({ err }, '创建广告失败');
        if (err.name === 'ZodError') {
          return reply.code(400).send({ error: err.errors[0].message });
        }
        return reply.code(401).send({ error: '未认证：' + err });
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

        // 权限检查已移除 - 允许任何已认证用户修改广告

        // 如果修改了位置或尺寸，检查冲突
        if (
          data.x_position !== undefined ||
          data.y_position !== undefined ||
          data.width !== undefined ||
          data.height !== undefined
        ) {
          const newX = data.x_position ?? existingAd.x_position;
          const newY = data.y_position ?? existingAd.y_position;
          const newWidth = data.width ?? existingAd.width;
          const newHeight = data.height ?? existingAd.height;

          if (checkPositionConflict(app.db, newX, newY, newWidth, newHeight, params.id)) {
            return reply.code(400).send({ error: '该像素区域已被占用，请选择其他位置' });
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

        const updatedAd = app.db.prepare('SELECT * FROM pixel_ads WHERE id = ?').get(params.id);

        return {
          success: true,
          message: '广告更新成功',
          ad: updatedAd,
        };
      } catch (err: any) {
        app.log.error({ err }, '更新广告失败');
        if (err.name === 'ZodError') {
          return reply.code(400).send({ error: err.errors[0].message });
        }
        return reply.code(401).send({ error: '未认证：' + err });
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

        return {
          success: true,
          message: '广告删除成功',
        };
      } catch (err: any) {
        app.log.error({ err }, '删除广告失败');
        if (err.name === 'ZodError') {
          return reply.code(400).send({ error: err.errors[0].message });
        }
        return reply.code(401).send({ error: '未认证：' + err });
      }
    }),
  );

  // 检查像素位置是否可用
  app.post(
    '/pixel-ads/check-position',
    withErrorLogging(app.log as any, 'pixel-ads.check-position', async (req, reply) => {
      try {
        await req.jwtVerify();
        const body = z
          .object({
            x_position: z.number().int().min(0).max(9999),
            y_position: z.number().int().min(0).max(9999),
            width: z.number().int().min(1).max(1000),
            height: z.number().int().min(1).max(1000),
            exclude_id: z.string().optional(),
          })
          .parse(req.body);

        const isConflict = checkPositionConflict(
          app.db,
          body.x_position,
          body.y_position,
          body.width,
          body.height,
          body.exclude_id,
        );

        return {
          available: !isConflict,
          message: isConflict ? '该像素区域已被占用' : '该像素区域可用',
        };
      } catch (err: any) {
        app.log.error({ err }, '检查位置失败');
        if (err.name === 'ZodError') {
          return reply.code(400).send({ error: err.errors[0].message });
        }
        return reply.code(401).send({ error: '未认证：' + err });
      }
    }),
  );
}
