export const version = 6;
export const name = '006_create_interview_advantages';

/**
 * 扩展面试复盘/评分结构：
 * - interview_scores：整场面试的整体优缺点/建议与 5 维度雷达评分（雷达图全部在此表）
 * - interview_reviews：保存“本次面试”的具体问题与候选人“本次作答”，保留备份提问/作答，同时保留考察点/评价/参考答案
 * - interview_advantages：新增“面试优缺点项”表，记录一场面试的多条优点/缺点条目
 * - interview_insights：面试官/候选人剖析与沟通策略
 */
export function up(db: any): void {
  db.exec(`
    -- interview_reviews 修正字段：保留备份，同时增加本次实际问答
    ALTER TABLE interview_reviews ADD COLUMN question_id TEXT REFERENCES interview_questions(id);
    ALTER TABLE interview_reviews ADD COLUMN question TEXT;           -- 备份提问
    ALTER TABLE interview_reviews ADD COLUMN answer TEXT;             -- 备份作答
    ALTER TABLE interview_reviews ADD COLUMN asked_question TEXT;     -- 本次面试提问（落库快照）
    ALTER TABLE interview_reviews ADD COLUMN candidate_answer TEXT;   -- 本次面试作答（落库快照）
    ALTER TABLE interview_reviews ADD COLUMN pros TEXT;               -- 优点
    ALTER TABLE interview_reviews ADD COLUMN cons TEXT;               -- 缺点
    ALTER TABLE interview_reviews ADD COLUMN suggestions TEXT;        -- 建议
    ALTER TABLE interview_reviews ADD COLUMN key_points TEXT;         -- 考察点
    ALTER TABLE interview_reviews ADD COLUMN assessment TEXT;         -- 回答评价
    ALTER TABLE interview_reviews ADD COLUMN reference_answer TEXT;   -- 参考回答
    ALTER TABLE interview_reviews ADD COLUMN other_id TEXT;           -- 其他文件 ID
    ALTER TABLE interview_reviews ADD COLUMN other_content TEXT;      -- 其他文件内容

    -- interview_scores 追加整体评价与雷达维度（0~100）
    ALTER TABLE interview_scores ADD COLUMN pros TEXT;
    ALTER TABLE interview_scores ADD COLUMN cons TEXT;
    ALTER TABLE interview_scores ADD COLUMN suggestions TEXT;
    ALTER TABLE interview_scores ADD COLUMN radar_interactivity INTEGER DEFAULT 0;
    ALTER TABLE interview_scores ADD COLUMN radar_confidence INTEGER DEFAULT 0;
    ALTER TABLE interview_scores ADD COLUMN radar_professionalism INTEGER DEFAULT 0;
    ALTER TABLE interview_scores ADD COLUMN radar_relevance INTEGER DEFAULT 0;
    ALTER TABLE interview_scores ADD COLUMN radar_clarity INTEGER DEFAULT 0;

    -- 面试优缺点项（0 优点 / 1 缺点）
    CREATE TABLE IF NOT EXISTS interview_advantages (
      id TEXT PRIMARY KEY,
      interview_id TEXT NOT NULL,
      type INTEGER NOT NULL CHECK(type IN (0,1)),
      content TEXT,
      description TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(interview_id) REFERENCES interviews(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_interview_advantages_interview ON interview_advantages(interview_id);

    -- 面试官剖析 / 候选人总结 / 沟通策略
    CREATE TABLE IF NOT EXISTS interview_insights (
      id TEXT PRIMARY KEY,
      interview_id TEXT UNIQUE NOT NULL,
      interviewer_score INTEGER,                  -- 面试官给出的分数/评级
      interviewer_summary TEXT,                   -- 面试官总结
      interviewer_role TEXT,                      -- 面试官角色分析
      interviewer_mbti TEXT,                      -- 面试官 MBTI
      interviewer_personality TEXT,               -- 面试官个人特质
      interviewer_preference TEXT,                -- 面试官对候选人的偏好
      candidate_summary TEXT,                     -- 候选人总结
      candidate_mbti TEXT,                        -- 候选人 MBTI
      candidate_personality TEXT,                 -- 候选人个人特质
      candidate_job_preference TEXT,              -- 候选人求职偏好
      strategy_prepare_details TEXT,              -- 沟通策略：提前准备技术细节
      strategy_business_understanding TEXT,       -- 沟通策略：展示对业务的理解
      strategy_keep_logical TEXT,                 -- 沟通策略：保持逻辑清晰
      created_at INTEGER NOT NULL,
      FOREIGN KEY(interview_id) REFERENCES interviews(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_review_question ON interview_reviews(question_id);
    CREATE INDEX IF NOT EXISTS idx_insights_interview ON interview_insights(interview_id);
  `);
}
