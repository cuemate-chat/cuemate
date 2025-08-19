import { FastifyInstance } from 'fastify';
import { Config } from '../config/index.js';
import { DocumentProcessor } from '../processors/document-processor.js';
import { EmbeddingService } from '../services/embedding-service.js';
import { VectorStore } from '../stores/vector-store.js';

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
          chunkIndex: index,
          totalChunks: chunks.length,
          processedAt: Date.now(),
        },
        embedding: embeddings[index],
      }));

      // 存入向量数据库
      await deps.vectorStore.addDocuments(documents, collection);

      return {
        success: true,
        message: '文档已成功处理并存入向量数据库',
        chunks: chunks.length,
        collection,
      };
    } catch (error) {
      app.log.error({ err: error as any }, 'Failed to ingest document');
      return { success: false, error: '文档处理失败' };
    }
  });

  // 批量处理文档
  app.post('/ingest/batch', async (req) => {
    const body = (req as any).body as {
      documents: Array<{
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
          const docData = chunks.map((chunk, index) => ({
            id: `batch:${Date.now()}:${Math.random().toString(36).substr(2, 9)}:chunk:${index}`,
            content: chunk,
            metadata: {
              ...doc.metadata,
              chunkIndex: index,
              totalChunks: chunks.length,
              processedAt: Date.now(),
            },
            embedding: embeddings[index],
          }));

          // 存入向量数据库
          await deps.vectorStore.addDocuments(docData, collection);

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
        message: '批量文档处理完成',
        results,
        collection,
      };
    } catch (error) {
      app.log.error({ err: error as any }, 'Failed to process batch documents');
      return { success: false, error: '批量处理失败' };
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
        message: '符合条件的文档已从向量数据库中删除',
        filter: where,
        collection,
      };
    } catch (error) {
      app.log.error({ err: error as any }, 'Failed to delete documents by filter');
      return { success: false, error: '删除失败' };
    }
  });

  // 搜索jobs集合
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

      // 只传递ChromaDB兼容的筛选条件
      const chromaFilter: any = {};
      if (parsedFilter.tagId) chromaFilter.tagId = parsedFilter.tagId;
      if (parsedFilter.jobId) chromaFilter.jobId = parsedFilter.jobId;
      if (parsedFilter.id) chromaFilter.id = parsedFilter.id;

      // 如果没有搜索条件，直接获取所有文档
      if (!query) {
        const results = await deps.vectorStore.getAllDocuments(
          k,
          chromaFilter,
          deps.config.vectorStore.jobsCollection,
        );

        return {
          success: true,
          results,
          total: results.length,
          query: '',
          filter: parsedFilter,
          topK: k,
          collection: 'jobs',
        };
      }

      // 生成查询的嵌入向量
      const queryEmbedding = await deps.embeddingService.embed([query.trim()]);

      // 搜索jobs集合
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
          const docTime = doc.metadata?.createdAt || doc.metadata?.timestamp;
          if (!docTime) return false; // 如果没有时间戳，不显示该文档

          const timestamp = typeof docTime === 'number' ? docTime : new Date(docTime).getTime();
          if (parsedFilter.timeFrom && timestamp < parsedFilter.timeFrom) return false;
          if (parsedFilter.timeTo && timestamp > parsedFilter.timeTo) return false;
          return true;
        });

        return {
          success: true,
          results: filtered,
          total: filtered.length,
          query: query,
          filter: parsedFilter,
          topK: k,
          collection: 'jobs',
        };
      }

      return {
        success: true,
        results: searchResults,
        total: searchResults.length,
        query: query,
        filter: parsedFilter,
        topK: k,
        collection: 'jobs',
      };
    } catch (error) {
      app.log.error({ err: error as any }, 'Search jobs failed');
      return reply.status(500).send({ success: false, error: '搜索jobs失败' });
    }
  });

  // 搜索resumes集合
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

      // 只传递ChromaDB兼容的筛选条件
      const chromaFilter: any = {};
      if (parsedFilter.tagId) chromaFilter.tagId = parsedFilter.tagId;
      if (parsedFilter.jobId) chromaFilter.jobId = parsedFilter.jobId;
      if (parsedFilter.id) chromaFilter.id = parsedFilter.id;

      // 如果没有搜索条件，直接获取所有文档
      if (!query) {
        const results = await deps.vectorStore.getAllDocuments(
          k,
          chromaFilter,
          deps.config.vectorStore.resumesCollection,
        );

        return {
          success: true,
          results,
          total: results.length,
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
          const docTime = doc.metadata?.createdAt || doc.metadata?.timestamp;
          if (!docTime) return false; // 如果没有时间戳，不显示该文档

          const timestamp = typeof docTime === 'number' ? docTime : new Date(docTime).getTime();
          if (parsedFilter.timeFrom && timestamp < parsedFilter.timeFrom) return false;
          if (parsedFilter.timeTo && timestamp > parsedFilter.timeTo) return false;
          return true;
        });

        return {
          success: true,
          results: filtered,
          total: filtered.length,
          query: query,
          filter: parsedFilter,
          topK: k,
          collection: 'resumes',
        };
      }

      return {
        success: true,
        results: searchResults,
        total: searchResults.length,
        query: query,
        filter: parsedFilter,
        topK: k,
        collection: 'resumes',
      };
    } catch (error) {
      app.log.error({ err: error as any }, 'Search resumes failed');
      return reply.status(500).send({ success: false, error: '搜索resumes失败' });
    }
  });

  // 搜索questions集合
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

      // 只传递ChromaDB兼容的筛选条件
      const chromaFilter: any = {};
      if (parsedFilter.tagId) chromaFilter.tagId = parsedFilter.tagId;
      if (parsedFilter.jobId) chromaFilter.jobId = parsedFilter.jobId;
      if (parsedFilter.id) chromaFilter.id = parsedFilter.id;

      // 如果没有搜索条件，直接获取所有文档
      if (!query) {
        const results = await deps.vectorStore.getAllDocuments(
          k,
          chromaFilter,
          deps.config.vectorStore.questionsCollection,
        );

        return {
          success: true,
          results,
          total: results.length,
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
          const docTime = doc.metadata?.createdAt || doc.metadata?.timestamp;
          if (!docTime) return false; // 如果没有时间戳，不显示该文档

          const timestamp = typeof docTime === 'number' ? docTime : new Date(docTime).getTime();
          if (parsedFilter.timeFrom && timestamp < parsedFilter.timeFrom) return false;
          if (parsedFilter.timeTo && timestamp > parsedFilter.timeTo) return false;
          return true;
        });

        return {
          success: true,
          results: filtered,
          total: filtered.length,
          query: query,
          filter: parsedFilter,
          topK: k,
          collection: 'questions',
        };
      }

      return {
        success: true,
        results: searchResults,
        total: searchResults.length,
        query: query,
        filter: parsedFilter,
        topK: k,
        collection: 'questions',
      };
    } catch (error) {
      app.log.error({ err: error as any }, 'Search questions failed');
      return reply.status(500).send({ success: false, error: '搜索questions失败' });
    }
  });

  // 获取文档的关联信息
  app.get('/documents/:docId/related', async (req) => {
    const { docId } = (req as any).params as { docId: string };

    try {
      // 根据文档ID前缀判断应该从哪个集合中查找
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
        return { success: false, error: '文档不存在' };
      }

      const relatedData: any = {};

      // 根据文档类型获取关联信息
      if (doc.metadata.type === 'jobs') {
        // 岗位信息：获取对应的简历和押题
        // 岗位的ID就是jobId，所以用docId来查找关联的简历和押题
        const jobId = docId;

        // 获取简历信息
        const resumes = await deps.vectorStore.getAllDocuments(
          1000,
          { jobId: jobId },
          deps.config.vectorStore.resumesCollection,
        );
        relatedData.resumes = resumes;

        // 获取押题信息
        const questions = await deps.vectorStore.getAllDocuments(
          1000,
          { jobId: jobId },
          deps.config.vectorStore.questionsCollection,
        );
        relatedData.questions = questions;

        // 岗位本身作为jobs返回
        relatedData.jobs = [doc];
      } else if (doc.metadata.type === 'resumes') {
        // 简历信息：获取对应的岗位和押题
        if (doc.metadata.jobId) {
          // 获取岗位信息
          const jobs = await deps.vectorStore.getAllDocuments(
            1000,
            { id: doc.metadata.jobId },
            deps.config.vectorStore.jobsCollection,
          );
          relatedData.jobs = jobs;

          // 获取押题信息
          const questions = await deps.vectorStore.getAllDocuments(
            1000,
            { jobId: doc.metadata.jobId },
            deps.config.vectorStore.questionsCollection,
          );
          relatedData.questions = questions;
        }

        // 简历本身作为resumes返回
        relatedData.resumes = [doc];
      } else if (doc.metadata.type === 'questions') {
        // 押题信息：获取对应的岗位和简历
        if (doc.metadata.jobId) {
          // 获取岗位信息
          const jobs = await deps.vectorStore.getAllDocuments(
            1000,
            { id: doc.metadata.jobId },
            deps.config.vectorStore.jobsCollection,
          );
          relatedData.jobs = jobs;

          // 获取简历信息
          const resumes = await deps.vectorStore.getAllDocuments(
            1000,
            { jobId: doc.metadata.jobId },
            deps.config.vectorStore.resumesCollection,
          );
          relatedData.resumes = resumes;
        }

        // 押题本身作为questions返回
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
      return { success: false, error: '获取关联信息失败' };
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
        message: `向量库清理完成，共删除 ${totalDeleted} 条数据`,
        totalDeleted,
        results,
      };
    } catch (error: any) {
      app.log.error({ err: error as any }, 'Failed to clean vector database');
      return { success: false, error: '清理向量库失败：' + error.message };
    }
  });
}
