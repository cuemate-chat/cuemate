/**
 * 面试管理服务
 * 处理面试相关的 API 调用
 */

import { createLogger } from '../../../utils/rendererLogger.js';

const log = createLogger('InterviewService');

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
  answerMode?: 'manual' | 'auto';
  microphoneDeviceId?: string;
  speakerDeviceId?: string;
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
  answerMode?: 'manual' | 'auto';
  microphoneDeviceId?: string;
  speakerDeviceId?: string;
}

// 面试详情返回类型
export interface InterviewDetail {
  id: string;
  jobId: string;
  startedAt: number;
  endedAt?: number;
  selectedModelId?: string;
  jobTitle: string;
  jobContent: string;
  questionCount: number;
  resumesId?: string;
  resumesTitle?: string;
  resumesContent?: string;
  duration?: number;
  interviewType: 'mock' | 'training';
  status: InterviewStatus;
  message?: string;
  interviewState?: string;
  locale?: string;
  timezone?: string;
  theme?: string;
  answerMode?: 'manual' | 'auto';
  microphoneDeviceId?: string;
  speakerDeviceId?: string;
}

export interface InterviewQuestion {
  id: string;
  questionId?: string;
  question?: string;
  answer?: string;
  askedQuestion?: string;
  candidateAnswer?: string;
  keyPoints?: string;
  assessment?: string;
  referenceAnswer?: string;
  pros?: string;
  cons?: string;
  suggestions?: string;
  createdAt: number;
}

export interface InterviewSummary {
  totalScore?: number;
  durationSec?: number;
  numQuestions?: number;
  overallSummary?: string;
  pros?: string;
  cons?: string;
  suggestions?: string;
  radarInteractivity?: number;
  radarConfidence?: number;
  radarProfessionalism?: number;
  radarRelevance?: number;
  radarClarity?: number;
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
      await log.error('initAuth', '初始化面试服务认证失败', {}, error);
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

    const url = `${this.baseURL}/interviews/${interviewId}`;

    try {
      await log.http.request('getInterview', url, 'GET');

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const errorText = await response.text();
        await log.http.error('getInterview', url, new Error(`HTTP ${response.status}`), { interviewId }, errorText);
        throw new Error(`获取面试详情失败: ${response.status}`);
      }

      const result = await response.json();
      await log.http.response('getInterview', url, response.status, result);
      return result;
    } catch (error) {
      await log.http.error('getInterview', url, error, { interviewId });
      return null;
    }
  }

  /**
   * 创建面试
   */
  async createInterview(data: InterviewData): Promise<CreateInterviewResponse> {
    await this.ensureAuth();

    const url = `${this.baseURL}/interviews`;

    try {
      await log.http.request('createInterview', url, 'POST', data);

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        await log.http.error('createInterview', url, new Error(`HTTP ${response.status}`), data, errorText);
        throw new Error(`创建面试失败: ${response.status}`);
      }

      const result = await response.json();
      await log.http.response('createInterview', url, response.status, result);
      return result;
    } catch (error) {
      await log.http.error('createInterview', url, error, data);
      throw error;
    }
  }

  /**
   * 更新面试信息
   */
  async updateInterview(interviewId: string, data: UpdateInterviewData): Promise<void> {
    await this.ensureAuth();

    const url = `${this.baseURL}/interviews/${interviewId}`;

    try {
      await log.http.request('updateInterview', url, 'PUT', data);

      const response = await fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        await log.http.error('updateInterview', url, new Error(`HTTP ${response.status}`), data, errorText);
        throw new Error(`更新面试失败: ${response.status}`);
      }

      await log.http.response('updateInterview', url, response.status);
    } catch (error) {
      await log.http.error('updateInterview', url, error, data);
      throw error;
    }
  }

  /**
   * 结束面试
   */
  async endInterview(interviewId: string): Promise<void> {
    await this.ensureAuth();

    const url = `${this.baseURL}/interviews/${interviewId}/end`;

    try {
      await log.http.request('endInterview', url, 'POST', { interviewId });

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorText = await response.text();
        await log.http.error('endInterview', url, new Error(`HTTP ${response.status}`), { interviewId }, errorText);
        throw new Error(`结束面试失败: ${response.status}`);
      }

      await log.http.response('endInterview', url, response.status);
    } catch (error) {
      await log.http.error('endInterview', url, error, { interviewId });
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

    const url = `${this.baseURL}/interview-scores`;

    try {
      await log.http.request('saveInterviewScore', url, 'POST', data);

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        await log.http.error('saveInterviewScore', url, new Error(`HTTP ${response.status}`), data, errorText);
        throw new Error(`保存面试评分失败: ${response.status}`);
      }

      await log.http.response('saveInterviewScore', url, response.status);
    } catch (error) {
      await log.http.error('saveInterviewScore', url, error, data);
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

    const url = `${this.baseURL}/interview-insights`;

    try {
      await log.http.request('saveInterviewInsight', url, 'POST', data);

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        await log.http.error('saveInterviewInsight', url, new Error(`HTTP ${response.status}`), data, errorText);
        throw new Error(`保存面试洞察失败: ${response.status}`);
      }

      await log.http.response('saveInterviewInsight', url, response.status);
    } catch (error) {
      await log.http.error('saveInterviewInsight', url, error, data);
      throw error;
    }
  }

}

export const interviewService = new InterviewService();