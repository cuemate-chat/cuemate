import { Config } from '../config/index.js';
import { DocumentProcessor } from '../processors/document-processor.js';
import { VectorStore } from '../stores/vector-store.js';
import { logger } from '../utils/logger.js';
import { EmbeddingService } from './embedding-service.js';

export interface JobData {
  id: string;
  title: string;
  description: string;
  user_id: string; // 与数据库字段名保持一致
  created_at: number; // 与数据库字段名保持一致
}

export interface ResumeData {
  id: string;
  title: string;
  content: string;
  job_id: string; // 与数据库字段名保持一致
  user_id: string; // 与数据库字段名保持一致
  created_at: number; // 与数据库字段名保持一致
}

export class JobResumeService {
  constructor(
    private documentProcessor: DocumentProcessor,
    private embeddingService: EmbeddingService,
    private vectorStore: VectorStore,
    private config: Config,
  ) {}

  /**
   * 处理岗位信息并存入向量数据库
   */
  async processJob(job: JobData): Promise<void> {
    try {
      // 将岗位信息分块
      const jobContent = `岗位名称：${job.title}\n\n岗位描述：${job.description}`;
      const chunks = await this.documentProcessor.splitText(jobContent);

      // 生成向量嵌入
      const embeddings = await this.embeddingService.embed(chunks);

      // 调试日志
      logger.info(
        `Job ${job.id}: Generated ${chunks.length} chunks, ${embeddings.length} embeddings`,
      );
      if (embeddings.length > 0) {
        logger.info(`First embedding dimensions: ${embeddings[0].length}`);
        logger.info(`First embedding sample: [${embeddings[0].slice(0, 5).join(', ')}...]`);
      }

      // 准备文档数据
      const documents = chunks.map((content, index) => ({
        id: chunks.length === 1 ? `job:${job.id}` : `job:${job.id}:chunk:${index}`,
        content,
        metadata: {
          type: 'jobs',
          jobId: job.id,
          userId: job.user_id,
          title: job.title,
          chunkIndex: index,
          totalChunks: chunks.length,
          createdAt: job.created_at,
          source: 'job_description',
        },
        embedding: embeddings[index],
      }));

      // 存入向量数据库
      await this.vectorStore.addDocuments(documents, this.config.vectorStore.jobsCollection);

      logger.info(`Processed job ${job.id} into ${chunks.length} chunks`);
    } catch (error) {
      logger.error({ err: error as any }, `Failed to process job ${job.id}`);
      throw error;
    }
  }

  /**
   * 处理简历信息并存入向量数据库
   */
  async processResume(resume: ResumeData): Promise<void> {
    try {
      // 将简历内容分块
      const resumeContent = `简历标题：${resume.title}\n\n简历内容：${resume.content}`;
      const chunks = await this.documentProcessor.splitText(resumeContent);

      // 生成向量嵌入
      const embeddings = await this.embeddingService.embed(chunks);

      // 调试日志
      logger.info(
        `Resume ${resume.id}: Generated ${chunks.length} chunks, ${embeddings.length} embeddings`,
      );
      if (embeddings.length > 0) {
        logger.info(`First embedding dimensions: ${embeddings[0].length}`);
        logger.info(`First embedding sample: [${embeddings[0].slice(0, 5).join(', ')}...]`);
      }

      // 准备文档数据
      const documents = chunks.map((content, index) => ({
        id: chunks.length === 1 ? `resume:${resume.id}` : `resume:${resume.id}:chunk:${index}`,
        content,
        metadata: {
          type: 'resumes',
          jobId: resume.job_id,
          userId: resume.user_id,
          title: resume.title,
          chunkIndex: index,
          totalChunks: chunks.length,
          createdAt: resume.created_at,
          source: 'resume_content',
        },
        embedding: embeddings[index],
      }));

      // 存入向量数据库
      await this.vectorStore.addDocuments(documents, this.config.vectorStore.resumesCollection);

      logger.info(`Processed resume ${resume.id} into ${chunks.length} chunks`);
    } catch (error) {
      logger.error({ err: error as any }, `Failed to process resume ${resume.id}`);
      throw error;
    }
  }

  /**
   * 批量处理岗位和简历
   */
  async processJobAndResume(job: JobData, resume: ResumeData): Promise<void> {
    try {
      // 并行处理岗位和简历
      await Promise.all([this.processJob(job), this.processResume(resume)]);

      logger.info(`Successfully processed job ${job.id} and resume ${resume.id}`);
    } catch (error) {
      logger.error(
        { err: error as any },
        `Failed to process job ${job.id} and resume ${resume.id}`,
      );
      throw error;
    }
  }

  /**
   * 删除岗位相关的所有向量数据
   */
  async deleteJobData(jobId: string): Promise<void> {
    try {
      // 删除岗位相关的所有数据
      await this.vectorStore.deleteByFilter({ jobId }, this.config.vectorStore.jobsCollection);
      await this.vectorStore.deleteByFilter({ jobId }, this.config.vectorStore.resumesCollection);
      await this.vectorStore.deleteByFilter({ jobId }, this.config.vectorStore.questionsCollection);

      logger.info(`Deleted all vector data (jobs, resumes, questions) for job ${jobId}`);
    } catch (error) {
      logger.error({ err: error as any }, `Failed to delete job data for ${jobId}`);
      throw error;
    }
  }

  /**
   * 搜索相关的岗位和简历信息
   */
  async searchJobResume(
    query: string,
    userId?: string,
    topK: number = 10,
    jobTitle?: string,
  ): Promise<any[]> {
    try {
      const filter: Record<string, any> = {};
      if (userId) {
        filter.user_id = userId;
      }
      if (jobTitle) {
        filter.title = jobTitle;
      }

      // 生成查询的向量嵌入
      const queryEmbedding = await this.embeddingService.embed([query]);

      // 搜索岗位信息
      const jobResults = await this.vectorStore.searchByEmbedding(
        queryEmbedding[0],
        topK,
        filter,
        this.config.vectorStore.jobsCollection,
      );

      // 搜索简历信息
      const resumeResults = await this.vectorStore.searchByEmbedding(
        queryEmbedding[0],
        topK,
        filter,
        this.config.vectorStore.resumesCollection,
      );

      // 合并结果并按相关性排序
      const allResults = [...jobResults, ...resumeResults];
      allResults.sort((a, b) => b.score - a.score);

      return allResults.slice(0, topK);
    } catch (error) {
      logger.error({ err: error as any }, 'Search failed');
      throw error;
    }
  }

  /**
   * 搜索简历信息
   */
  async searchResumes(
    query: string,
    userId?: string,
    topK: number = 10,
    jobTitle?: string,
    tagId?: string,
  ): Promise<any[]> {
    try {
      const filter: Record<string, any> = {};
      if (userId) {
        filter.user_id = userId;
      }
      if (jobTitle) {
        filter.title = jobTitle;
      }
      if (tagId) {
        filter.tagId = tagId;
      }

      // 生成查询的向量嵌入
      const queryEmbedding = await this.embeddingService.embed([query]);

      // 搜索简历信息
      const resumeResults = await this.vectorStore.searchByEmbedding(
        queryEmbedding[0],
        topK,
        filter,
        this.config.vectorStore.resumesCollection,
      );

      return resumeResults;
    } catch (error) {
      logger.error({ err: error as any }, 'Resume search failed');
      throw error;
    }
  }
}
