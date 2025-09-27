/**
 * 面试数据管理服务
 * 负责面试过程中的所有数据库操作和状态同步
 */

import { mockInterviewService, CreateReviewData, UpdateReviewData } from '../services/MockInterviewService';

// 面试分数接口
export interface InterviewScore {
  id?: string;
  interview_id: string;
  total_score: number;
  duration_sec: number;
  num_questions: number;
  overall_summary?: string;
  created_at: number;
  pros?: string;
  cons?: string;
  suggestions?: string;
  radar_interactivity?: number;
  radar_confidence?: number;
  radar_professionalism?: number;
  radar_relevance?: number;
  radar_clarity?: number;
}

// 面试洞察接口
export interface InterviewInsight {
  id?: string;
  interview_id: string;
  interviewer_score?: number;
  interviewer_summary?: string;
  interviewer_role?: string;
  interviewer_mbti?: string;
  interviewer_personality?: string;
  interviewer_preference?: string;
  candidate_summary?: string;
  candidate_mbti?: string;
  candidate_personality?: string;
  candidate_job_preference?: string;
  strategy_prepare_details?: string;
  strategy_business_understanding?: string;
  strategy_keep_logical?: string;
  created_at: number;
}

// 面试问答状态追踪
export interface QuestionState {
  reviewId?: string;
  sequence: number;
  phase: 'question_generated' | 'answer_generated' | 'user_answered' | 'analyzed' | 'completed';
  question: string;
  referenceAnswer?: string;
  userAnswer?: string;
  analysis?: {
    pros: string;
    cons: string;
    suggestions: string;
    keyPoints: string;
    assessment: string;
  };
  createdAt: number;
  updatedAt: number;
}

// 面试数据状态
export interface InterviewDataState {
  interviewId: string;
  questions: Map<number, QuestionState>;
  currentSequence: number;
  totalQuestions: number;
  startTime: number;
  endTime?: number;
  isComplete: boolean;
}

export class InterviewDataService {
  private baseURL = 'http://localhost:3001';
  private token: string | null = null;
  private dataState: InterviewDataState | null = null;

  constructor() {
    this.initAuth();
  }

  private async initAuth() {
    try {
      const api = (window as any).electronAPI || (window as any).electronInterviewerAPI;
      const result = await api?.getUserData?.();
      if (result?.success && result.userData?.token) {
        this.token = result.userData.token;
      }
    } catch (error) {
      console.error('初始化面试数据服务认证失败:', error);
    }
  }

