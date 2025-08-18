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

  // 搜索文档
  app.get('/search', async (req) => {
    const { query, filter, topK, collection } = (req as any).query as {
      query: string;
      filter?: string;
      topK?: string;
      collection?: string;
    };

    try {
      const parsedFilter = filter ? JSON.parse(filter) : {};
      const k = topK ? parseInt(topK) : deps.config.retrieval.topK;
      const targetCollection = collection || deps.config.vectorStore.defaultCollection;

      // 如果查询为空，返回所有文档
      if (!query || query.trim() === '') {
        let allResults: any[] = [];

        // 如果没有指定集合，查询所有主要集合
        if (!collection) {
          const collections = [
            deps.config.vectorStore.defaultCollection,
            deps.config.vectorStore.jobsCollection,
            deps.config.vectorStore.resumesCollection,
            deps.config.vectorStore.questionsCollection,
          ];

          // 并行查询所有集合
          const collectionResults = await Promise.all(
            collections.map(async (colName) => {
              try {
                return await deps.vectorStore.getAllDocuments(k, parsedFilter, colName);
              } catch (error) {
                app.log.warn(`Failed to query collection ${colName}:`, error as any);
                return [];
              }
            }),
          );

          // 合并所有结果
          allResults = collectionResults.flat();
        } else {
          // 查询指定集合
          allResults = await deps.vectorStore.getAllDocuments(k, parsedFilter, targetCollection);
        }

        return {
          success: true,
          results: allResults,
          total: allResults.length,
          query: '',
          filter: parsedFilter,
          topK: k,
          collection: targetCollection,
        };
      }

      // 生成查询的嵌入向量
      const queryEmbedding = await deps.embeddingService.embed([query]);

      // 如果没有指定集合，在所有主要集合中搜索
      if (!collection) {
        const collections = [
          deps.config.vectorStore.defaultCollection,
          deps.config.vectorStore.jobsCollection,
          deps.config.vectorStore.resumesCollection,
          deps.config.vectorStore.questionsCollection,
        ];

        // 并行在所有集合中搜索
        const collectionResults = await Promise.all(
          collections.map(async (colName) => {
            try {
              return await deps.vectorStore.searchByEmbedding(
                queryEmbedding[0],
                k,
                parsedFilter,
                colName,
              );
            } catch (error) {
              app.log.warn(`Failed to search in collection ${colName}:`, error as any);
              return [];
            }
          }),
        );

        // 合并所有结果并按相关性排序
        const allResults = collectionResults.flat();
        allResults.sort((a, b) => b.score - a.score);

        return {
          success: true,
          results: allResults.slice(0, k),
          total: allResults.length,
          query,
          filter: parsedFilter,
          topK: k,
          collection: 'all',
        };
      } else {
        // 在指定集合中搜索
        const results = await deps.vectorStore.searchByEmbedding(
          queryEmbedding[0],
          k,
          parsedFilter,
          targetCollection,
        );

        return {
          success: true,
          results,
          total: results.length,
          query,
          filter: parsedFilter,
          topK: k,
          collection: targetCollection,
        };
      }
    } catch (error) {
      app.log.error({ err: error as any }, 'Search failed');
      return { success: false, error: '搜索失败' };
    }
  });
}
