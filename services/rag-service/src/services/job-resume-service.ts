import { Config } from '../config/index.js';
import { DocumentProcessor } from '../processors/document-processor.js';
import { VectorStore } from '../stores/vector-store.js';
import { t } from '../utils/i18n.js';
import { createModuleLogger } from '../utils/logger.js';
import { EmbeddingService } from './embedding-service.js';

const log = createModuleLogger('JobResumeService');

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
  file_path?: string; // 简历文件路径
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
      // Split job info into chunks
      const jobContent = `${t('label.jobTitle')}：${job.title}\n\n ${t('label.jobDescription')}：${job.description}`;
      const chunks = await this.documentProcessor.splitText(jobContent);

      // 生成向量嵌入
      const embeddings = await this.embeddingService.embed(chunks);

      // 调试日志
      log.info('processJob', `Job ${job.id}: Generated ${chunks.length} chunks, ${embeddings.length} embeddings`);
      if (embeddings.length > 0) {
        log.info('processJob', `First embedding dimensions: ${embeddings[0].length}`);
        log.debug('processJob', `First embedding sample: [${embeddings[0].slice(0, 5).join(', ')}...]`);
      }

      // 准备文档数据
      const documents = chunks.map((content, index) => ({
        id: chunks.length === 1 ? `job:${job.id}` : `job:${job.id}:chunk:${index}`,
        content,
        metadata: {
          type: 'jobs',
          job_id: job.id,
          user_id: job.user_id,
          title: job.title,
          chunk_index: index,
          total_chunks: chunks.length,
          created_at: job.created_at,
          source: 'job_description',
        },
        embedding: embeddings[index],
      }));

      // 存入向量数据库
      await this.vectorStore.addDocuments(documents, this.config.vectorStore.jobsCollection);

      log.info('processJob', `Processed job ${job.id} into ${chunks.length} chunks`);
    } catch (error) {
      log.error('processJob', `Failed to process job ${job.id}`, {}, error);
      throw error;
    }
  }

  /**
   * 处理简历信息并存入向量数据库
   */
  async processResume(resume: ResumeData): Promise<void> {
    try {
      // Split resume content into chunks
      const resumeContent = `${t('label.resumeTitle')}：${resume.title}\n\n ${t('label.resumeContent')}：${resume.content}`;
      const chunks = await this.documentProcessor.splitText(resumeContent);

      // 生成向量嵌入
      const embeddings = await this.embeddingService.embed(chunks);

      // 调试日志
      log.info('processResume', `Resume ${resume.id}: Generated ${chunks.length} chunks, ${embeddings.length} embeddings`);
      if (embeddings.length > 0) {
        log.info('processResume', `First embedding dimensions: ${embeddings[0].length}`);
        log.debug('processResume', `First embedding sample: [${embeddings[0].slice(0, 5).join(', ')}...]`);
      }

      // 准备文档数据
      const documents = chunks.map((content, index) => ({
        id: chunks.length === 1 ? `resume:${resume.id}` : `resume:${resume.id}:chunk:${index}`,
        content,
        metadata: {
          type: 'resumes',
          job_id: resume.job_id,
          user_id: resume.user_id,
          title: resume.title,
          file_path: resume.file_path || '', // 如果 undefined 则赋值为空字符串
          chunk_index: index,
          total_chunks: chunks.length,
          created_at: resume.created_at,
          source: 'resume_content',
        },
        embedding: embeddings[index],
      }));

      // 存入向量数据库
      await this.vectorStore.addDocuments(documents, this.config.vectorStore.resumesCollection);

      log.info('processResume', `Processed resume ${resume.id} into ${chunks.length} chunks`);
    } catch (error) {
      log.error('processResume', `Failed to process resume ${resume.id}`, {}, error);
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

      log.info('processJobAndResume', `Successfully processed job ${job.id} and resume ${resume.id}`);
    } catch (error) {
      log.error('processJobAndResume', `Failed to process job ${job.id} and resume ${resume.id}`, {}, error);
      throw error;
    }
  }

  /**
   * 删除岗位相关的所有向量数据
   */
  async deleteJobData(jobId: string): Promise<void> {
    try {
      // 删除岗位相关的所有数据
      await this.vectorStore.deleteByFilter({ job_id: jobId }, this.config.vectorStore.jobsCollection);
      await this.vectorStore.deleteByFilter({ job_id: jobId }, this.config.vectorStore.resumesCollection);
      await this.vectorStore.deleteByFilter({ job_id: jobId }, this.config.vectorStore.questionsCollection);

      log.info('deleteJobData', `Deleted all vector data (jobs, resumes, questions) for job ${jobId}`);
    } catch (error) {
      log.error('deleteJobData', `Failed to delete job data for ${jobId}`, {}, error);
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
      log.error('searchJobResume', 'Search failed', {}, error);
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
        filter.tag_id = tagId;
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
      log.error('searchResumes', 'Resume search failed', {}, error);
      throw error;
    }
  }
}
