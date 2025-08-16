import { FastifyInstance } from 'fastify';
import { Config } from '../config/index.js';
import { DocumentProcessor } from '../processors/document-processor.js';
import { EmbeddingService } from '../services/embedding-service.js';
import { VectorStore } from '../stores/vector-store.js';

export async function createQuestionRoutes(
  app: FastifyInstance,
  deps: {
    documentProcessor: DocumentProcessor;
    embeddingService: EmbeddingService;
    vectorStore: VectorStore;
    config: Config;
  },
) {
  // 处理面试押题数据
  app.post('/questions/process', async (req) => {
    const body = (req as any).body as {
      question: {
        id: string;
        title: string;
        description: string;
        job_id: string;
        tag_id?: string;
        tag_name?: string;
        user_id: string;
        created_at: number;
      };
    };

    try {
      const { question } = body;

      // 将面试押题信息分块
      const questionContent = `题目：${question.title}\n\n答案：${question.description}`;
      const chunks = await deps.documentProcessor.splitText(questionContent);

      // 生成向量嵌入
      const embeddings = await deps.embeddingService.embed(chunks);

      // 准备文档数据
      const documents = chunks.map((content, index) => ({
        id: `question:${question.id}:chunk:${index}`,
        content,
        metadata: {
          type: 'interview_question',
          questionId: question.id,
          jobId: question.job_id,
          tagId: question.tag_id || null,
          tagName: question.tag_name || null,
          userId: question.user_id,
          title: question.title,
          chunkIndex: index,
          totalChunks: chunks.length,
          createdAt: question.created_at,
          source: 'interview_question',
        },
        embedding: embeddings[index],
      }));

      // 存入向量数据库
      await deps.vectorStore.addDocuments(documents, deps.config.vectorStore.questionsCollection);

      app.log.info(`Processed interview question ${question.id} into ${chunks.length} chunks`);
      return {
        success: true,
        message: '面试押题已成功处理并存入向量数据库',
        chunks: chunks.length,
      };
    } catch (error) {
      app.log.error({ err: error as any }, 'Failed to process interview question');
      return { success: false, error: '处理失败' };
    }
  });

  // 删除面试押题相关的所有向量数据
  app.delete('/questions/:questionId', async (req) => {
    const { questionId } = (req as any).params as { questionId: string };

    try {
      // 删除该押题的所有向量数据
      await deps.vectorStore.deleteByFilter(
        { questionId },
        deps.config.vectorStore.questionsCollection,
      );

      app.log.info(`Deleted all vector data for question ${questionId}`);
      return {
        success: true,
        message: '面试押题数据已从向量数据库中删除',
      };
    } catch (error) {
      app.log.error({ err: error as any }, 'Failed to delete question data');
      return { success: false, error: '删除失败' };
    }
  });

  // 搜索相关的面试押题信息
  app.get('/questions/search', async (req) => {
    const { query, jobId, userId, tagId, topK } = (req as any).query as {
      query: string;
      jobId?: string;
      userId?: string;
      tagId?: string;
      topK?: string;
    };

    try {
      // 构建过滤条件
      const filter: Record<string, any> = {};
      if (jobId) filter.jobId = jobId;
      if (userId) filter.userId = userId;
      if (tagId) filter.tagId = tagId;

      const k = topK ? parseInt(topK) : deps.config.retrieval.topK;

      // 生成查询的嵌入向量
      const queryEmbedding = await deps.embeddingService.embed([query]);

      // 使用嵌入向量搜索
      const results = await deps.vectorStore.searchByEmbedding(
        queryEmbedding[0],
        k,
        filter,
        deps.config.vectorStore.questionsCollection,
      );

      return {
        success: true,
        results,
        total: results.length,
        query,
        filter,
        topK: k,
      };
    } catch (error) {
      app.log.error({ err: error as any }, 'Question search failed');
      return { success: false, error: '搜索失败' };
    }
  });

  // 根据岗位ID获取相关的面试押题
  app.get('/questions/by-job/:jobId', async (req) => {
    const { jobId } = (req as any).params as { jobId: string };
    const { topK } = (req as any).query as { topK?: string };

    try {
      const k = topK ? parseInt(topK) : deps.config.retrieval.topK;

      // 搜索该岗位下的所有押题（使用空查询字符串获取所有相关文档）
      // 对于空查询，我们使用一个通用的嵌入向量
      const defaultEmbedding = await deps.embeddingService.embed(['']);

      const results = await deps.vectorStore.searchByEmbedding(
        defaultEmbedding[0],
        k,
        { jobId },
        deps.config.vectorStore.questionsCollection,
      );

      return {
        success: true,
        results,
        jobId,
        count: results.length,
      };
    } catch (error) {
      app.log.error({ err: error as any }, 'Failed to get questions by job');
      return { success: false, error: '获取失败' };
    }
  });

  // 根据标签获取相关的面试押题
  app.get('/questions/by-tag/:tagId', async (req) => {
    const { tagId } = (req as any).params as { tagId: string };
    const { topK } = (req as any).query as { topK?: string };

    try {
      const k = topK ? parseInt(topK) : deps.config.retrieval.topK;

      // 对于空查询，我们使用一个通用的嵌入向量
      const defaultEmbedding = await deps.embeddingService.embed(['']);

      const results = await deps.vectorStore.searchByEmbedding(
        defaultEmbedding[0],
        k,
        { tagId },
        deps.config.vectorStore.questionsCollection,
      );

      return {
        success: true,
        results,
        tagId,
        count: results.length,
      };
    } catch (error) {
      app.log.error({ err: error as any }, 'Failed to get questions by tag');
      return { success: false, error: '获取失败' };
    }
  });
}
