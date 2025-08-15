import type { FastifyInstance } from 'fastify';
import { DocumentProcessor } from '../processors/document-processor.js';
import { EmbeddingService } from '../services/embedding-service.js';
import { VectorStore } from '../stores/vector-store.js';

export async function createRoutes(
  app: FastifyInstance,
  deps: {
    vectorStore: VectorStore;
    documentProcessor: DocumentProcessor;
    embeddingService: EmbeddingService;
  },
) {
  app.post('/ingest', async (req) => {
    const body = (req as any).body as { content: string; metadata?: Record<string, any> };
    const chunks = await deps.documentProcessor.splitText(body.content);
    const embeddings = await deps.embeddingService.embed(chunks);
    await deps.vectorStore.addDocuments(
      chunks.map((content, i) => ({
        content,
        metadata: body.metadata || {},
        embedding: embeddings[i],
      })),
    );
    return { ok: true };
  });

  // 批量写入（已分好块并带 metadata）
  app.post('/ingest/batch', async (req) => {
    const body = (req as any).body as {
      items: Array<{ id?: string; content: string; metadata: Record<string, any> }>;
    };
    const texts = body.items.map((i) => i.content);
    const embeddings = await deps.embeddingService.embed(texts);
    await deps.vectorStore.addDocuments(
      body.items.map((it, i) => ({
        id: it.id,
        content: it.content,
        metadata: it.metadata,
        embedding: embeddings[i],
      })),
    );
    return { ok: true, count: body.items.length };
  });

  // 通过过滤条件删除（如按 jobId/resumeId/questionId）
  app.post('/delete/by-filter', async (req) => {
    const body = (req as any).body as { where: Record<string, any> };
    await deps.vectorStore.deleteByFilter(body.where);
    return { ok: true };
  });

  app.get('/search', async (req) => {
    const { q, topK } = req.query as any as { q: string; topK?: number };
    const results = await deps.vectorStore.search(q, topK || 5);
    return { results };
  });
}
