export const version = 21;
export const name = '021_create_resume_optimizations';

export function up(db: any): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS resume_optimizations (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
      original_resume TEXT NOT NULL,
      original_word_count INTEGER NOT NULL DEFAULT 0,
      optimized_resume TEXT,
      optimized_word_count INTEGER NOT NULL DEFAULT 0,
      model_id TEXT,
      model_name TEXT,
      suggestion TEXT,
      optimization_count INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      user_id TEXT,
      job_id TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_resume_optimizations_user_id ON resume_optimizations(user_id);
    CREATE INDEX IF NOT EXISTS idx_resume_optimizations_job_id ON resume_optimizations(job_id);
    CREATE INDEX IF NOT EXISTS idx_resume_optimizations_created_at ON resume_optimizations(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_resume_optimizations_status ON resume_optimizations(status);
  `);
}

export function down(db: any): void {
  db.exec(`
    DROP INDEX IF EXISTS idx_resume_optimizations_status;
    DROP INDEX IF EXISTS idx_resume_optimizations_created_at;
    DROP INDEX IF EXISTS idx_resume_optimizations_job_id;
    DROP INDEX IF EXISTS idx_resume_optimizations_user_id;
    DROP TABLE IF EXISTS resume_optimizations;
  `);
}
