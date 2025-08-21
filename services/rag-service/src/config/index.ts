import { z } from 'zod';

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
    dimensions: z.number().default(1536), // 默认维度，实际从数据库动态获取
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

// 使用简化配置，所有设置使用默认值
export const config = configSchema.parse({
  server: {
    port: 3003,
    host: '0.0.0.0',
  },
  cors: {
    origin: '*',
  },
  vectorStore: {
    type: 'chroma',
    // 在 Docker 环境中使用 chroma:8000，本地开发使用 localhost:8000
    chromaPath: process.env.NODE_ENV === 'production' ? 'http://chroma:8000' : 'http://localhost:8000',
    defaultCollection: 'default',
    jobsCollection: 'jobs',
    resumesCollection: 'resumes',
    questionsCollection: 'questions',
  },
  embeddings: {
    dimensions: 1536,
  },
  processing: {
    chunkSize: 500,
    chunkOverlap: 50,
    maxChunksPerDocument: 1000,
    supportedFormats: ['pdf', 'txt', 'md', 'docx'],
  },
  retrieval: {
    topK: 5,
    minScore: 0.7,
    rerankEnabled: false,
    hybridSearch: false,
  },
  privacy: {
    redactPII: true,
    encryptAtRest: false,
    auditLogging: true,
  },
});

export type Config = z.infer<typeof configSchema>;