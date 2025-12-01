/**
 * 面试管理服务
 * 处理面试相关的 API 调用
 */

import { logger } from '../../../utils/rendererLogger.js';

export type InterviewStatus =
  | 'idle'
  | 'mock-interview-recording'
  | 'mock-interview-paused'
  | 'mock-interview-completed'
  | 'mock-interview-playing'
  | 'mock-interview-expired'
  | 'mock-interview-error'
  | 'interview-training-recording'
  | 'interview-training-paused'
  | 'interview-training-completed'
  | 'interview-training-playing'
  | 'interview-training-expired'
  | 'interview-training-error';

export interface InterviewData {
  jobId: string;
  jobTitle?: string;
  jobContent?: string;
  questionCount?: number;
  resumesId?: string;
  resumesTitle?: string;
  resumesContent?: string;
  interviewType?: 'training' | 'mock';
  status?: InterviewStatus;
  message?: string;
  locale?: string;
  timezone?: string;
  theme?: string;
  selectedModelId?: string;
  interviewState?: string;
}

export interface CreateInterviewResponse {
  id: string;
}

export interface UpdateInterviewData {
  jobTitle?: string;
  jobContent?: string;
  questionCount?: number;
  resumesId?: string;
  resumesTitle?: string;
  resumesContent?: string;
  duration?: number;
  interviewType?: 'training' | 'mock';
  status?: InterviewStatus;
  message?: string;
  interviewState?: string;
}

// 面试详情返回类型
export interface InterviewDetail {
  id: string;
  job_id: string;
  started_at: number;
  ended_at?: number;
  selected_model_id?: string;
  job_title: string;
  job_content: string;
  question_count: number;
  resumes_id?: string;
  resumes_title?: string;
  resumes_content?: string;
  duration?: number;
  interview_type: 'mock' | 'training';
  status: InterviewStatus;
  message?: string;
  interview_state?: string;
  locale?: string;
  timezone?: string;
  theme?: string;
}

export interface InterviewQuestion {
  id: string;
  question_id?: string;
  question?: string;
  answer?: string;
  asked_question?: string;
  candidate_answer?: string;
  key_points?: string;
  assessment?: string;
  reference_answer?: string;
  pros?: string;
  cons?: string;
  suggestions?: string;
  created_at: number;
}

export interface InterviewSummary {
  total_score?: number;
  duration_sec?: number;
  num_questions?: number;
  overall_summary?: string;
  pros?: string;
  cons?: string;
  suggestions?: string;
  radar_interactivity?: number;
  radar_confidence?: number;
  radar_professionalism?: number;
  radar_relevance?: number;
  radar_clarity?: number;
}

export interface InterviewDetailResponse {
  interview: InterviewDetail;
  summary?: InterviewSummary;
  questions: InterviewQuestion[];
  insights?: any;
  advantages?: any[];
}

export class InterviewService {
  private baseURL = 'http://localhost:3001';
  private token: string | null = null;

  constructor() {
    this.initAuth();
  }

  private async initAuth() {
    try {
      // 支持多种 API 接口（interviewer 窗口使用 electronInterviewerAPI）
      const api = (window as any).electronAPI || (window as any).electronInterviewerAPI;
      const result = await api?.getUserData?.();
      if (result?.success && result.userData?.token) {
        this.token = result.userData.token;
      }
    } catch (error) {
      logger.error(`初始化面试服务认证失败: ${error}`);
    }
  }

  private async ensureAuth() {
    if (!this.token) {
      await this.initAuth();
    }
    if (!this.token) {
      throw new Error('用户未登录或 token 获取失败');
    }
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
    };
  }

  /**
   * 获取面试详情（完整数据，包含问答记录）
   */
  async getInterview(interviewId: string): Promise<InterviewDetailResponse | null> {
    await this.ensureAuth();

    try {
      const response = await fetch(`${this.baseURL}/interviews/${interviewId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`获取面试详情失败: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      logger.error(`获取面试详情失败: ${error}`);
      return null;
    }
  }

  /**
   * 创建面试
   */
  async createInterview(data: InterviewData): Promise<CreateInterviewResponse> {
    await this.ensureAuth();

    try {
      const response = await fetch(`${this.baseURL}/interviews`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`创建面试失败: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      logger.error(`创建面试失败: ${error}`);
      throw error;
    }
  }

  /**
   * 更新面试信息
   */
  async updateInterview(interviewId: string, data: UpdateInterviewData): Promise<void> {
    await this.ensureAuth();

    try {
      const response = await fetch(`${this.baseURL}/interviews/${interviewId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`更新面试失败: ${response.status}`);
      }
    } catch (error) {
      logger.error(`更新面试失败: ${error}`);
      throw error;
    }
  }

  /**
   * 结束面试
   */
  async endInterview(interviewId: string): Promise<void> {
    await this.ensureAuth();

    try {
      const response = await fetch(`${this.baseURL}/interviews/${interviewId}/end`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`结束面试失败: ${response.status}`);
      }
    } catch (error) {
      logger.error(`结束面试失败: ${error}`);
      throw error;
    }
  }

  /**
   * 保存面试评分
   */
  async saveInterviewScore(data: {
    interviewId: string;
    totalScore: number;
    durationSec: number;
    numQuestions: number;
    overallSummary?: string;
    pros?: string;
    cons?: string;
    suggestions?: string;
    radarInteractivity: number;
    radarConfidence: number;
    radarProfessionalism: number;
    radarRelevance: number;
    radarClarity: number;
  }): Promise<void> {
    await this.ensureAuth();

    try {
      const response = await fetch(`${this.baseURL}/interview-scores`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`保存面试评分失败: ${response.status}`);
      }
    } catch (error) {
      logger.error(`保存面试评分失败: ${error}`);
      throw error;
    }
  }

  /**
   * 保存面试洞察
   */
  async saveInterviewInsight(data: {
    interviewId: string;
    interviewerScore?: number;
    interviewerSummary?: string;
    interviewerRole?: string;
    interviewerMbti?: string;
    interviewerPersonality?: string;
    interviewerPreference?: string;
    candidateSummary?: string;
    candidateMbti?: string;
    candidatePersonality?: string;
    candidateJobPreference?: string;
    strategyPrepareDetails?: string;
    strategyBusinessUnderstanding?: string;
    strategyKeepLogical?: string;
  }): Promise<void> {
    await this.ensureAuth();

    try {
      const response = await fetch(`${this.baseURL}/interview-insights`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`保存面试洞察失败: ${response.status}`);
      }
    } catch (error) {
      logger.error(`保存面试洞察失败: ${error}`);
      throw error;
    }
  }

}

export const interviewService = new InterviewService();