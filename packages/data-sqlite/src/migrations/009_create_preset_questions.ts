export const version = 9;
export const name = '009_create_preset_questions';

export function up(db: any): void {
  // 创建预置题库表
  db.exec(`
    CREATE TABLE preset_questions (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      tag_id TEXT,
      is_builtin INTEGER NOT NULL DEFAULT 0,
      synced_jobs TEXT DEFAULT '[]',  -- JSON 格式存储已同步的岗位 ID 列表
      created_at INTEGER NOT NULL,
      updated_at INTEGER
    )
  `);

  // 创建索引
  db.exec(`CREATE INDEX idx_preset_questions_tag_id ON preset_questions(tag_id);`);
  db.exec(`CREATE INDEX idx_preset_questions_is_builtin ON preset_questions(is_builtin);`);
}
