export const version = 18;
export const name = '018_alter_interviews';

export function up(db: any): void {
  db.exec(`
    -- 在interviews表中新增冗余字段
    ALTER TABLE interviews ADD COLUMN job_title TEXT;
    ALTER TABLE interviews ADD COLUMN job_content TEXT;
    ALTER TABLE interviews ADD COLUMN question_count INTEGER DEFAULT 0;
    ALTER TABLE interviews ADD COLUMN resumes_id TEXT;
    ALTER TABLE interviews ADD COLUMN resumes_title TEXT;
    ALTER TABLE interviews ADD COLUMN resumes_content TEXT;
    ALTER TABLE interviews ADD COLUMN duration INTEGER DEFAULT 0;
    ALTER TABLE interviews ADD COLUMN interview_type TEXT DEFAULT 'mock' CHECK(interview_type IN ('mock','training'));
    ALTER TABLE interviews ADD COLUMN status TEXT DEFAULT 'active' CHECK(status IN ('pending','active','completed','archived','deleted'));
    ALTER TABLE interviews ADD COLUMN message TEXT;

    -- 修改interview_reviews表的score_id字段为interview_id
    ALTER TABLE interview_reviews RENAME COLUMN score_id TO interview_id;
  `);
}

export function down(db: any): void {
  db.exec(`
    -- 恢复interview_reviews表的字段名
    ALTER TABLE interview_reviews RENAME COLUMN interview_id TO score_id;

    -- 移除新增的字段
    ALTER TABLE interviews DROP COLUMN job_title;
    ALTER TABLE interviews DROP COLUMN job_content;
    ALTER TABLE interviews DROP COLUMN question_count;
    ALTER TABLE interviews DROP COLUMN resumes_id;
    ALTER TABLE interviews DROP COLUMN resumes_title;
    ALTER TABLE interviews DROP COLUMN resumes_content;
    ALTER TABLE interviews DROP COLUMN duration;
    ALTER TABLE interviews DROP COLUMN interview_type;
    ALTER TABLE interviews DROP COLUMN status;
    ALTER TABLE interviews DROP COLUMN message;
  `);
}
