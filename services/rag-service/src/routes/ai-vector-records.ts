import type { FastifyInstance } from 'fastify';
import type { DocumentProcessor } from '../processors/document-processor.js';
import type { EmbeddingService } from '../services/embedding-service.js';
import type { VectorStore } from '../stores/vector-store.js';
import type { Config } from '../config/index.js';

// AI 向量记录结构（与 interview_reviews 表结构一致）
interface AIVectorRecord {
  id: string;
  interview_id: string;
  note_type: string;
  content: string;
  question_id?: string;
  question?: string;
  answer?: string;
  asked_question?: string;
  candidate_answer?: string;
  pros?: string;
  cons?: string;
  suggestions?: string;
  key_points?: string;
  assessment?: string;
  reference_answer?: string;
  other_id?: string;
  other_content?: string;
  created_at: number;
}

export async function createAIVectorRecordsRoutes(
  app: FastifyInstance,
  deps: {
    documentProcessor: DocumentProcessor;
    embeddingService: EmbeddingService;
    vectorStore: VectorStore;
    config: Config;
  },
) {
  const { embeddingService, vectorStore } = deps;
  const collectionName = 'ai_vector_records';

  // 确保 collection 存在
  await vectorStore.getOrCreateCollection(collectionName);

  /**
   * 保存 AI 向量记录
   * POST /ai-vector-records
   */
  app.post<{ Body: AIVectorRecord }>('/ai-vector-records', async (request, reply) => {
    try {
      const record = request.body;

      if (!record.id || !record.interview_id) {
        return reply.code(400).send({
          success: false,
          error: '缺少必要字段: id 和 interview_id',
        });
      }

      // 构建用于向量化的文本内容
      const textParts = [];
      if (record.asked_question) textParts.push(`问题: ${record.asked_question}`);
      if (record.candidate_answer) textParts.push(`回答: ${record.candidate_answer}`);
      if (record.question) textParts.push(`押题: ${record.question}`);
      if (record.answer) textParts.push(`参考答案: ${record.answer}`);
      if (record.other_content) textParts.push(`相关资料: ${record.other_content}`);

      const contentText = textParts.join('\n');

      if (!contentText.trim()) {
        return reply.code(400).send({
          success: false,
          error: '内容为空，无法向量化',
        });
      }

      // 生成向量
      const embeddings = await embeddingService.embed([contentText]);
      const embedding = embeddings[0];

      // 构建 metadata
      const metadata: any = {
        interview_id: record.interview_id,
        note_type: record.note_type,
        created_at: record.created_at,
      };

      if (record.question_id) metadata.question_id = record.question_id;
      if (record.question) metadata.question = record.question;
      if (record.answer) metadata.answer = record.answer;
      if (record.asked_question) metadata.asked_question = record.asked_question;
      if (record.candidate_answer) metadata.candidate_answer = record.candidate_answer;
      if (record.pros) metadata.pros = record.pros;
      if (record.cons) metadata.cons = record.cons;
      if (record.suggestions) metadata.suggestions = record.suggestions;
      if (record.key_points) metadata.key_points = record.key_points;
      if (record.assessment) metadata.assessment = record.assessment;
      if (record.reference_answer) metadata.reference_answer = record.reference_answer;
      if (record.other_id) metadata.other_id = record.other_id;
      if (record.other_content) metadata.other_content = record.other_content;

      // 保存到 ChromaDB
      await vectorStore.addDocuments(
        [
          {
            id: record.id,
            content: contentText,
            embedding,
            metadata,
          },
        ],
        collectionName,
      );

      return {
        success: true,
        id: record.id,
      };
    } catch (error: any) {
      app.log.error('保存 AI 向量记录失败:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || '保存失败',
      });
    }
  });

  /**
   * 搜索 AI 向量记录
   * GET /search/ai-vector-records?query=xxx&k=20
   */
  app.get<{
    Querystring: {
      query?: string;
      k?: number;
      interview_id?: string;
      note_type?: string;
      createdFrom?: number;
      createdTo?: number;
    };
  }>('/search/ai-vector-records', async (request, reply) => {
    try {
      const { query = '', k = 100, interview_id, note_type, createdFrom, createdTo } = request.query;

      // 构建过滤条件
      const filter: any = {};
      if (interview_id) filter.interview_id = interview_id;
      if (note_type) filter.note_type = note_type;

      // 时间范围筛选
      if (createdFrom || createdTo) {
        if (createdFrom && createdTo) {
          filter.$and = [
            { created_at: { $gte: createdFrom } },
            { created_at: { $lte: createdTo } },
          ];
        } else if (createdFrom) {
          filter.created_at = { $gte: createdFrom };
        } else if (createdTo) {
          filter.created_at = { $lte: createdTo };
        }
      }

      let results;

      if (query.trim()) {
        // 有搜索词：语义搜索
        const embeddings = await embeddingService.embed([query]);
        const embedding = embeddings[0];
        const searchResults = await vectorStore.searchByEmbedding(
          embedding,
          k,
          Object.keys(filter).length > 0 ? filter : undefined,
          collectionName,
        );

        results = searchResults.map((result: any) => ({
          id: result.id,
          content: result.document || result.content,
          metadata: result.metadata,
          score: result.score,
        }));
      } else {
        // 无搜索词：获取所有记录
        const allResults = await vectorStore.getAllDocuments(
          k,
          Object.keys(filter).length > 0 ? filter : undefined,
          collectionName,
        );

        results = allResults.map((result: any) => ({
          id: result.id,
          content: result.document || result.content,
          metadata: result.metadata,
          score: 1.0,
        }));
      }

      return {
        success: true,
        results,
        total: results.length,
      };
    } catch (error: any) {
      app.log.error('搜索 AI 向量记录失败:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || '搜索失败',
        results: [],
        total: 0,
      });
    }
  });

  /**
   * 删除 AI 向量记录
   * DELETE /ai-vector-records/:id
   */
  app.delete<{
    Params: { id: string };
  }>('/ai-vector-records/:id', async (request, reply) => {
    try {
      const { id } = request.params;

      await vectorStore.deleteDocuments([id], collectionName);

      return {
        success: true,
        message: `记录 ${id} 已删除`,
      };
    } catch (error: any) {
      app.log.error('删除 AI 向量记录失败:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || '删除失败',
      });
    }
  });
}
