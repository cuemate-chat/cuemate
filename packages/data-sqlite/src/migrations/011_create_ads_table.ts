export const version = 11;
export const name = '011_create_ads_table';

export function up(db: any): void {
  // 创建像素广告表
  db.exec(`
    CREATE TABLE pixel_ads (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      link_url TEXT NOT NULL,
      image_path TEXT NOT NULL,
      x_position INTEGER NOT NULL,
      y_position INTEGER NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      z_index INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active',
      contact_info TEXT,
      price REAL DEFAULT 0,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER,
      expires_at INTEGER NOT NULL
    )
  `);

  // 创建索引以优化查询
  db.exec(`CREATE INDEX idx_pixel_ads_position ON pixel_ads(x_position, y_position);`);
  db.exec(`CREATE INDEX idx_pixel_ads_status ON pixel_ads(status);`);
  db.exec(`CREATE INDEX idx_pixel_ads_expires_at ON pixel_ads(expires_at);`);
  db.exec(`CREATE INDEX idx_pixel_ads_user_id ON pixel_ads(user_id);`);

  // 创建空间范围索引（用于快速检测重叠）
  db.exec(`CREATE INDEX idx_pixel_ads_bounds ON pixel_ads(x_position, y_position, width, height);`);

  // 插入一些示例广告数据
  try {
    const now = Date.now();
    const exampleAds = [
      {
        id: 'example_001',
        title: 'CueMate 面试助手',
        description: 'AI驱动的智能面试练习平台，提升您的面试技能',
        link_url: 'https://cuemate.ai',
        image_path: '/images/ads/cuemate-logo.png',
        x_position: 0,
        y_position: 0,
        width: 200,
        height: 200,
        z_index: 1,
        status: 'active',
        contact_info: 'contact@cuemate.ai',
        price: 999.99,
        user_id: 'system',
        expires_at: now + 365 * 24 * 60 * 60 * 1000, // 一年后过期
      },
      {
        id: 'example_002',
        title: '技术博客推广',
        description: '分享最新的技术趋势和编程技巧',
        link_url: 'https://tech-blog.example.com',
        image_path: '/images/ads/tech-blog.png',
        x_position: 200,
        y_position: 0,
        width: 150,
        height: 150,
        z_index: 1,
        status: 'active',
        contact_info: 'blog@example.com',
        price: 299.99,
        user_id: 'system',
        expires_at: now + 30 * 24 * 60 * 60 * 1000, // 30天后过期
      },
    ];

    const stmt = db.prepare(`
      INSERT INTO pixel_ads (
        id, title, description, link_url, image_path, 
        x_position, y_position, width, height, z_index, 
        status, contact_info, price, user_id, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const ad of exampleAds) {
      stmt.run(
        ad.id,
        ad.title,
        ad.description,
        ad.link_url,
        ad.image_path,
        ad.x_position,
        ad.y_position,
        ad.width,
        ad.height,
        ad.z_index,
        ad.status,
        ad.contact_info,
        ad.price,
        ad.user_id,
        now,
        ad.expires_at,
      );
    }
  } catch (e) {
    // 如果插入失败（可能是重复执行），忽略错误
  }
}
