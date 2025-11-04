export const version = 8;
export const name = '008_alter_users';

export function up(db: any): void {
  // 给用户表添加字段
  db.exec(`
    ALTER TABLE users ADD COLUMN selected_model_id TEXT;
  `);

  // 给面试表添加冗余字段，避免面试时查询用户表
  db.exec(`
    ALTER TABLE interviews ADD COLUMN selected_model_id TEXT;
  `);
  db.exec(`
    ALTER TABLE interviews ADD COLUMN locale TEXT DEFAULT 'zh-CN';
  `);
  db.exec(`
    ALTER TABLE interviews ADD COLUMN timezone TEXT DEFAULT 'Asia/Shanghai';
  `);

  try {
    db.exec(`ALTER TABLE models ADD COLUMN credentials TEXT;`);
  } catch {}

  // 增加连通状态字段（ok/fail/NULL）
  try {
    db.exec(`ALTER TABLE models ADD COLUMN status TEXT;`);
  } catch {}

  try {
    const rows = db.prepare(`SELECT id, base_url, api_url, api_key FROM models`).all();
    const update = db.prepare(`UPDATE models SET credentials=? WHERE id=?`);
    for (const r of rows) {
      const c: any = {};
      if (r.base_url) c.base_url = r.base_url;
      if (r.api_url) c.api_url = r.api_url;
      if (r.api_key) c.api_key = r.api_key;
      const json = Object.keys(c).length ? JSON.stringify(c) : null;
      update.run(json, r.id);
    }
  } catch {}

  try {
    db.exec(`ALTER TABLE models DROP COLUMN base_url;`);
    db.exec(`ALTER TABLE models DROP COLUMN api_url;`);
    db.exec(`ALTER TABLE models DROP COLUMN api_key;`);
  } catch {
    try {
      db.exec('BEGIN');
      db.exec(`
        CREATE TABLE IF NOT EXISTS __models_new (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          provider TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'llm',
          scope TEXT NOT NULL DEFAULT 'public',
          model_name TEXT NOT NULL,
          icon TEXT,
          version TEXT,
          credentials TEXT,
          status TEXT,
          created_by TEXT,
          is_enabled INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER NOT NULL,
          updated_at INTEGER
        );
      `);
      db.exec(`
        INSERT INTO __models_new (id, name, provider, type, scope, model_name, icon, version, credentials, status, created_by, is_enabled, created_at, updated_at)
        SELECT id, name, provider, type, scope, model_name, icon, version, credentials, status, created_by, is_enabled, created_at, updated_at FROM models;
      `);
      db.exec(`DROP TABLE models;`);
      db.exec(`ALTER TABLE __models_new RENAME TO models;`);
      // 重新创建索引
      db.exec(`CREATE INDEX IF NOT EXISTS idx_models_provider ON models(provider);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_models_scope ON models(scope);`);
      db.exec('COMMIT');
    } catch (e) {
      try {
        db.exec('ROLLBACK');
      } catch {}
      throw e;
    }
  }

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

      db.prepare(
        `INSERT INTO resumes (id, user_id, job_id, title, content, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        'resume_demo_001',
        'admin',
        'job_demo_001',
        'Java 技术经理-简历',
        '简历内容：示例 – 拥有 10 年开发及架构经验，熟悉 Spring 生态、Redis、Kafka、MySQL 等，具备分布式架构与微服务落地经验。',
        now,
      );

      db.prepare(
        `INSERT INTO interview_questions (id, job_id, question, answer, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(
        'question_demo_001',
        'job_demo_001',
        '你在项目里如何进行数据库性能优化？',
        '常用手段包括：索引优化、慢 SQL 分析、读写分离、连接池参数调优、热点数据缓存等。',
        now,
      );
    }
  } catch {}

  // 为向量库同步状态增加标记字段（默认 false）
  try {
    db.exec(`ALTER TABLE jobs ADD COLUMN vector_status INTEGER NOT NULL DEFAULT 0`);
  } catch {}
  try {
    db.exec(`ALTER TABLE resumes ADD COLUMN vector_status INTEGER NOT NULL DEFAULT 0`);
  } catch {}
  try {
    db.exec(`ALTER TABLE interview_questions ADD COLUMN vector_status INTEGER NOT NULL DEFAULT 0`);
  } catch {}
  try {
    db.exec(`ALTER TABLE interviews ADD COLUMN vector_status INTEGER NOT NULL DEFAULT 0`);
  } catch {}
}
