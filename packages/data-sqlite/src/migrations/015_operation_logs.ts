export const version = 15;
export const name = '015_operation_logs';

export function up(db: any): void {
  // 创建操作记录表
  db.exec(`
    CREATE TABLE operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menu TEXT NOT NULL,
      type TEXT NOT NULL,
      resource_id TEXT,
      resource_name TEXT, 
      operation TEXT NOT NULL,
      time INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      message TEXT,
      source_ip TEXT,
      user_id TEXT,
      user_name TEXT,
      request_method TEXT,
      request_url TEXT,
      user_agent TEXT,
      status TEXT DEFAULT 'success',
      error_message TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);

  // 创建索引提高查询性能
  db.exec(`
    CREATE INDEX idx_operation_logs_menu ON operation_logs(menu);
    CREATE INDEX idx_operation_logs_type ON operation_logs(type);
    CREATE INDEX idx_operation_logs_operation ON operation_logs(operation);
    CREATE INDEX idx_operation_logs_time ON operation_logs(time);
    CREATE INDEX idx_operation_logs_user_id ON operation_logs(user_id);
    CREATE INDEX idx_operation_logs_source_ip ON operation_logs(source_ip);
  `);
}

export function down(db: any): void {
  db.exec('DROP TABLE IF EXISTS operation_logs');
}
