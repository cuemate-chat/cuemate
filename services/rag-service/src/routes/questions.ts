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
      const questionContent = `题目：${question.title}\n\n 答案：${question.description}`;
      const chunks = await deps.documentProcessor.splitText(questionContent);

      // 生成向量嵌入
      const embeddings = await deps.embeddingService.embed(chunks);

      // 准备文档数据
      const documents = chunks.map((content, index) => ({
        id:
          chunks.length === 1
            ? `question:${question.id}`
            : `question:${question.id}:chunk:${index}`,
        content,
        metadata: {
          type: 'questions',
          questionId: question.id,
          jobId: question.job_id,
          tagId: question.tag_id || null,
          tagName: question.tag_name || null,
          userId: question.user_id,
          title: question.title,
          description: question.description,
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
    const { query, jobId, userId, tagId, topK, questionTitle } = (req as any).query as {
      query: string;
      jobId?: string;
      userId?: string;
      tagId?: string;
      topK?: string;
      questionTitle?: string;
    };

    try {
      // 构建过滤条件
      const filter: Record<string, any> = {};
      if (jobId) filter.jobId = jobId;
      if (userId) filter.userId = userId;
      if (tagId) filter.tagId = tagId;
      if (questionTitle) filter.title = questionTitle;

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

  // 根据岗位 ID 获取相关的面试押题
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

  // 计算问题相似度（用于模拟面试场景）
  app.post('/similarity/questions', async (req) => {
    const body = (req as any).body as {
      query: string;
      jobId: string;
      threshold?: number;
      topK?: number;
    };

    try {
      const { query, jobId, threshold = 0.8, topK = 5 } = body;

      if (!query || !jobId) {
        return {
          success: false,
          error: 'query 和 jobId 参数是必需的',
        };
      }

      // 生成查询问题的嵌入向量
      const queryEmbeddings = await deps.embeddingService.embed([query]);
      const queryEmbedding = queryEmbeddings[0];

      // 在 ChromaDB 中搜索该岗位的相似问题
      const searchResults = await deps.vectorStore.searchByEmbedding(
        queryEmbedding,
        topK,
        { jobId },
        deps.config.vectorStore.questionsCollection,
      );

      if (searchResults.length === 0) {
        return {
          success: true,
          match: {},
          threshold,
        };
      }

      // 计算关键词命中率，过滤结果
      const validMatches = [];
      for (const result of searchResults) {
        const questionText = result.metadata?.title || '';
        const keywordMatchRate = calculateKeywordMatch(query, questionText);

        // 向量相似度 >= threshold 且关键词命中率 >= 80%
        if (result.score >= threshold && keywordMatchRate >= 0.8) {
          validMatches.push({
            score: result.score,
            keywordMatchRate,
            questionId: result.metadata?.questionId,
            title: result.metadata?.title,
            metadata: result.metadata,
          });
        }
      }

      // 取最相似的 1 条
      const bestMatch = validMatches.length > 0 ? validMatches[0] : null;

      // 返回最佳匹配（包含答案）
      if (bestMatch && bestMatch.questionId) {
        return {
          success: true,
          match: {
            questionId: bestMatch.questionId,
            question: bestMatch.title,
            answer: bestMatch.metadata?.description || '',
            score: bestMatch.score,
          },
          threshold,
        };
      }

      return {
        success: true,
        match: {},
        threshold,
      };
    } catch (error) {
      app.log.error({ err: error as any }, 'Similarity calculation failed');
      return { success: false, error: '相似度计算失败' };
    }
  });
}

// 计算关键词命中率（基于候选问题的关键词在查询问题中的命中比例）
function calculateKeywordMatch(query: string, candidateText: string): number {
  // 分词并过滤停用词
  const stopWords = new Set([
    '的',
    '了',
    '在',
    '是',
    '我',
    '有',
    '和',
    '就',
    '不',
    '人',
    '都',
    '一',
    '一个',
    '上',
    '也',
    '很',
    '到',
    '说',
    '要',
    '去',
    '你',
    '会',
    '着',
    '没有',
    '看',
    '好',
    '自己',
    '这',
    '那',
    '之',
    '与',
    '为',
    '吗',
    '呢',
    '啊',
    '么',
    '嘛',
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'from',
    'as',
    'is',
    'was',
    'are',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'should',
    'could',
    'may',
    'might',
    'can',
    'what',
    'how',
    'why',
  ]);

  // 提取候选问题的关键词（过滤停用词和标点符号）
  const candidateWords = candidateText
    .toLowerCase()
    .replace(/[,.!?;:，。！？；：、""''（）()【】\[\]]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1 && !stopWords.has(word));

  if (candidateWords.length === 0) {
    return 0;
  }

  // 查询问题转小写
  const queryLower = query.toLowerCase();

  // 统计命中的关键词数量
  let matchedCount = 0;
  for (const word of candidateWords) {
    if (queryLower.includes(word)) {
      matchedCount++;
    }
  }

  // 返回命中率
  return matchedCount / candidateWords.length;
}
