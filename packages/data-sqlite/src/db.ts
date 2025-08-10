// 使用 any 避免在本地编译阶段引入 better-sqlite3 的类型依赖
import { migrations } from './migrations/index.js';

export function applySchema(db: any): void {
  // 版本表
  db.exec(`
    CREATE TABLE IF NOT EXISTS __migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);

  const applied: number[] = db
    .prepare('SELECT version FROM __migrations ORDER BY version ASC')
    .all()
    .map((r: any) => r.version);

  for (const m of migrations) {
    if (!applied.includes(m.version)) {
      db.exec('BEGIN');
      try {
        m.up(db);
        db.prepare('INSERT INTO __migrations (version, name, applied_at) VALUES (?, ?, ?)').run(
          m.version,
          m.name,
          Date.now(),
        );
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    }
  }
}
