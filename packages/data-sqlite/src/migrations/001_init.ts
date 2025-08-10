export const version = 1;
export const name = '001_init';

export function up(db: any): void {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    -- 用户
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at INTEGER NOT NULL
    );

    -- 简历
    CREATE TABLE IF NOT EXISTS resumes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 岗位
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      company TEXT,
      description TEXT,
      status TEXT DEFAULT 'active',
      resume_id TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(resume_id) REFERENCES resumes(id) ON DELETE SET NULL
    );

    -- 岗位训练 Prompts
    CREATE TABLE IF NOT EXISTS job_prompts (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'training',
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );

    -- 用户通用模板/押题
    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 面试
    CREATE TABLE IF NOT EXISTS interviews (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      language TEXT NOT NULL CHECK(language IN ('zh','en','jp','ko','de','fr','auto')),
      theme TEXT NOT NULL CHECK(theme IN ('light','dark','system')),
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 面试问题
    CREATE TABLE IF NOT EXISTS interview_questions (
      id TEXT PRIMARY KEY,
      interview_id TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(interview_id) REFERENCES interviews(id) ON DELETE CASCADE
    );

    -- 面试评分（一次面试一个评分概览）
    CREATE TABLE IF NOT EXISTS interview_scores (
      id TEXT PRIMARY KEY,
      interview_id TEXT UNIQUE NOT NULL,
      total_score INTEGER NOT NULL,
      duration_sec INTEGER NOT NULL,
      num_questions INTEGER NOT NULL,
      overall_summary TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(interview_id) REFERENCES interviews(id) ON DELETE CASCADE
    );

    -- 面试复盘条目（评分表 1 对多）
    CREATE TABLE IF NOT EXISTS interview_reviews (
      id TEXT PRIMARY KEY,
      score_id TEXT NOT NULL,
      note_type TEXT NOT NULL DEFAULT 'summary',
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(score_id) REFERENCES interview_scores(id) ON DELETE CASCADE
    );

    -- 索引
    CREATE INDEX IF NOT EXISTS idx_jobs_user ON jobs(user_id);
    CREATE INDEX IF NOT EXISTS idx_prompts_user ON prompts(user_id);
    CREATE INDEX IF NOT EXISTS idx_job_prompts_job ON job_prompts(job_id);
    CREATE INDEX IF NOT EXISTS idx_interviews_job ON interviews(job_id);
    CREATE INDEX IF NOT EXISTS idx_questions_interview ON interview_questions(interview_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_score ON interview_reviews(score_id);
  `);
}
