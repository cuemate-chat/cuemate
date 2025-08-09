import type { FastifyInstance } from 'fastify';
import { VectorStore } from '../stores/vector-store.js';
import { DocumentProcessor } from '../processors/document-processor.js';
import { EmbeddingService } from '../services/embedding-service.js';

export async function createRoutes(
  app: FastifyInstance,
  deps: { vectorStore: VectorStore; documentProcessor: DocumentProcessor; embeddingService: EmbeddingService }
) {
  app.post('/ingest', async (req) => {
    const body = (req as any).body as { content: string; metadata?: Record<string, any> };
    const chunks = await deps.documentProcessor.splitText(body.content);
    const embeddings = await deps.embeddingService.embed(chunks);
    await deps.vectorStore.addDocuments(
      chunks.map((content, i) => ({ content, metadata: body.metadata || {}, embedding: embeddings[i] }))
    );
    return { ok: true };
  });

  app.get('/search', async (req) => {
    const { q, topK } = (req.query as any) as { q: string; topK?: number };
    const results = await deps.vectorStore.search(q, topK || 5);
    return { results };
  });
}


