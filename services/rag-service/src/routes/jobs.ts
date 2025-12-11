import { FastifyInstance } from 'fastify';
import { Config } from '../config/index.js';
import { JobResumeService } from '../services/job-resume-service.js';
import { t } from '../utils/i18n.js';

export async function createJobRoutes(
  app: FastifyInstance,
  deps: {
    documentProcessor: any;
    embeddingService: any;
    vectorStore: any;
    config: Config;
  },
) {
  const jobResumeService = new JobResumeService(
    deps.documentProcessor,
    deps.embeddingService,
    deps.vectorStore,
    deps.config,
  );

  // 处理岗位和简历数据
  app.post('/jobs/process', async (req) => {
    const body = (req as any).body as {
      job: {
        id: string;
        title: string;
        description: string;
        user_id: string;
        created_at: number;
      };
      resume: {
        id: string;
        title: string;
        content: string;
        file_path?: string;
        job_id: string;
        user_id: string;
        created_at: number;
      };
    };

    try {
      await jobResumeService.processJobAndResume(body.job, body.resume);
      return { success: true, message: t('message.jobResumeProcessed') };
    } catch (error) {
      app.log.error({ err: error as any }, 'Failed to process job and resume');
      return { success: false, error: t('error.processFailed') };
    }
  });

  // 删除岗位相关的所有向量数据
  app.delete('/jobs/:jobId', async (req) => {
    const { jobId } = (req as any).params as { jobId: string };

    try {
      await jobResumeService.deleteJobData(jobId);
      return { success: true, message: t('message.jobDataDeleted') };
    } catch (error) {
      app.log.error({ err: error as any }, 'Failed to delete job data');
      return { success: false, error: t('error.deleteFailed') };
    }
  });

  // 搜索相关的岗位和简历信息
  app.get('/jobs/search', async (req) => {
    // hook 已将 camelCase 转换为 snake_case
    const { query, user_id, top_k, job_title } = (req as any).query as {
      query: string;
      user_id?: string;
      top_k?: string;
      job_title?: string;
    };

    try {
      const results = await jobResumeService.searchJobResume(
        query,
        user_id,
        top_k ? parseInt(top_k) : 10,
        job_title,
      );
      return { success: true, results, total: results.length };
    } catch (error) {
      app.log.error({ err: error as any }, 'Search failed');
      return { success: false, error: t('error.searchFailed') };
    }
  });

  // 搜索简历信息
  app.get('/resumes/search', async (req) => {
    // hook 已将 camelCase 转换为 snake_case
    const { query, user_id, top_k, job_title, tag_id } = (req as any).query as {
      query: string;
      user_id?: string;
      top_k?: string;
      job_title?: string;
      tag_id?: string;
    };

    try {
      const results = await jobResumeService.searchResumes(
        query,
        user_id,
        top_k ? parseInt(top_k) : 10,
        job_title,
        tag_id,
      );
      return { success: true, results, total: results.length };
    } catch (error) {
      app.log.error({ err: error as any }, 'Resume search failed');
      return { success: false, error: t('error.searchFailed') };
    }
  });
}
