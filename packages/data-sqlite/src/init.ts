// 使用 ESM 友好的动态导入以兼容 NodeNext（无 require）
export async function initSqlite(path: string) {
  const DatabaseModule = await import('better-sqlite3');
  const { applySchema } = await import('./db.js');
  const Database: any = (DatabaseModule as any).default ?? (DatabaseModule as any);
  const db = new Database(path);
  applySchema(db);
  return db;
}

export type Db = Awaited<ReturnType<typeof initSqlite>>;
