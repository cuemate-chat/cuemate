export const version = 12;
export const name = '012_add_ads_fields';

export function up(db: any): void {
  // 添加block_id字段，用于存储块ID如"1x1-1", "2x1-1"等
  db.exec(`
    ALTER TABLE pixel_ads 
    ADD COLUMN block_id TEXT;
  `);

  // 添加notes字段，用于存储额外的备注信息
  db.exec(`
    ALTER TABLE pixel_ads 
    ADD COLUMN notes TEXT;
  `);

  // 创建block_id索引以优化查询
  db.exec(`CREATE INDEX idx_pixel_ads_block_id ON pixel_ads(block_id);`);

  // 为现有的示例数据更新block_id（如果存在）
  try {
    // 更新示例数据的block_id
    db.exec(`
      UPDATE pixel_ads 
      SET block_id = '1x1-1'
      WHERE id = 'example_001';
    `);

    db.exec(`
      UPDATE pixel_ads 
      SET block_id = '2x1-1'
      WHERE id = 'example_002';
    `);
  } catch (e) {
    // 如果更新失败（可能是数据不存在），忽略错误
    console.warn('Failed to update example pixel ads block_id:', e);
  }
}

export function down(db: any): void {
  // 删除添加的字段
  // 注意：SQLite不支持DROP COLUMN，需要重建表

  // 创建临时表
  db.exec(`
    CREATE TABLE pixel_ads_temp (
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

  // 复制数据到临时表
  db.exec(`
    INSERT INTO pixel_ads_temp 
    SELECT 
      id, title, description, link_url, image_path,
      x_position, y_position, width, height, z_index,
      status, contact_info, price, user_id, 
      created_at, updated_at, expires_at
    FROM pixel_ads
  `);

  // 删除原表
  db.exec(`DROP TABLE pixel_ads`);

  // 重命名临时表
  db.exec(`ALTER TABLE pixel_ads_temp RENAME TO pixel_ads`);

  // 重新创建索引
  db.exec(`CREATE INDEX idx_pixel_ads_position ON pixel_ads(x_position, y_position);`);
  db.exec(`CREATE INDEX idx_pixel_ads_status ON pixel_ads(status);`);
  db.exec(`CREATE INDEX idx_pixel_ads_expires_at ON pixel_ads(expires_at);`);
  db.exec(`CREATE INDEX idx_pixel_ads_user_id ON pixel_ads(user_id);`);
  db.exec(`CREATE INDEX idx_pixel_ads_bounds ON pixel_ads(x_position, y_position, width, height);`);
}
