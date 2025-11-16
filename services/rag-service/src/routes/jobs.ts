import { FastifyInstance } from 'fastify';
import { Config } from '../config/index.js';
import { JobResumeService } from '../services/job-resume-service.js';

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
      return { success: true, message: '岗位和简历数据已成功处理并存入向量数据库' };
    } catch (error) {
      app.log.error({ err: error as any }, 'Failed to process job and resume');
      return { success: false, error: '处理失败' };
    }
  });

  // 删除岗位相关的所有向量数据
  app.delete('/jobs/:jobId', async (req) => {
    const { jobId } = (req as any).params as { jobId: string };

    try {
      await jobResumeService.deleteJobData(jobId);
      return { success: true, message: '岗位相关数据已从向量数据库中删除' };
    } catch (error) {
      app.log.error({ err: error as any }, 'Failed to delete job data');
      return { success: false, error: '删除失败' };
    }
  });

  // 搜索相关的岗位和简历信息
  app.get('/jobs/search', async (req) => {
    const { query, userId, topK, jobTitle } = (req as any).query as {
      query: string;
      userId?: string;
      topK?: string;
      jobTitle?: string;
    };

    try {
      const results = await jobResumeService.searchJobResume(
        query,
        userId,
        topK ? parseInt(topK) : 10,
        jobTitle,
      );
      return { success: true, results, total: results.length };
    } catch (error) {
      app.log.error({ err: error as any }, 'Search failed');
      return { success: false, error: '搜索失败' };
    }
  });

  // 搜索简历信息
  app.get('/resumes/search', async (req) => {
    const { query, userId, topK, jobTitle, tagId } = (req as any).query as {
      query: string;
      userId?: string;
      topK?: string;
      jobTitle?: string;
      tagId?: string;
    };

    try {
      const results = await jobResumeService.searchResumes(
        query,
        userId,
        topK ? parseInt(topK) : 10,
        jobTitle,
        tagId,
      );
      return { success: true, results, total: results.length };
    } catch (error) {
      app.log.error({ err: error as any }, 'Resume search failed');
      return { success: false, error: '搜索失败' };
    }
  });
}
