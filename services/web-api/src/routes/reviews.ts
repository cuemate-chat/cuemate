import type { FastifyInstance } from 'fastify';

export function registerReviewRoutes(app: FastifyInstance) {
  // 面试复盘列表（按开始时间倒序，无分页，前端统一滚动展示）
  app.get('/interviews', async (req, reply) => {
    try {
      const payload = await (req as any).jwtVerify();

      const totalRow = (app as any).db
        .prepare('SELECT COUNT(1) as cnt FROM interviews WHERE user_id=?')
        .get(payload.uid);
      const total = totalRow?.cnt ?? 0;

      const rows = (app as any).db
        .prepare(
          `SELECT i.id,
                  i.started_at,
                  i.ended_at,
                  j.title AS job_title,
                  s.total_score,
                  s.overall_summary,
                  s.pros AS overall_pros,
                  s.cons AS overall_cons,
                  s.suggestions AS overall_suggestions,
                  -- 取一条优点/缺点内容用于列表标签展示
                  (SELECT ia.content FROM interview_advantages ia WHERE ia.interview_id = i.id AND ia.type = 0 ORDER BY ia.created_at ASC LIMIT 1) AS advantage_content,
                  (SELECT ia.content FROM interview_advantages ia WHERE ia.interview_id = i.id AND ia.type = 1 ORDER BY ia.created_at ASC LIMIT 1) AS disadvantage_content,
                  -- 优/缺点条目总数
                  (SELECT COUNT(1) FROM interview_advantages ia WHERE ia.interview_id = i.id) AS advantages_total
             FROM interviews i
        LEFT JOIN jobs j ON j.id = i.job_id
        LEFT JOIN interview_scores s ON s.interview_id = i.id
            WHERE i.user_id = ?
            ORDER BY i.started_at DESC
            `,
        )
        .all(payload.uid);
      return { items: rows, total };
    } catch (err) {
      return reply.code(401).send({ error: '未认证' });
    }
  });

  // 详情（概要、问题条目、面试官剖析）
  app.get('/interviews/:id', async (req, reply) => {
    try {
      const payload = await (req as any).jwtVerify();
      const id = (req as any).params?.id as string;
      const own = (app as any).db
        .prepare('SELECT id, job_id, started_at, ended_at FROM interviews WHERE id=? AND user_id=?')
        .get(id, payload.uid);
      if (!own) return reply.code(404).send({ error: '不存在或无权限' });

      const summary = (app as any).db
        .prepare(
          `SELECT s.total_score,
                  s.duration_sec,
                  s.num_questions,
                  s.overall_summary,
                  s.pros,
                  s.cons,
                  s.suggestions,
                  s.radar_interactivity,
                  s.radar_confidence,
                  s.radar_professionalism,
                  s.radar_relevance,
                  s.radar_clarity
             FROM interview_scores s WHERE s.interview_id=?`,
        )
        .get(id);

      // 问题条目（note_type='question'）
      const questions = (app as any).db
        .prepare(
          `SELECT r.id,
                  r.question_id,
                  r.question,
                  r.answer,
                  r.asked_question,
                  r.candidate_answer,
                  r.key_points,
                  r.assessment,
                  r.reference_answer,
                  r.pros,
                  r.cons,
                  r.suggestions,
                  r.created_at
             FROM interview_reviews r
        LEFT JOIN interview_scores s ON r.score_id = s.id
            WHERE s.interview_id=? AND r.note_type='question'
            ORDER BY r.created_at ASC`,
        )
        .all(id);

      const advantages = (app as any).db
        .prepare(
          `SELECT id, type, content, description, created_at
             FROM interview_advantages
            WHERE interview_id=?
            ORDER BY created_at ASC`,
        )
        .all(id);

      const insights = (app as any).db
        .prepare('SELECT * FROM interview_insights WHERE interview_id=?')
        .get(id);

      return { summary, questions, insights, advantages };
    } catch (err) {
      return reply.code(401).send({ error: '未认证' });
    }
  });

  // 删除整场面试（级联删除评分、复盘、题目、剖析）
  app.delete('/interviews/:id', async (req, reply) => {
    try {
      const payload = await (req as any).jwtVerify();
      const id = (req as any).params?.id as string;
      const own = (app as any).db
        .prepare('SELECT id FROM interviews WHERE id=? AND user_id=?')
        .get(id, payload.uid);
      if (!own) return reply.code(404).send({ error: '不存在或无权限' });
      (app as any).db.prepare('DELETE FROM interviews WHERE id=?').run(id);
      return { success: true };
    } catch (err) {
      return reply.code(401).send({ error: '未认证' });
    }
  });
}
