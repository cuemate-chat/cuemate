export const version = 20;
export const name = '020_create_user_notifications';

export function up(db: any): void {
  db.exec(`
    -- 添加 users 表的 version 字段
    ALTER TABLE users ADD COLUMN version TEXT DEFAULT 'v0.1.0';

    -- 更新现有用户的版本号
    UPDATE users SET version = 'v0.1.0' WHERE version IS NULL;

    -- 创建用户通知表
    CREATE TABLE IF NOT EXISTS user_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      summary TEXT,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
      is_read INTEGER NOT NULL DEFAULT 0 CHECK(is_read IN (0, 1)),
      is_starred INTEGER NOT NULL DEFAULT 0 CHECK(is_starred IN (0, 1)),
      resource_type TEXT,
      resource_id TEXT,
      action_url TEXT,
      action_text TEXT,
      metadata TEXT,
      expire_at INTEGER,
      created_at INTEGER NOT NULL,
      read_at INTEGER,
      starred_at INTEGER
    );

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read ON user_notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_user_notifications_user_type ON user_notifications(user_id, type);
    CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at);
  `);
}

export function down(db: any): void {
  db.exec(`
    DROP INDEX IF EXISTS idx_user_notifications_created_at;
    DROP INDEX IF EXISTS idx_user_notifications_user_type;
    DROP INDEX IF EXISTS idx_user_notifications_user_read;
    DROP INDEX IF EXISTS idx_user_notifications_user_id;
    DROP TABLE IF EXISTS user_notifications;
  `);
}
