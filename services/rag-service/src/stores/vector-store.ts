import { ChromaClient, Collection } from 'chromadb';
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
        this.client = new ChromaClient({
          path: this.config.chromaPath,
        });
        
        // 获取或创建默认集合
        await this.getOrCreateCollection(this.config.defaultCollection);
        
        logger.info('Vector store initialized');
      } else {
        throw new Error(`Vector store type ${this.config.type} not implemented`);
      }
    } catch (error) {
      logger.error('Failed to initialize vector store:', error);
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
      const collection = await this.client.getOrCreateCollection({
        name,
        metadata: { created_at: new Date().toISOString() },
      });
      
      this.collections.set(name, collection);
      return collection;
    } catch (error) {
      logger.error(`Failed to get/create collection ${name}:`, error);
      throw error;
    }
  }

  async addDocuments(
    documents: Document[],
    collectionName?: string
  ): Promise<string[]> {
    const collection = await this.getOrCreateCollection(
      collectionName || this.config.defaultCollection
    );

    const ids = documents.map(doc => doc.id || uuidv4());
    const contents = documents.map(doc => doc.content);
    const metadatas = documents.map(doc => doc.metadata);
    const embeddings = documents
      .filter(doc => doc.embedding)
      .map(doc => doc.embedding!);

    try {
      if (embeddings.length > 0) {
        await collection.add({
          ids,
          documents: contents,
          metadatas,
          embeddings,
        });
      } else {
        await collection.add({
          ids,
          documents: contents,
          metadatas,
        });
      }

      logger.info(`Added ${documents.length} documents to ${collectionName}`);
      return ids;
    } catch (error) {
      logger.error('Failed to add documents:', error);
      throw error;
    }
  }

  async search(
    query: string,
    topK: number = 5,
    filter?: Record<string, any>,
    collectionName?: string
  ): Promise<SearchResult[]> {
    const collection = await this.getOrCreateCollection(
      collectionName || this.config.defaultCollection
    );

    try {
      const results = await collection.query({
        queryTexts: [query],
        nResults: topK,
        where: filter,
      });

      if (!results.documents[0]) {
        return [];
      }

      return results.documents[0].map((doc, i) => ({
        id: results.ids[0][i],
        content: doc || '',
        metadata: results.metadatas[0][i] || {},
        score: results.distances ? 1 - results.distances[0][i] : 1,
      }));
    } catch (error) {
      logger.error('Search failed:', error);
      throw error;
    }
  }

  async searchByEmbedding(
    embedding: number[],
    topK: number = 5,
    filter?: Record<string, any>,
    collectionName?: string
  ): Promise<SearchResult[]> {
    const collection = await this.getOrCreateCollection(
      collectionName || this.config.defaultCollection
    );

    try {
      const results = await collection.query({
        queryEmbeddings: [embedding],
        nResults: topK,
        where: filter,
      });

      if (!results.documents[0]) {
        return [];
      }

      return results.documents[0].map((doc, i) => ({
        id: results.ids[0][i],
        content: doc || '',
        metadata: results.metadatas[0][i] || {},
        score: results.distances ? 1 - results.distances[0][i] : 1,
      }));
    } catch (error) {
      logger.error('Embedding search failed:', error);
      throw error;
    }
  }

  async deleteDocuments(
    ids: string[],
    collectionName?: string
  ): Promise<void> {
    const collection = await this.getOrCreateCollection(
      collectionName || this.config.defaultCollection
    );

    try {
      await collection.delete({ ids });
      logger.info(`Deleted ${ids.length} documents from ${collectionName}`);
    } catch (error) {
      logger.error('Failed to delete documents:', error);
      throw error;
    }
  }

  async updateDocument(
    id: string,
    document: Partial<Document>,
    collectionName?: string
  ): Promise<void> {
    const collection = await this.getOrCreateCollection(
      collectionName || this.config.defaultCollection
    );

    try {
      await collection.update({
        ids: [id],
        documents: document.content ? [document.content] : undefined,
        metadatas: document.metadata ? [document.metadata] : undefined,
        embeddings: document.embedding ? [document.embedding] : undefined,
      });
      logger.info(`Updated document ${id} in ${collectionName}`);
    } catch (error) {
      logger.error('Failed to update document:', error);
      throw error;
    }
  }

  async listCollections(): Promise<string[]> {
    if (!this.client) {
      throw new Error('Vector store not initialized');
    }

    try {
      const collections = await this.client.listCollections();
      return collections.map(c => c.name);
    } catch (error) {
      logger.error('Failed to list collections:', error);
      throw error;
    }
  }

  async deleteCollection(name: string): Promise<void> {
    if (!this.client) {
      throw new Error('Vector store not initialized');
    }

    try {
      await this.client.deleteCollection({ name });
      this.collections.delete(name);
      logger.info(`Deleted collection ${name}`);
    } catch (error) {
      logger.error(`Failed to delete collection ${name}:`, error);
      throw error;
    }
  }

  async getCollectionStats(name?: string): Promise<any> {
    const collection = await this.getOrCreateCollection(
      name || this.config.defaultCollection
    );

    try {
      const count = await collection.count();
      return {
        name: name || this.config.defaultCollection,
        documentCount: count,
      };
    } catch (error) {
      logger.error('Failed to get collection stats:', error);
      throw error;
    }
  }
}