  private async ensureAuth() {
    if (!this.token) {
      await this.initAuth();
    }
    if (!this.token) {
      throw new Error('用户未登录或token获取失败');
    }
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
    };
  }

  /**
   * 初始化面试数据状态
   */
  initializeInterview(interviewId: string, totalQuestions: number = 10): void {
    this.dataState = {
      interviewId,
      questions: new Map(),
      currentSequence: 0,
      totalQuestions,
      startTime: Date.now(),
      isComplete: false,
    };

    console.log(`Initialized interview data state for interview ${interviewId}`);
  }

  /**
   * 创建问题记录（AI提问阶段）
   */
  async createQuestionRecord(sequence: number, question: string): Promise<string> {
    if (!this.dataState) {
      throw new Error('Interview data state not initialized');
    }

    const reviewData: CreateReviewData = {
      interview_id: this.dataState.interviewId,
      note_type: 'interview_qa',
      content: question,
      asked_question: question,
    };

    const result = await mockInterviewService.createReview(reviewData);
    const reviewId = result.id;

    // 更新本地状态
    const questionState: QuestionState = {
      reviewId,
      sequence,
      phase: 'question_generated',
      question,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.dataState.questions.set(sequence, questionState);
    this.dataState.currentSequence = sequence;

    console.log(`Created question record ${reviewId} for sequence ${sequence}`);
    return reviewId;
  }

  /**
   * 更新参考答案（AI生成答案阶段）
   */
  async updateReferenceAnswer(sequence: number, answer: string, keyPoints?: string): Promise<void> {
    if (!this.dataState) {
      throw new Error('Interview data state not initialized');
    }

    const questionState = this.dataState.questions.get(sequence);
    if (!questionState || !questionState.reviewId) {
      throw new Error(`Question state not found for sequence ${sequence}`);
    }

    const updateData: UpdateReviewData = {
      answer,
      reference_answer: answer,
      key_points: keyPoints,
    };

    await mockInterviewService.updateReview(questionState.reviewId, updateData);

    // 更新本地状态
    questionState.phase = 'answer_generated';
    questionState.referenceAnswer = answer;
    questionState.updatedAt = Date.now();

    if (keyPoints) {
      questionState.analysis = {
        ...questionState.analysis,
        keyPoints,
      } as any;
    }

    console.log(`Updated reference answer for sequence ${sequence}`);
  }

  /**
   * 更新用户回答（用户回答阶段）
   */
  async updateUserAnswer(sequence: number, userAnswer: string): Promise<void> {
    if (!this.dataState) {
      throw new Error('Interview data state not initialized');
    }

    const questionState = this.dataState.questions.get(sequence);
    if (!questionState || !questionState.reviewId) {
      throw new Error(`Question state not found for sequence ${sequence}`);
    }

    const updateData: UpdateReviewData = {
      candidate_answer: userAnswer,
    };

    await mockInterviewService.updateReview(questionState.reviewId, updateData);

    // 更新本地状态
    questionState.phase = 'user_answered';
    questionState.userAnswer = userAnswer;
    questionState.updatedAt = Date.now();

    console.log(`Updated user answer for sequence ${sequence}`);
  }

  /**
   * 更新AI分析结果（AI分析阶段）
   */
  async updateAnalysis(
    sequence: number,
    analysis: {
      pros: string;
      cons: string;
      suggestions: string;
      keyPoints?: string;
      assessment: string;
    }
  ): Promise<void> {
    if (!this.dataState) {
      throw new Error('Interview data state not initialized');
    }

    const questionState = this.dataState.questions.get(sequence);
    if (!questionState || !questionState.reviewId) {
      throw new Error(`Question state not found for sequence ${sequence}`);
    }

    const updateData: UpdateReviewData = {
      pros: analysis.pros,
      cons: analysis.cons,
      suggestions: analysis.suggestions,
      assessment: analysis.assessment,
    };

    if (analysis.keyPoints) {
      updateData.key_points = analysis.keyPoints;
    }

    await mockInterviewService.updateReview(questionState.reviewId, updateData);

    // 更新本地状态
    questionState.phase = 'analyzed';
    questionState.analysis = {
      pros: analysis.pros,
      cons: analysis.cons,
      suggestions: analysis.suggestions,
      keyPoints: analysis.keyPoints || '',
      assessment: analysis.assessment,
    };
    questionState.updatedAt = Date.now();

    console.log(`Updated analysis for sequence ${sequence}`);
  }

  /**
   * 标记问题完成
   */
  markQuestionComplete(sequence: number): void {
    if (!this.dataState) {
      throw new Error('Interview data state not initialized');
    }

    const questionState = this.dataState.questions.get(sequence);
    if (questionState) {
      questionState.phase = 'completed';
      questionState.updatedAt = Date.now();
    }

    console.log(`Marked question ${sequence} as completed`);
  }

  /**
   * 创建面试分数记录
   */
  async createInterviewScore(scoreData: Omit<InterviewScore, 'id' | 'created_at'>): Promise<string> {
    await this.ensureAuth();

    if (!this.dataState) {
      throw new Error('Interview data state not initialized');
    }

    try {
      const payload = {
        ...scoreData,
        created_at: Date.now(),
      };

      const response = await fetch(`${this.baseURL}/interview-scores`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`创建面试分数失败: ${response.status}`);
      }

      const result = await response.json();
      console.log(`Created interview score record: ${result.id}`);
      return result.id;
    } catch (error) {
      console.error('创建面试分数失败:', error);
      throw error;
    }
  }

  /**
   * 创建面试洞察记录
   */
  async createInterviewInsight(insightData: Omit<InterviewInsight, 'id' | 'created_at'>): Promise<string> {
    await this.ensureAuth();

    if (!this.dataState) {
      throw new Error('Interview data state not initialized');
    }

    try {
      const payload = {
        ...insightData,
        created_at: Date.now(),
      };

      const response = await fetch(`${this.baseURL}/interview-insights`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`创建面试洞察失败: ${response.status}`);
      }

      const result = await response.json();
      console.log(`Created interview insight record: ${result.id}`);
      return result.id;
    } catch (error) {
      console.error('创建面试洞察失败:', error);
      throw error;
    }
  }

  /**
   * 结束面试并标记完成
   */
  finishInterview(): void {
    if (!this.dataState) {
      throw new Error('Interview data state not initialized');
    }

    this.dataState.endTime = Date.now();
    this.dataState.isComplete = true;

    console.log(`Interview ${this.dataState.interviewId} finished`);
  }

  /**
   * 获取面试统计信息
   */
  getInterviewStats(): {
    duration: number;
    totalQuestions: number;
    completedQuestions: number;
    questionsWithAnalysis: number;
    averageResponseTime: number;
  } | null {
    if (!this.dataState) {
      return null;
    }

    const now = this.dataState.endTime || Date.now();
    const duration = Math.floor((now - this.dataState.startTime) / 1000);

    let completedQuestions = 0;
    let questionsWithAnalysis = 0;
    let totalResponseTime = 0;
    let responseTimes: number[] = [];

    for (const question of this.dataState.questions.values()) {
      if (question.phase === 'completed' || question.phase === 'analyzed') {
        completedQuestions++;
      }
      if (question.analysis) {
        questionsWithAnalysis++;
      }

      // 计算回答时间（如果有用户回答）
      if (question.userAnswer && question.createdAt) {
        const responseTime = question.updatedAt - question.createdAt;
        responseTimes.push(responseTime);
        totalResponseTime += responseTime;
      }
    }

    const averageResponseTime = responseTimes.length > 0
      ? Math.floor(totalResponseTime / responseTimes.length / 1000)
      : 0;

    return {
      duration,
      totalQuestions: this.dataState.totalQuestions,
      completedQuestions,
      questionsWithAnalysis,
      averageResponseTime,
    };
  }

  /**
   * 获取问题状态
   */
  getQuestionState(sequence: number): QuestionState | null {
    if (!this.dataState) {
      return null;
    }
    return this.dataState.questions.get(sequence) || null;
  }

  /**
   * 获取所有问题状态
   */
  getAllQuestionStates(): QuestionState[] {
    if (!this.dataState) {
      return [];
    }
    return Array.from(this.dataState.questions.values()).sort((a, b) => a.sequence - b.sequence);
  }

  /**
   * 获取当前面试状态
   */
  getCurrentState(): InterviewDataState | null {
    return this.dataState ? { ...this.dataState } : null;
  }

  /**
   * 检查面试是否可以结束
   */
  canEndInterview(): boolean {
    if (!this.dataState) {
      return false;
    }

    // 检查是否已达到预定问题数量或所有问题都已完成
    const completedCount = Array.from(this.dataState.questions.values())
      .filter(q => q.phase === 'completed').length;

    return completedCount >= this.dataState.totalQuestions ||
           this.dataState.questions.size >= this.dataState.totalQuestions;
  }

  /**
   * 获取下一个问题序号
   */
  getNextSequence(): number {
    if (!this.dataState) {
      return 0;
    }
    return this.dataState.questions.size;
  }

  /**
   * 清理数据状态
   */
  cleanup(): void {
    this.dataState = null;
    console.log('Interview data service cleaned up');
  }

  /**
   * 导出面试数据（用于调试和备份）
   */
  exportInterviewData(): any {
    if (!this.dataState) {
      return null;
    }

    return {
      interviewId: this.dataState.interviewId,
      questions: Array.from(this.dataState.questions.entries()).map(([seq, state]) => ({
        sequenceNumber: seq,
        ...state,
      })),
      stats: this.getInterviewStats(),
      metadata: {
        totalQuestions: this.dataState.totalQuestions,
        startTime: this.dataState.startTime,
        endTime: this.dataState.endTime,
        isComplete: this.dataState.isComplete,
      },
    };
  }
}

export const interviewDataService = new InterviewDataService();