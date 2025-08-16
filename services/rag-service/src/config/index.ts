import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  server: z.object({
    port: z.number().default(3003),
    host: z.string().default('0.0.0.0'),
  }),
  cors: z.object({
    origin: z.union([z.string(), z.array(z.string())]).default('*'),
  }),
  vectorStore: z.object({
    type: z.enum(['chroma', 'pgvector', 'milvus']).default('chroma'),
    // 注意：JS 客户端仅支持 HTTP API，不支持本地目录路径
    // 默认指向本机 8000 端口的 Chroma Server
    chromaPath: z.string().default('http://localhost:8000'),
    chromaHost: z.string().optional(),
    chromaPort: z.number().optional(),
    defaultCollection: z.string().default('default'),
    // 专门的集合名称
    jobsCollection: z.string().default('jobs'),
    resumesCollection: z.string().default('resumes'),
    questionsCollection: z.string().default('questions'),
  }),
  embeddings: z.object({
    provider: z.enum(['openai', 'local']).default('openai'),
    openaiApiKey: z.string().optional(),
    openaiModel: z.string().default('text-embedding-3-large'),
    dimensions: z.number().default(3072),
    localModelPath: z.string().optional(),
  }),
  processing: z.object({
    chunkSize: z.number().default(500),
    chunkOverlap: z.number().default(50),
    maxChunksPerDocument: z.number().default(1000),
    supportedFormats: z.array(z.string()).default(['pdf', 'txt', 'md', 'docx']),
  }),
  retrieval: z.object({
    topK: z.number().default(5),
    minScore: z.number().default(0.7),
    rerankEnabled: z.boolean().default(false),
    hybridSearch: z.boolean().default(false),
  }),
  privacy: z.object({
    redactPII: z.boolean().default(true),
    encryptAtRest: z.boolean().default(false),
    auditLogging: z.boolean().default(true),
  }),
});

export const config = configSchema.parse({
  server: {
    port: parseInt(process.env.RAG_PORT || '3003'),
    host: process.env.RAG_HOST || '0.0.0.0',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  vectorStore: {
    type: (process.env.VECTOR_STORE_TYPE as any) || 'chroma',
    chromaPath: process.env.CHROMA_PATH || 'http://localhost:8000',
    chromaHost: process.env.CHROMA_HOST,
    chromaPort: process.env.CHROMA_PORT ? parseInt(process.env.CHROMA_PORT) : undefined,
    defaultCollection: process.env.DEFAULT_COLLECTION || 'default',
    jobsCollection: process.env.JOBS_COLLECTION || 'jobs',
    resumesCollection: process.env.RESUMES_COLLECTION || 'resumes',
    questionsCollection: process.env.QUESTIONS_COLLECTION || 'questions',
  },
  embeddings: {
    provider: (process.env.EMBEDDINGS_PROVIDER as any) || 'openai',
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large',
    dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '3072'),
    localModelPath: process.env.LOCAL_MODEL_PATH,
  },
  processing: {
    chunkSize: parseInt(process.env.CHUNK_SIZE || '500'),
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '50'),
    maxChunksPerDocument: parseInt(process.env.MAX_CHUNKS_PER_DOC || '1000'),
    supportedFormats: process.env.SUPPORTED_FORMATS?.split(',') || ['pdf', 'txt', 'md', 'docx'],
  },
  retrieval: {
    topK: parseInt(process.env.TOP_K || '5'),
    minScore: parseFloat(process.env.MIN_SCORE || '0.7'),
    rerankEnabled: process.env.RERANK_ENABLED === 'true',
    hybridSearch: process.env.HYBRID_SEARCH === 'true',
  },
  privacy: {
    redactPII: process.env.REDACT_PII !== 'false',
    encryptAtRest: process.env.ENCRYPT_AT_REST === 'true',
    auditLogging: process.env.AUDIT_LOGGING !== 'false',
  },
});

export type Config = z.infer<typeof configSchema>;
