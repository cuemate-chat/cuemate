export const version = 10;
export const name = '010_create_license_table';

export function up(db: any): void {
  // 创建 License 表
  db.exec(`
    CREATE TABLE licenses (
      id TEXT PRIMARY KEY,
      corporation TEXT NOT NULL,
      edition TEXT NOT NULL,
      expire_time INTEGER NOT NULL,
      product_type TEXT NOT NULL,
      authorize_count INTEGER NOT NULL DEFAULT 0,
      license_version TEXT DEFAULT 'v1',
      apply_user TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      license_key TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER
    )
  `);

  // 创建索引
  db.exec(`CREATE INDEX idx_licenses_status ON licenses(status);`);
  db.exec(`CREATE INDEX idx_licenses_expire_time ON licenses(expire_time);`);
  db.exec(`CREATE INDEX idx_licenses_product_type ON licenses(product_type);`);
}
