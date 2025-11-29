import { ChromaClient } from 'chromadb';
import { v4 as uuidv4 } from 'uuid';
import { Config } from '../config/index.js';
import { EmbeddingService } from '../services/embedding-service.js';
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
  private embeddingService: EmbeddingService;

  constructor(config: Config['vectorStore'], embeddingService: EmbeddingService) {
    this.config = config;
    this.embeddingService = embeddingService;
  }

  async initialize(): Promise<void> {
    try {
      if (this.config.type === 'chroma') {
        // 使用新的连接方式，兼容 Chroma 1.1.0 服务器
        const url = new URL(this.config.chromaPath);
        this.client = new ChromaClient({
          host: url.hostname,
          port: parseInt(url.port) || 8000,
          ssl: url.protocol === 'https:',
        });

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

      // 先尝试获取已存在的 collection
      try {
        const collection = await clientAny.getCollection({ name });
        this.collections.set(name, collection);
        return collection;
      } catch (getError: any) {
        // Collection 不存在，创建新的并使用 cosine 距离
        // ChromaDB 可能返回不同的错误信息：
        // - "does not exist"
        // - "The requested resource could not be found"
        // - status 404
        if (
          getError.message?.includes('does not exist') ||
          getError.message?.includes('could not be found') ||
          getError.status === 404 ||
          getError.name === 'ChromaNotFoundError'
        ) {
          const collection = await clientAny.createCollection({
            name,
            metadata: {
              created_at: new Date().toISOString(),
              'hnsw:space': 'cosine',
            },
          });
          this.collections.set(name, collection);
          logger.info(`Created new collection ${name} with cosine distance`);
          return collection;
        }
        throw getError;
      }
    } catch (error) {
      logger.error({ err: error as any }, `Failed to get/create collection ${name}`);
      throw error;
    }
  }

  /** 计算字符覆盖率：统计 query 中非空白字符在文本中能匹配到的比例（可重复匹配） */
  private calcCharOverlap(query: string, text: string): number {
    const q = (query || '').toLowerCase();
    const t = (text || '').toLowerCase();
    const queryChars = q.split('').filter((ch) => !/\s/.test(ch));
    if (queryChars.length === 0) return 0;

    const charToCount: Record<string, number> = {};
    for (const ch of t) {
      if (/\s/.test(ch)) continue;
      charToCount[ch] = (charToCount[ch] || 0) + 1;
    }

    let matchedChars = 0;
    for (const ch of queryChars) {
      if (charToCount[ch] && charToCount[ch] > 0) {
        matchedChars++;
        charToCount[ch] = charToCount[ch] - 1;
      }
    }

    return matchedChars / queryChars.length; // 0~1
  }

  /**
   * 最终分数计算：
   * - FastEmbed + Cosine 距离：similarity = 1 - distance（范围 0-1，1 表示完全相同）
   * - Hash 兜底：使用 max(向量相似度, 字符覆盖率)
   */
  private calcFinalScore(query: string, text: string, distance: number): number {
    // Cosine 距离转相似度：similarity = 1 - distance
    // distance = 0 表示完全相同，distance = 1 表示完全不同
    const vectorSim = 1 - (typeof distance === 'number' ? distance : 0);

    // 如果使用 FastEmbed，直接返回向量相似度
    if (this.embeddingService.isUsingFastEmbed()) {
      return vectorSim;
    }

    // Hash 兜底方案：结合字符覆盖率
    const overlap = this.calcCharOverlap(query, text);
    return Math.max(vectorSim, overlap);
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

  /**
   * Add documents with idempotency check
   * If document with same ID exists, skip it; otherwise, insert it.
   * This prevents duplicate insertions without overwriting existing data.
   */
  async addDocumentsIdempotent(documents: Document[], collectionName?: string): Promise<string[]> {
    const collection = await this.getOrCreateCollection(
      collectionName || this.config.defaultCollection,
    );

    const ids = documents.map((doc) => doc.id || uuidv4());

    try {
      // Check which IDs already exist
      const existingResult = await (collection as any).get({ ids });
      const existingIds = new Set(existingResult?.ids || []);

      // Filter out documents that already exist
      const newDocuments = documents.filter((_, index) => !existingIds.has(ids[index]));
      const newIds = newDocuments.map((doc) => doc.id || uuidv4());

      if (newDocuments.length === 0) {
        logger.info(`All ${documents.length} documents already exist, skipping`);
        return ids;
      }

      logger.info(
        `Adding ${newDocuments.length} new documents (${documents.length - newDocuments.length} already exist)`,
      );

      const contents = newDocuments.map((doc) => doc.content);
      const metadatas = newDocuments.map((doc) => doc.metadata);
      const embeddings = newDocuments.filter((doc) => doc.embedding).map((doc) => doc.embedding!);

      if (embeddings.length > 0 && embeddings.length === newDocuments.length) {
        await (collection as any).add({
          ids: newIds,
          documents: contents,
          metadatas,
          embeddings,
        });
      } else if (embeddings.length === 0) {
        await (collection as any).add({
          ids: newIds,
          documents: contents,
          metadatas,
        });
      } else {
        // Partial embeddings - only add documents with embeddings
        const validDocs = newDocuments.filter((doc) => doc.embedding);
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
        }
      }

      logger.info(`Successfully added ${newDocuments.length} documents`);
      return ids;
    } catch (error) {
      logger.error({ err: error as any }, 'Failed to add documents idempotently');
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
    _query?: string,
  ): Promise<SearchResult[]> {
    const collection = await this.getOrCreateCollection(
      collectionName || this.config.defaultCollection,
    );

    try {
      // 如果没有传入向量，直接返回空结果，避免误报 100%相关度
      if (!embedding || embedding.length === 0) {
        return [];
      }

      // 获取集合中的文档总数
      const count = await (collection as any).count();

      // 使用较小值作为 n_results 参数
      const n_results = Math.min(topK, count);

      // Chroma v2：使用 include 数组声明需要的字段
      const queryParams: any = {
        queryEmbeddings: [embedding],
        nResults: n_results,
        include: ['documents', 'metadatas', 'distances'],
      };

      // ChromaDB 1.1.0+ 要求 where 参数有至少一个操作符，空对象会报错
      if (filter && Object.keys(filter).length > 0) {
        queryParams.where = filter;
      }

      const results: any = await (collection as any).query(queryParams);

      if (!results.documents || !results.documents[0]) {
        // 未命中则返回空结果
        return [];
      }

      const queryText = _query || '';
      const searchResults = (results.documents[0] as string[]).map((doc: string, i: number) => {
        const distance = results.distances ? results.distances[0][i] : 0;
        const text = doc || '';
        const score = this.calcFinalScore(queryText, text, distance);

        return {
          id: results.ids[0][i],
          content: text,
          metadata: results.metadatas[0][i] || {},
          score,
        };
      });

      return (
        searchResults
          // 只过滤掉 0 分，任一字符命中或向量命中都会保留
          .filter((result: SearchResult) => result.score > 0)
          .sort((a, b) => b.score - a.score)
      );
    } catch (error) {
      logger.error({ err: error as any }, 'Embedding search failed');
      // 出错时返回空结果，避免误导性的满分
      return [];
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
      } else if (filter && Object.keys(filter).length > 0) {
        // ChromaDB 1.1.0+ 要求 where 参数有至少一个操作符，空对象会报错
        await (collection as any).delete({ where: filter });
        logger.info(`Deleted documents by filter from ${collectionName}`);
      } else {
        // 空过滤器，不执行删除操作
        logger.warn('Empty filter provided for deleteByFilter, no documents deleted');
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
      // 使用 get 方法获取文档。若包含 id，则优先用 ids 精确获取
      let results: any;
      if (filter && (filter as any).id) {
        results = await (collection as any).get({
          ids: [(filter as any).id],
        });
      } else {
        // Chroma v2 要求 limit 为数字，query 参数可能传入字符串，这里统一规范化
        const normalizedLimit =
          typeof topK === 'number' ? topK : parseInt(String(topK), 10) || 1000;

        const getParams: any = {
          limit: normalizedLimit,
        };

        if (filter && Object.keys(filter).length > 0) {
          getParams.where = filter;
        }

        results = await (collection as any).get(getParams);
      }

      if (!results.documents || results.documents.length === 0) {
        return [];
      }

      return results.documents.map((doc: string, i: number) => {
        const content = doc || '';
        const metadata = results.metadatas[i] || {};

        // 如果没有查询词，返回相关度为 1
        return {
          id: results.ids[i],
          content,
          metadata,
          score: 1,
        };
      });
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
