import { ChromaClient, type Collection } from 'chromadb';
import { v4 as uuidv4 } from 'uuid';
import { Config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export interface Document {
  id?: string;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
}

export interface SearchResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  score: number;
}

export class VectorStore {
  private client: ChromaClient | null = null;
  private collections: Map<string, Collection> = new Map();
  private config: Config['vectorStore'];

  constructor(config: Config['vectorStore']) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      if (this.config.type === 'chroma') {
        this.client = new ChromaClient({ path: this.config.chromaPath });

        // 获取或创建默认集合
        await this.getOrCreateCollection(this.config.defaultCollection);

        logger.info('Vector store initialized');
      } else {
        throw new Error(`Vector store type ${this.config.type} not implemented`);
      }
    } catch (error) {
      logger.error({ err: error as any }, 'Failed to initialize vector store');
      throw error;
    }
  }

  async getOrCreateCollection(name: string): Promise<Collection> {
    if (!this.client) {
      throw new Error('Vector store not initialized');
    }

    if (this.collections.has(name)) {
      return this.collections.get(name)!;
    }

    try {
      const clientAny = this.client as any;
      const collection = await clientAny.getOrCreateCollection({
        name,
        metadata: { created_at: new Date().toISOString() },
      });

      this.collections.set(name, collection);
      return collection;
    } catch (error) {
      logger.error({ err: error as any }, `Failed to get/create collection ${name}`);
      throw error;
    }
  }

  async addDocuments(documents: Document[], collectionName?: string): Promise<string[]> {
    const collection = await this.getOrCreateCollection(
      collectionName || this.config.defaultCollection,
    );

    const ids = documents.map((doc) => doc.id || uuidv4());
    const contents = documents.map((doc) => doc.content);
    const metadatas = documents.map((doc) => doc.metadata);
    const embeddings = documents.filter((doc) => doc.embedding).map((doc) => doc.embedding!);

    try {
      if (embeddings.length > 0) {
        await (collection as any).add({
          ids,
          documents: contents,
          metadatas,
          embeddings,
        });
      } else {
        await (collection as any).add({
          ids,
          documents: contents,
          metadatas,
        });
      }

      logger.info(`Added ${documents.length} documents to ${collectionName}`);
      return ids;
    } catch (error) {
      logger.error({ err: error as any }, 'Failed to add documents');
      throw error;
    }
  }

  async search(
    query: string,
    topK: number = 5,
    filter?: Record<string, any>,
    collectionName?: string,
  ): Promise<SearchResult[]> {
    const collection = await this.getOrCreateCollection(
      collectionName || this.config.defaultCollection,
    );

    try {
      const results: any = await (collection as any).query({
        queryTexts: [query],
        nResults: topK,
        where: filter,
      });

      if (!results.documents[0]) {
        return [];
      }

      return (results.documents[0] as string[]).map((doc: string, i: number) => ({
        id: results.ids[0][i],
        content: doc || '',
        metadata: results.metadatas[0][i] || {},
        score: results.distances ? 1 - results.distances[0][i] : 1,
      }));
    } catch (error) {
      logger.error({ err: error as any }, 'Search failed');
      throw error;
    }
  }

  async searchByEmbedding(
    embedding: number[],
    topK: number = 5,
    filter?: Record<string, any>,
    collectionName?: string,
  ): Promise<SearchResult[]> {
    const collection = await this.getOrCreateCollection(
      collectionName || this.config.defaultCollection,
    );

    try {
      const results: any = await (collection as any).query({
        queryEmbeddings: [embedding],
        nResults: topK,
        where: filter,
      });

      if (!results.documents[0]) {
        return [];
      }

      return (results.documents[0] as string[]).map((doc: string, i: number) => ({
        id: results.ids[0][i],
        content: doc || '',
        metadata: results.metadatas[0][i] || {},
        score: results.distances ? 1 - results.distances[0][i] : 1,
      }));
    } catch (error) {
      logger.error({ err: error as any }, 'Embedding search failed');
      throw error;
    }
  }

  async deleteDocuments(ids: string[], collectionName?: string): Promise<void> {
    const collection = await this.getOrCreateCollection(
      collectionName || this.config.defaultCollection,
    );

    try {
      await (collection as any).delete({ ids });
      logger.info(`Deleted ${ids.length} documents from ${collectionName}`);
    } catch (error) {
      logger.error({ err: error as any }, 'Failed to delete documents');
      throw error;
    }
  }

  async updateDocument(
    id: string,
    document: Partial<Document>,
    collectionName?: string,
  ): Promise<void> {
    const collection = await this.getOrCreateCollection(
      collectionName || this.config.defaultCollection,
    );

    try {
      await (collection as any).update({
        ids: [id],
        documents: document.content ? [document.content] : undefined,
        metadatas: document.metadata ? [document.metadata] : undefined,
        embeddings: document.embedding ? [document.embedding] : undefined,
      });
      logger.info(`Updated document ${id} in ${collectionName}`);
    } catch (error) {
      logger.error({ err: error as any }, 'Failed to update document');
      throw error;
    }
  }

  async listCollections(): Promise<string[]> {
    if (!this.client) {
      throw new Error('Vector store not initialized');
    }

    try {
      const clientAny = this.client as any;
      const collections: any[] = await clientAny.listCollections();
      return collections.map((c: any) => (typeof c === 'string' ? c : c.name));
    } catch (error) {
      logger.error({ err: error as any }, 'Failed to list collections');
      throw error;
    }
  }

  async deleteCollection(name: string): Promise<void> {
    if (!this.client) {
      throw new Error('Vector store not initialized');
    }

    try {
      const clientAny = this.client as any;
      await clientAny.deleteCollection({ name });
      this.collections.delete(name);
      logger.info(`Deleted collection ${name}`);
    } catch (error) {
      logger.error({ err: error as any }, `Failed to delete collection ${name}`);
      throw error;
    }
  }

  async getCollectionStats(name?: string): Promise<any> {
    const collection = await this.getOrCreateCollection(name || this.config.defaultCollection);

    try {
      const count = await (collection as any).count();
      return {
        name: name || this.config.defaultCollection,
        documentCount: count,
      };
    } catch (error) {
      logger.error({ err: error as any }, 'Failed to get collection stats');
      throw error;
    }
  }
}
