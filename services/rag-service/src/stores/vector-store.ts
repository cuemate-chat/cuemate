import { ChromaClient } from 'chromadb';
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
  private client: any = null;
  private collections: Map<string, any> = new Map();
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

  async getOrCreateCollection(name: string): Promise<any> {
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
      logger.info(
        `Adding ${documents.length} documents to collection ${collectionName || this.config.defaultCollection}`,
      );
      logger.info(`Document IDs: ${ids.join(', ')}`);
      logger.info(
        `Has embeddings: ${embeddings.length > 0}, Embedding dimensions: ${embeddings.length > 0 ? embeddings[0]?.length : 'N/A'}`,
      );

      if (embeddings.length > 0 && embeddings.length === documents.length) {
        // 所有文档都有嵌入向量
        await (collection as any).add({
          ids,
          documents: contents,
          metadatas,
          embeddings,
        });
      } else if (embeddings.length === 0) {
        // 没有嵌入向量，使用 ChromaDB 的默认嵌入函数
        await (collection as any).add({
          ids,
          documents: contents,
          metadatas,
        });
      } else {
        // 部分文档有嵌入向量，这种情况不应该发生，记录警告
        logger.warn(
          `Partial embeddings detected: ${embeddings.length}/${documents.length} documents have embeddings`,
        );
        // 移除没有嵌入向量的文档，只添加有嵌入向量的
        const validDocs = documents.filter((doc) => doc.embedding);
        const validIds = validDocs.map((doc) => doc.id || uuidv4());
        const validContents = validDocs.map((doc) => doc.content);
        const validMetadatas = validDocs.map((doc) => doc.metadata);
        const validEmbeddings = validDocs.map((doc) => doc.embedding!);

        if (validDocs.length > 0) {
          await (collection as any).add({
            ids: validIds,
            documents: validContents,
            metadatas: validMetadatas,
            embeddings: validEmbeddings,
          });
          logger.info(`Added ${validDocs.length} documents with embeddings`);
        }
      }

      logger.info(
        `Successfully added ${documents.length} documents to ${collectionName || this.config.defaultCollection}`,
      );
      return ids;
    } catch (error) {
      logger.error({ err: error as any }, 'Failed to add documents');
      logger.error(`Collection: ${collectionName || this.config.defaultCollection}`);
      logger.error(`Documents count: ${documents.length}`);
      logger.error(`Embeddings count: ${embeddings.length}`);
      throw error;
    }
  }

  async search(
    _query: string,
    _topK: number = 5,
    _filter?: Record<string, any>,
    _collectionName?: string,
  ): Promise<SearchResult[]> {
    // 这个方法需要外部传入嵌入向量，不能直接使用 queryTexts
    throw new Error('Use searchByEmbedding instead of search for text queries');
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

  async deleteByFilter(filter: Record<string, any>, collectionName?: string): Promise<void> {
    const collection = await this.getOrCreateCollection(
      collectionName || this.config.defaultCollection,
    );

    try {
      // 如果过滤条件是 ID，直接使用 ids 删除
      if (filter.id) {
        await (collection as any).delete({ ids: [filter.id] });
        logger.info(`Deleted document with ID ${filter.id} from ${collectionName}`);
      } else {
        // 否则使用 where 条件删除
        await (collection as any).delete({ where: filter });
        logger.info(`Deleted documents by filter from ${collectionName}`);
      }
    } catch (error) {
      logger.error({ err: error as any }, 'Failed to delete by filter');
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

  async getAllDocuments(
    topK: number = 1000,
    filter?: Record<string, any>,
    collectionName?: string,
  ): Promise<SearchResult[]> {
    const collection = await this.getOrCreateCollection(
      collectionName || this.config.defaultCollection,
    );

    try {
      // 使用 get 方法获取所有文档，避免嵌入函数问题
      const results: any = await (collection as any).get({
        limit: topK,
        where: filter,
      });

      if (!results.documents || results.documents.length === 0) {
        return [];
      }

      return results.documents.map((doc: string, i: number) => ({
        id: results.ids[i],
        content: doc || '',
        metadata: results.metadatas[i] || {},
        score: 1, // 默认相关度为1，因为没有查询
      }));
    } catch (error) {
      logger.error({ err: error as any }, 'Get all documents failed');
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
