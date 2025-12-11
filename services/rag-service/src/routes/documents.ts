import { FastifyInstance } from 'fastify';
import { Config } from '../config/index.js';
import { DocumentProcessor } from '../processors/document-processor.js';
import { EmbeddingService } from '../services/embedding-service.js';
import { VectorStore } from '../stores/vector-store.js';
import { t } from '../utils/i18n.js';

export async function createDocumentRoutes(
  app: FastifyInstance,
  deps: {
    documentProcessor: DocumentProcessor;
    embeddingService: EmbeddingService;
    vectorStore: VectorStore;
    config: Config;
  },
) {
  // 维度不一致导致无法更新时，重建集合并用我们自己的嵌入重建索引
  async function recreateCollectionWithEmbeddings(
    collectionName: string,
    maxDocs: number = 1000,
  ): Promise<number> {
    try {
      const docs = await deps.vectorStore.getAllDocuments(maxDocs, {}, collectionName);
      if (!docs || docs.length === 0) return 0;

      const texts = docs.map((d) => d.content || '');
      const embeddings = await deps.embeddingService.embed(texts);

      // 删除并重建集合
      await deps.vectorStore.deleteCollection(collectionName);
      await deps.vectorStore.getOrCreateCollection(collectionName);

      const toAdd = docs.map((d, i) => ({
        id: d.id,
        content: d.content,
        metadata: d.metadata,
        embedding: embeddings[i],
      }));
      await deps.vectorStore.addDocuments(toAdd as any, collectionName);
      app.log.info(
        { collectionName, rebuilt: toAdd.length },
        'Recreated collection with embeddings',
      );
      return toAdd.length;
    } catch (e) {
      app.log.error({ err: e as any, collectionName }, 'Failed to recreate collection');
      return 0;
    }
  }
  // 解析筛选条件
  function parseFilter(filter: string | undefined) {
    if (!filter) return {};

    try {
      const rawFilter = JSON.parse(filter);
      const { createdFrom, createdTo, ...restFilter } = rawFilter || {};

      const parsedFilter: any = { ...restFilter };

      // 处理时间筛选条件
      if (createdFrom || createdTo) {
        parsedFilter.needsTimeFilter = true;
        parsedFilter.timeFrom = createdFrom;
        parsedFilter.timeTo = createdTo;
      }

      return parsedFilter;
    } catch (error) {
      app.log.warn({ err: error as any }, 'Failed to parse filter');
      return {};
    }
  }

  // 统一按创建时间逆序排序（优先 metadata.created_at，其次 metadata.timestamp）
  function sortByCreatedAtDesc(results: Array<{ metadata?: Record<string, any> }>) {
    return results.sort((a: any, b: any) => {
      const ta = a?.metadata?.created_at ?? a?.metadata?.timestamp ?? 0;
      const tb = b?.metadata?.created_at ?? b?.metadata?.timestamp ?? 0;
      const na = typeof ta === 'number' ? ta : ta ? new Date(ta).getTime() : 0;
      const nb = typeof tb === 'number' ? tb : tb ? new Date(tb).getTime() : 0;
      return nb - na;
    });
  }

  // 有查询条件时按相关度优先排序，相关度相同时按时间倒序排序
  function sortByScoreThenCreatedAt(results: Array<{ score?: number; metadata?: Record<string, any> }>) {
    return results.sort((a: any, b: any) => {
      const scoreA = typeof a.score === 'number' ? a.score : 0;
      const scoreB = typeof b.score === 'number' ? b.score : 0;

      // 第一优先级：按相关度降序（分数高的在前）
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      // 第二优先级：相关度相同时按时间倒序（新的在前）
      const ta = a?.metadata?.created_at ?? a?.metadata?.timestamp ?? 0;
      const tb = b?.metadata?.created_at ?? b?.metadata?.timestamp ?? 0;
      const na = typeof ta === 'number' ? ta : ta ? new Date(ta).getTime() : 0;
      const nb = typeof tb === 'number' ? tb : tb ? new Date(tb).getTime() : 0;
      return nb - na;
    });
  }

  // 处理单个文档
  app.post('/ingest', async (req) => {
    const body = (req as any).body as {
      content: string;
      metadata?: Record<string, any>;
      collection?: string;
    };

    try {
      const {
        content,
        metadata = {},
        collection = deps.config.vectorStore.defaultCollection,
      } = body;

      // 分块处理
      const chunks = await deps.documentProcessor.splitText(content);

      // 生成向量嵌入
      const embeddings = await deps.embeddingService.embed(chunks);

      // 准备文档数据
      const documents = chunks.map((chunk, index) => ({
        id: `doc:${Date.now()}:chunk:${index}`,
        content: chunk,
        metadata: {
          ...metadata,
          chunk_index: index,
          total_chunks: chunks.length,
          processed_at: Date.now(),
        },
        embedding: embeddings[index],
      }));

      // 存入向量数据库
      await deps.vectorStore.addDocuments(documents, collection);

      return {
        success: true,
        message: t('message.documentProcessed'),
        chunks: chunks.length,
        collection,
      };
    } catch (error) {
      app.log.error({ err: error as any }, 'Failed to ingest document');
      return { success: false, error: t('error.processFailed') };
    }
  });

  // 批量处理文档
  // 支持幂等性：如果文档包含 id 字段，使用 upsert 逻辑避免重复插入
  app.post('/ingest/batch', async (req) => {
    const body = (req as any).body as {
      documents: Array<{
        id?: string;  // 可选的唯一标识符，用于幂等性保护
        content: string;
        metadata?: Record<string, any>;
      }>;
      collection?: string;
    };

    try {
      const { documents, collection = deps.config.vectorStore.defaultCollection } = body;

      const results = [];
      for (const doc of documents) {
        try {
          // 分块处理
          const chunks = await deps.documentProcessor.splitText(doc.content);

          // 生成向量嵌入
          const embeddings = await deps.embeddingService.embed(chunks);

          // 准备文档数据
          // 如果文档有 id，使用它（适用于单 chunk 场景）；否则生成随机 ID
          const baseId = doc.id || `batch:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
          const docData = chunks.map((chunk, index) => ({
            id: chunks.length === 1 ? baseId : `${baseId}:chunk:${index}`,
            content: chunk,
            metadata: {
              ...doc.metadata,
              chunk_index: index,
              total_chunks: chunks.length,
              processed_at: Date.now(),
            },
            embedding: embeddings[index],
          }));

          // 存入向量数据库（幂等性：相同 ID 已存在则跳过）
          await deps.vectorStore.addDocumentsIdempotent(docData, collection);

          results.push({
            success: true,
            chunks: chunks.length,
            metadata: doc.metadata,
          });
        } catch (error) {
          results.push({
            success: false,
            error: (error as any).message,
            metadata: doc.metadata,
          });
        }
      }

      return {
        success: true,
        message: t('message.batchProcessed'),
        results,
        collection,
      };
    } catch (error) {
      app.log.error({ err: error as any }, 'Failed to process batch documents');
      return { success: false, error: t('error.processFailed') };
    }
  });

  // 根据条件删除文档
  app.post('/delete/by-filter', async (req) => {
    const body = (req as any).body as {
      where: Record<string, any>;
      collection?: string;
    };

    try {
      const { where, collection = deps.config.vectorStore.defaultCollection } = body;

      await deps.vectorStore.deleteByFilter(where, collection);

      return {
        success: true,
        message: t('message.documentDeleted'),
        filter: where,
        collection,
      };
    } catch (error) {
      app.log.error({ err: error as any }, 'Failed to delete documents by filter');
      return { success: false, error: t('error.deleteFailed') };
    }
  });

  // 搜索 jobs 集合
  app.get('/search/jobs', async (request, reply) => {
    try {
      const { query, filter, k = 1000 } = request.query as any;

      app.log.info(
        {
          query,
          filter,
          k,
        },
        'Search jobs request received',
      );

      // 解析筛选条件
      const parsedFilter = parseFilter(filter);
      app.log.info({ parsedFilter }, 'Parsed filter for jobs');

      // 只传递 ChromaDB 兼容的筛选条件
      const chromaFilter: any = {};
      if (parsedFilter.tagId) chromaFilter.tag_id = parsedFilter.tagId;
      if (parsedFilter.jobId) chromaFilter.job_id = parsedFilter.jobId;
      if (parsedFilter.id) chromaFilter.id = parsedFilter.id;

      // 如果没有搜索条件，直接获取所有文档
      if (!query) {
        const results = await deps.vectorStore.getAllDocuments(
          k,
          chromaFilter,
          deps.config.vectorStore.jobsCollection,
        );

        const ordered = sortByCreatedAtDesc(results);

        return {
          success: true,
          results: ordered,
          total: ordered.length,
          query: '',
          filter: parsedFilter,
          topK: k,
          collection: 'jobs',
        };
      }

      // 生成查询的嵌入向量
      const queryEmbedding = await deps.embeddingService.embed([query.trim()]);

      // 搜索 jobs 集合
      const searchResults = await deps.vectorStore.searchByEmbedding(
        queryEmbedding[0],
        k,
        chromaFilter,
        deps.config.vectorStore.jobsCollection,
        query,
      );

      // 如果没有命中，但集合有文档，尝试为集合重建嵌入后重试一次
      if (searchResults.length === 0) {
        const stats = await deps.vectorStore.getCollectionStats(
          deps.config.vectorStore.jobsCollection,
        );
        if (stats?.documentCount > 0) {
          await recreateCollectionWithEmbeddings(deps.config.vectorStore.jobsCollection);
          const retried = await deps.vectorStore.searchByEmbedding(
            queryEmbedding[0],
            k,
            chromaFilter,
            deps.config.vectorStore.jobsCollection,
          );
          if (retried.length > 0) {
            return {
              success: true,
              results: retried,
              total: retried.length,
              query: query,
              filter: parsedFilter,
              topK: k,
              collection: 'jobs',
            };
          }
        }
      }

      // 如果有时间筛选，在应用层过滤
      if (parsedFilter.needsTimeFilter && (parsedFilter.timeFrom || parsedFilter.timeTo)) {
        const filtered = searchResults.filter((doc) => {
          const docTime = doc.metadata?.created_at || doc.metadata?.timestamp;
          if (!docTime) return false; // 如果没有时间戳，不显示该文档

          const timestamp = typeof docTime === 'number' ? docTime : new Date(docTime).getTime();
          if (parsedFilter.timeFrom && timestamp < parsedFilter.timeFrom) return false;
          if (parsedFilter.timeTo && timestamp > parsedFilter.timeTo) return false;
          return true;
        });

        // 有查询条件时按相关度优先排序
        const ordered = sortByScoreThenCreatedAt(filtered);

        return {
          success: true,
          results: ordered,
          total: ordered.length,
          query: query,
          filter: parsedFilter,
          topK: k,
          collection: 'jobs',
        };
      }

      // 有查询条件时按相关度优先排序
      const ordered = sortByScoreThenCreatedAt(searchResults);

      return {
        success: true,
        results: ordered,
        total: ordered.length,
        query: query,
        filter: parsedFilter,
        topK: k,
        collection: 'jobs',
      };
    } catch (error) {
      app.log.error({ err: error as any }, 'Search jobs failed');
      return reply.status(500).send({ success: false, error: t('error.searchJobsFailed') });
    }
  });

  // 搜索 resumes 集合
  app.get('/search/resumes', async (request, reply) => {
    try {
      const { query, filter, k = 1000 } = request.query as any;

      app.log.info(
        {
          query,
          filter,
          k,
        },
        'Search resumes request received',
      );

      // 解析筛选条件
      const parsedFilter = parseFilter(filter);
      app.log.info({ parsedFilter }, 'Parsed filter for resumes');

      // 只传递 ChromaDB 兼容的筛选条件
      const chromaFilter: any = {};
      if (parsedFilter.tagId) chromaFilter.tag_id = parsedFilter.tagId;
      if (parsedFilter.jobId) chromaFilter.job_id = parsedFilter.jobId;
      if (parsedFilter.id) chromaFilter.id = parsedFilter.id;

      // 如果没有搜索条件，直接获取所有文档
      if (!query) {
        const results = await deps.vectorStore.getAllDocuments(
          k,
          chromaFilter,
          deps.config.vectorStore.resumesCollection,
        );

        const ordered = sortByCreatedAtDesc(results);

        return {
          success: true,
          results: ordered,
          total: ordered.length,
          query: '',
          filter: parsedFilter,
          topK: k,
          collection: 'resumes',
        };
      }

      // 生成查询的嵌入向量并执行向量检索
      const queryEmbedding = await deps.embeddingService.embed([query.trim()]);

      let searchResults = await deps.vectorStore.searchByEmbedding(
        queryEmbedding[0],
        k,
        chromaFilter,
        deps.config.vectorStore.resumesCollection,
        query,
      );

      if (searchResults.length === 0) {
        const stats = await deps.vectorStore.getCollectionStats(
          deps.config.vectorStore.resumesCollection,
        );
        if (stats?.documentCount > 0) {
          await recreateCollectionWithEmbeddings(deps.config.vectorStore.resumesCollection);
          searchResults = await deps.vectorStore.searchByEmbedding(
            queryEmbedding[0],
            k,
            chromaFilter,
            deps.config.vectorStore.resumesCollection,
            query,
          );
        }
      }

      // 如果有时间筛选，在应用层过滤
      if (parsedFilter.needsTimeFilter && (parsedFilter.timeFrom || parsedFilter.timeTo)) {
        const filtered = searchResults.filter((doc) => {
          const docTime = doc.metadata?.created_at || doc.metadata?.timestamp;
          if (!docTime) return false; // 如果没有时间戳，不显示该文档

          const timestamp = typeof docTime === 'number' ? docTime : new Date(docTime).getTime();
          if (parsedFilter.timeFrom && timestamp < parsedFilter.timeFrom) return false;
          if (parsedFilter.timeTo && timestamp > parsedFilter.timeTo) return false;
          return true;
        });

        // 有查询条件时按相关度优先排序
        const ordered = sortByScoreThenCreatedAt(filtered);

        return {
          success: true,
          results: ordered,
          total: ordered.length,
          query: query,
          filter: parsedFilter,
          topK: k,
          collection: 'resumes',
        };
      }

      // 有查询条件时按相关度优先排序
      const ordered = sortByScoreThenCreatedAt(searchResults);

      return {
        success: true,
        results: ordered,
        total: ordered.length,
        query: query,
        filter: parsedFilter,
        topK: k,
        collection: 'resumes',
      };
    } catch (error) {
      app.log.error({ err: error as any }, 'Search resumes failed');
      return reply.status(500).send({ success: false, error: t('error.searchResumesFailed') });
    }
  });

  // 搜索 questions 集合
  app.get('/search/questions', async (request, reply) => {
    try {
      const { query, filter, k = 1000 } = request.query as any;

      app.log.info(
        {
          query,
          filter,
          k,
        },
        'Search questions request received',
      );

      // 解析筛选条件
      const parsedFilter = parseFilter(filter);
      app.log.info({ parsedFilter }, 'Parsed filter for questions');

      // 只传递 ChromaDB 兼容的筛选条件
      const chromaFilter: any = {};
      if (parsedFilter.tagId) chromaFilter.tag_id = parsedFilter.tagId;
      if (parsedFilter.jobId) chromaFilter.job_id = parsedFilter.jobId;
      if (parsedFilter.id) chromaFilter.id = parsedFilter.id;

      // 如果没有搜索条件，直接获取所有文档
      if (!query) {
        const results = await deps.vectorStore.getAllDocuments(
          k,
          chromaFilter,
          deps.config.vectorStore.questionsCollection,
        );

        const ordered = sortByCreatedAtDesc(results);

        return {
          success: true,
          results: ordered,
          total: ordered.length,
          query: '',
          filter: parsedFilter,
          topK: k,
          collection: 'questions',
        };
      }

      // 生成查询的嵌入向量并执行向量检索
      const queryEmbedding = await deps.embeddingService.embed([query.trim()]);

      let searchResults = await deps.vectorStore.searchByEmbedding(
        queryEmbedding[0],
        k,
        chromaFilter,
        deps.config.vectorStore.questionsCollection,
        query,
      );

      if (searchResults.length === 0) {
        const stats = await deps.vectorStore.getCollectionStats(
          deps.config.vectorStore.questionsCollection,
        );
        if (stats?.documentCount > 0) {
          await recreateCollectionWithEmbeddings(deps.config.vectorStore.questionsCollection);
          searchResults = await deps.vectorStore.searchByEmbedding(
            queryEmbedding[0],
            k,
            chromaFilter,
            deps.config.vectorStore.questionsCollection,
            query,
          );
        }
      }

      // 如果有时间筛选，在应用层过滤
      if (parsedFilter.needsTimeFilter && (parsedFilter.timeFrom || parsedFilter.timeTo)) {
        const filtered = searchResults.filter((doc) => {
          const docTime = doc.metadata?.created_at || doc.metadata?.timestamp;
          if (!docTime) return false; // 如果没有时间戳，不显示该文档

          const timestamp = typeof docTime === 'number' ? docTime : new Date(docTime).getTime();
          if (parsedFilter.timeFrom && timestamp < parsedFilter.timeFrom) return false;
          if (parsedFilter.timeTo && timestamp > parsedFilter.timeTo) return false;
          return true;
        });

        // 有查询条件时按相关度优先排序
        const ordered = sortByScoreThenCreatedAt(filtered);

        return {
          success: true,
          results: ordered,
          total: ordered.length,
          query: query,
          filter: parsedFilter,
          topK: k,
          collection: 'questions',
        };
      }

      // 有查询条件时按相关度优先排序
      const ordered = sortByScoreThenCreatedAt(searchResults);

      return {
        success: true,
        results: ordered,
        total: ordered.length,
        query: query,
        filter: parsedFilter,
        topK: k,
        collection: 'questions',
      };
    } catch (error) {
      app.log.error({ err: error as any }, 'Search questions failed');
      return reply.status(500).send({ success: false, error: t('error.searchQuestionsFailed') });
    }
  });

  // 搜索 other-files 集合
  app.get('/search/other-files', async (request, reply) => {
    try {
      const { query, filter, k = 1000 } = request.query as any;

      let parsedFilter: any = {};
      if (filter) {
        try {
          parsedFilter = JSON.parse(filter);
        } catch (e) {
          app.log.warn('Invalid filter format, using empty object');
        }
      }

      app.log.info({ query, filter: parsedFilter, k }, 'Searching other-files collection');

      let searchResults: any[] = [];
      const hasQuery = query && query.trim() !== '';

      if (!hasQuery) {
        // 没有查询关键词时，直接获取所有文档
        searchResults = await deps.vectorStore.getAllDocuments(
          Number(k),
          parsedFilter,
          'other_files',
        );
        // 没有查询条件时按时间排序
        const ordered = sortByCreatedAtDesc(searchResults);

        return {
          success: true,
          results: ordered,
          total: ordered.length,
          query: query,
          filter: parsedFilter,
          topK: k,
          collection: 'other_files',
        };
      } else {
        // 有查询关键词时，进行向量搜索
        // 生成查询的嵌入向量
        const queryEmbedding = await deps.embeddingService.embed([query.trim()]);

        // 搜索 other_files 集合
        const results = await deps.vectorStore.searchByEmbedding(
          queryEmbedding[0],
          Number(k),
          parsedFilter,
          'other_files',
        );

        searchResults = results.map((r: any) => {
          const score = typeof r.score === 'number' ? r.score : 0;
          return {
            ...r,
            score,
          };
        });
      }

      // 有查询条件时按相关度优先排序
      const ordered = sortByScoreThenCreatedAt(searchResults);

      return {
        success: true,
        results: ordered,
        total: ordered.length,
        query: query,
        filter: parsedFilter,
        topK: k,
        collection: 'other_files',
      };
    } catch (error) {
      app.log.error({ err: error as any }, 'Search other-files failed');
      return reply.status(500).send({ success: false, error: t('error.searchOtherFilesFailed') });
    }
  });

  // 获取文档的关联信息
  app.get('/documents/:docId/related', async (req) => {
    const { docId } = (req as any).params as { docId: string };

    try {
      // 根据文档 ID 前缀判断应该从哪个集合中查找
      let targetCollection = deps.config.vectorStore.defaultCollection;

      if (docId.startsWith('job:')) {
        targetCollection = deps.config.vectorStore.jobsCollection;
      } else if (docId.startsWith('resume:')) {
        targetCollection = deps.config.vectorStore.resumesCollection;
      } else if (docId.startsWith('question:')) {
        targetCollection = deps.config.vectorStore.questionsCollection;
      }

      // 在目标集合中查找文档
      let doc: any = null;

      try {
        // 精确查询：仅按 ID 获取，避免遗漏
        const documents = await deps.vectorStore.getAllDocuments(
          1,
          { id: docId },
          targetCollection,
        );
        doc = documents.find((d) => d.id === docId);
      } catch (error) {
        app.log.warn(`Failed to get documents from collection ${targetCollection}: ${error}`);
      }

      if (!doc) {
        return { success: false, error: t('error.documentNotExists') };
      }

      const relatedData: any = {};

      // 根据文档类型获取关联信息
      if (doc.metadata.type === 'jobs') {
        // 岗位信息：获取对应的简历和押题
        // 使用文档元数据中的 job_id 来查找关联的简历和押题
        const jobId = doc.metadata.job_id;

        if (jobId) {
          // 获取简历信息
          const resumes = await deps.vectorStore.getAllDocuments(
            1000,
            { job_id: jobId },
            deps.config.vectorStore.resumesCollection,
          );
          relatedData.resumes = resumes;

          // 获取押题信息
          const questions = await deps.vectorStore.getAllDocuments(
            1000,
            { job_id: jobId },
            deps.config.vectorStore.questionsCollection,
          );
          relatedData.questions = questions;
        } else {
          // 如果没有 job_id，返回空数组
          relatedData.resumes = [];
          relatedData.questions = [];
        }

        // 岗位本身作为 jobs 返回
        relatedData.jobs = [doc];
      } else if (doc.metadata.type === 'resumes') {
        // 简历信息：获取对应的岗位和押题
        if (doc.metadata.job_id) {
          // 获取岗位信息
          // 岗位文档的 ID 格式是 job:{jobId}，所以需要使用 job_id 来查找
          const jobs = await deps.vectorStore.getAllDocuments(
            1000,
            { job_id: doc.metadata.job_id },
            deps.config.vectorStore.jobsCollection,
          );
          relatedData.jobs = jobs;

          // 获取押题信息
          const questions = await deps.vectorStore.getAllDocuments(
            1000,
            { job_id: doc.metadata.job_id },
            deps.config.vectorStore.questionsCollection,
          );
          relatedData.questions = questions;
        }

        // 简历本身作为 resumes 返回
        relatedData.resumes = [doc];
      } else if (doc.metadata.type === 'questions') {
        // 押题信息：获取对应的岗位和简历
        if (doc.metadata.job_id) {
          // 获取岗位信息
          // 岗位文档的 ID 格式是 job:{jobId}，所以需要使用 job_id 来查找
          const jobs = await deps.vectorStore.getAllDocuments(
            1000,
            { job_id: doc.metadata.job_id },
            deps.config.vectorStore.jobsCollection,
          );
          relatedData.jobs = jobs;

          // 获取简历信息
          const resumes = await deps.vectorStore.getAllDocuments(
            1000,
            { job_id: doc.metadata.job_id },
            deps.config.vectorStore.resumesCollection,
          );
          relatedData.resumes = resumes;
        }

        // 押题本身作为 questions 返回
        relatedData.questions = [doc];
      }

      return {
        success: true,
        document: doc,
        related: relatedData,
        foundCollection: targetCollection, // 返回找到文档的集合名称，用于调试
      };
    } catch (error) {
      app.log.error({ err: error as any }, 'Failed to get related documents');
      return { success: false, error: t('error.getRelatedFailed') };
    }
  });

  // 清理所有向量数据
  app.post('/clean-all', async () => {
    try {
      app.log.info('Starting complete vector database cleanup...');

      // 清理所有集合
      const collections = [
        deps.config.vectorStore.jobsCollection,
        deps.config.vectorStore.resumesCollection,
        deps.config.vectorStore.questionsCollection,
        deps.config.vectorStore.defaultCollection,
      ];

      let totalDeleted = 0;
      const results: Record<string, any> = {};

      for (const collection of collections) {
        try {
          // 获取集合中的所有文档
          const allDocs = await deps.vectorStore.getAllDocuments(10000, {}, collection);
          if (allDocs && allDocs.length > 0) {
            // 删除整个集合并重新创建
            await deps.vectorStore.deleteCollection(collection);
            await deps.vectorStore.getOrCreateCollection(collection);
            results[collection] = { deleted: allDocs.length, status: 'success' };
            totalDeleted += allDocs.length;
            app.log.info(`Cleaned collection ${collection}: deleted ${allDocs.length} documents`);
          } else {
            results[collection] = { deleted: 0, status: 'already_empty' };
            app.log.info(`Collection ${collection} is already empty`);
          }
        } catch (error: any) {
          results[collection] = { deleted: 0, status: 'error', error: error.message };
          app.log.error({ err: error as any }, `Failed to clean collection ${collection}`);
        }
      }

      app.log.info(`Vector database cleanup completed. Total documents deleted: ${totalDeleted}`);

      return {
        success: true,
        message: t('message.cleanupCompleted', { count: totalDeleted }),
        totalDeleted,
        results,
      };
    } catch (error: any) {
      app.log.error({ err: error as any }, 'Failed to clean vector database');
      return { success: false, error: t('error.cleanupFailed', { message: error.message }) };
    }
  });
}
