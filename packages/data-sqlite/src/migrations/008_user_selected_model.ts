export const version = 8;
export const name = '008_user_selected_model';

export function up(db: any): void {
  db.exec(`
    ALTER TABLE users ADD COLUMN selected_model_id TEXT;
  `);
  db.exec(`
    ALTER TABLE interviews ADD COLUMN selected_model_id TEXT;
  `);

  // 内置一条岗位示例（若不存在），方便首次进入系统有数据可用
  try {
    const exists = db.prepare("SELECT 1 FROM jobs WHERE id = 'job_demo_001'").get();
    if (!exists) {
      const now = Date.now();
      db.prepare(
        `INSERT INTO jobs (id, user_id, title, description, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        'job_demo_001',
        'admin',
        '大数据架构师',
        '示例岗位：用于演示模型设置与押题功能的岗位数据',
        'active',
        now,
      );
    }
  } catch {}
}
