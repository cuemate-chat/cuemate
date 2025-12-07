import { CONTAINER_IMAGES_DIR } from '@cuemate/config';
import type { FastifyInstance } from 'fastify';
import fs from 'fs';
import https from 'https';
import path from 'path';

// COS 广告数据 URL
const ADS_JSON_URL = 'https://cos.cuemate.chat/ads/ads.json';
const ADS_IMAGE_BASE_URL = 'https://cos.cuemate.chat/ads';

// 广告数据接口
interface PixelAd {
  id: string;
  title: string;
  description: string;
  link_url: string;
  image_path: string;
  status: string;
  contact_info: string;
  user_id: string;
  block_config_id: string;
  created_at: number;
  updated_at: number | null;
  expires_at: number;
  block_id: string | null;
  notes: string;
}

/**
 * 从 URL 下载文件
 */
function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // 确保目标目录存在
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const file = fs.createWriteStream(destPath);

    https.get(url, (response) => {
      // 处理重定向
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          fs.unlinkSync(destPath);
          downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`下载失败: HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
      reject(err);
    });
  });
}

/**
 * 从 URL 获取 JSON 数据
 */
function fetchJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      // 处理重定向
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          fetchJson<T>(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`请求失败: HTTP ${response.statusCode}`));
        return;
      }

      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (err) {
          reject(new Error(`JSON 解析失败: ${err}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * 同步广告数据
 * @param app Fastify 实例
 */
export async function syncAdsFromCos(app: FastifyInstance): Promise<void> {
  const db = (app as any).db;
  app.log.info('开始同步 COS 广告数据...');

  try {
    // 1. 获取广告 JSON 数据
    const ads = await fetchJson<PixelAd[]>(ADS_JSON_URL);

    if (!Array.isArray(ads) || ads.length === 0) {
      app.log.info('COS 广告数据为空，跳过同步');
      return;
    }

    app.log.info(`获取到 ${ads.length} 条广告数据`);

    // 2. 遍历广告数据，检查并插入
    let inserted = 0;
    let skipped = 0;

    for (const ad of ads) {
      try {
        // 检查广告是否已存在
        const existing = db.prepare('SELECT id FROM pixel_ads WHERE id = ?').get(ad.id);

        if (existing) {
          skipped++;
          continue;
        }

        // 插入新广告
        db.prepare(`
          INSERT INTO pixel_ads (
            id, title, description, link_url, image_path,
            status, contact_info, user_id, block_config_id,
            created_at, updated_at, expires_at, block_id, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          ad.id,
          ad.title,
          ad.description,
          ad.link_url,
          ad.image_path,
          ad.status,
          ad.contact_info || '',
          ad.user_id,
          ad.block_config_id,
          ad.created_at,
          ad.updated_at,
          ad.expires_at,
          ad.block_id,
          ad.notes || ''
        );

        // 下载图片
        if (ad.image_path) {
          const imageName = path.basename(ad.image_path);
          const imageUrl = `${ADS_IMAGE_BASE_URL}/${imageName}`;
          const localPath = path.join(CONTAINER_IMAGES_DIR, imageName);

          // 检查图片是否已存在
          if (!fs.existsSync(localPath)) {
            try {
              await downloadFile(imageUrl, localPath);
              app.log.info(`下载广告图片成功: ${imageName}`);
            } catch (imgErr: any) {
              app.log.warn(`下载广告图片失败: ${imageName} - ${imgErr.message}`);
            }
          }
        }

        inserted++;
        app.log.info(`插入广告: ${ad.title}`);
      } catch (err: any) {
        app.log.error(`处理广告失败: ${ad.id} - ${err.message}`);
      }
    }

    // 3. 删除 JSON 中不存在但数据库中存在的广告（以 JSON 为准）
    const jsonIds = new Set(ads.map((ad) => ad.id));
    const dbAds = db.prepare('SELECT id FROM pixel_ads').all() as { id: string }[];
    const toDelete = dbAds.filter((dbAd) => !jsonIds.has(dbAd.id));

    let deleted = 0;
    for (const ad of toDelete) {
      try {
        db.prepare('DELETE FROM pixel_ads WHERE id = ?').run(ad.id);
        deleted++;
        app.log.info(`删除广告: ${ad.id}`);
      } catch (err: any) {
        app.log.error(`删除广告失败: ${ad.id} - ${err.message}`);
      }
    }

    app.log.info(`广告同步完成: 新增 ${inserted} 条，跳过 ${skipped} 条，删除 ${deleted} 条`);
  } catch (err: any) {
    app.log.error(`同步 COS 广告数据失败: ${err.message}`);
  }
}
