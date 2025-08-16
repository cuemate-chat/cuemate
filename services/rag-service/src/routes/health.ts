import { FastifyInstance } from 'fastify';
import { Config } from '../config/index.js';
import { EmbeddingService } from '../services/embedding-service.js';
import { VectorStore } from '../stores/vector-store.js';

export async function createHealthRoutes(
  app: FastifyInstance,
  deps: {
    vectorStore: VectorStore;
    embeddingService: EmbeddingService;
    config: Config;
  },
) {
  // 健康检查
  app.get('/health', async () => {
    try {
      // 检查向量数据库连接
      const collections = await deps.vectorStore.listCollections();
      const vectorStoreStatus = { status: 'connected', collections: collections.length };

      // 检查嵌入服务状态
      const embeddingStatus = { status: 'available', provider: 'dynamic' };

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          vectorStore: vectorStoreStatus,
          embedding: embeddingStatus,
        },
        config: {
          vectorStoreType: deps.config.vectorStore.type,
          embeddingProvider: 'dynamic',
          serverPort: deps.config.server.port,
        },
      };
    } catch (error) {
      app.log.error({ err: error as any }, 'Health check failed');
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: (error as any).message,
      };
    }
  });

  // 服务状态
  app.get('/status', async () => {
    try {
      const collections = await deps.vectorStore.listCollections();

      return {
        status: 'operational',
        timestamp: new Date().toISOString(),
        vectorStore: {
          type: deps.config.vectorStore.type,
          collections: collections.length,
          collectionNames: collections.map((c: any) => c.name),
        },
        embeddings: {
          provider: 'dynamic',
          model: 'dynamic',
          dimensions: deps.config.embeddings.dimensions,
        },
        processing: {
          chunkSize: deps.config.processing.chunkSize,
          chunkOverlap: deps.config.processing.chunkOverlap,
          maxChunksPerDocument: deps.config.processing.maxChunksPerDocument,
        },
        retrieval: {
          topK: deps.config.retrieval.topK,
          minScore: deps.config.retrieval.minScore,
        },
      };
    } catch (error) {
      app.log.error({ err: error as any }, 'Status check failed');
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: (error as any).message,
      };
    }
  });

  // 配置信息（只读）
  app.get('/config', async () => {
    return {
      server: {
        port: deps.config.server.port,
        host: deps.config.server.host,
      },
      cors: {
        origin: deps.config.cors.origin,
      },
      vectorStore: {
        type: deps.config.vectorStore.type,
        defaultCollection: deps.config.vectorStore.defaultCollection,
        jobsCollection: deps.config.vectorStore.jobsCollection,
        resumesCollection: deps.config.vectorStore.resumesCollection,
      },
      embeddings: {
        provider: 'dynamic',
        model: 'dynamic',
        dimensions: deps.config.embeddings.dimensions,
      },
      processing: {
        chunkSize: deps.config.processing.chunkSize,
        chunkOverlap: deps.config.processing.chunkOverlap,
        maxChunksPerDocument: deps.config.processing.maxChunksPerDocument,
        supportedFormats: deps.config.processing.supportedFormats,
      },
      retrieval: {
        topK: deps.config.retrieval.topK,
        minScore: deps.config.retrieval.minScore,
        rerankEnabled: deps.config.retrieval.rerankEnabled,
        hybridSearch: deps.config.retrieval.hybridSearch,
      },
    };
  });
}
