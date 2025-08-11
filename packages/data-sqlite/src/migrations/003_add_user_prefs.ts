export const version = 3;
export const name = '003_add_user_prefs';

export function up(db: any): void {
  // SQLite: 添加列如果不存在
  db.exec(`
    ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'system';
  `);
  db.exec(`
    ALTER TABLE users ADD COLUMN locale TEXT DEFAULT 'zh-CN';
  `);
}
