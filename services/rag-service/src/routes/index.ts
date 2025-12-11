import type { FastifyInstance } from 'fastify';
import { Config } from '../config/index.js';
import { DocumentProcessor } from '../processors/document-processor.js';
import { EmbeddingService } from '../services/embedding-service.js';
import { VectorStore } from '../stores/vector-store.js';

// 导入各个功能模块的路由
import { createDocumentRoutes } from './documents.js';
import { createHealthRoutes } from './health.js';
import { createJobRoutes } from './jobs.js';
import { createQuestionRoutes } from './questions.js';
import { createAIVectorRecordsRoutes } from './ai-vector-records.js';

export async function createRoutes(
  app: FastifyInstance,
  deps: {
    documentProcessor: DocumentProcessor;
    embeddingService: EmbeddingService;
    vectorStore: VectorStore;
    config: Config;
  },
) {
  // 注册各个功能模块的路由
  await createDocumentRoutes(app, deps);
  await createJobRoutes(app, deps);
  await createQuestionRoutes(app, deps);
  await createAIVectorRecordsRoutes(app, deps);
  await createHealthRoutes(app, deps);

  // Root path info
  app.get('/', async () => {
    return {
      service: 'CueMate RAG Service',
      version: '1.0.0',
      description: 'Vector database and retrieval-augmented generation service',
      endpoints: {
        documents:
          '/ingest, /ingest/batch, /delete/by-filter, /search/jobs, /search/resumes, /search/questions',
        jobs: '/jobs/process, /jobs/:jobId, /jobs/search',
        questions:
          '/questions/process, /questions/:questionId, /questions/search, /questions/by-job/:jobId, /questions/by-tag/:tagId',
        health: '/health, /status, /config',
      },
      documentation: 'Refer to the implementation of each endpoint',
    };
  });
}
