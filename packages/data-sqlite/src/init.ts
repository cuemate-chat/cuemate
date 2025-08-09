// 在本地开发时不直接 import 原生模块，避免安装失败导致类型报错
export function initSqlite(path: string) {
  // 动态加载 better-sqlite3（容器/生产环境）
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Database = require('better-sqlite3');
  const { applySchema } = require('./db.js');
  const db = new Database(path);
  applySchema(db);
  return db;
}

export type Db = ReturnType<typeof initSqlite>;
