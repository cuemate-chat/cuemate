/**
 * 面试数据管理服务
 * 负责面试过程中的所有数据库操作和状态同步
 */

import { CreateReviewData, interviewService } from '../services/InterviewService';

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

// 面试问答状态追踪（仅用于前端状态管理）
export interface QuestionState {
  reviewId?: string;
  sequence: number;
  phase: 'question_generated' | 'completed';
  question: string;
  referenceAnswer?: string;
  userAnswer?: string;
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
  private dataState: InterviewDataState | null = null;

  /**
   * 初始化面试数据状态
   */
  initializeInterview(interviewId: string, totalQuestions: number): void {
    this.dataState = {
      interviewId,
      questions: new Map(),
      currentSequence: 0,
      totalQuestions,
      startTime: Date.now(),
      isComplete: false,
    };
  }

  /**
   * 创建问题记录（AI 提问阶段）
   * 只创建最基本的记录，其他字段后续一次性 UPDATE
   */
  async createQuestionRecord(sequence: number, askedQuestion: string): Promise<string> {
    if (!this.dataState) {
      throw new Error('Interview data state not initialized');
    }

    const reviewData: CreateReviewData = {
      interview_id: this.dataState.interviewId,
      note_type: 'interview_qa',
      content: askedQuestion,
      asked_question: askedQuestion,
    };

    const result = await interviewService.createReview(reviewData);
    const reviewId = result.id;

    // 更新本地状态
    const questionState: QuestionState = {
      reviewId,
      sequence,
      phase: 'question_generated',
      question: askedQuestion,
    };

    this.dataState.questions.set(sequence, questionState);
    this.dataState.currentSequence = sequence;

    return reviewId;
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
    }

    console.debug(`Marked question ${sequence} as completed`);
  }

  /**
   * 获取当前问题状态
   */
  getQuestionState(sequence: number): QuestionState | undefined {
    return this.dataState?.questions.get(sequence);
  }

  /**
   * 获取所有问题状态
   */
  getAllQuestionStates(): QuestionState[] {
    if (!this.dataState) return [];
    return Array.from(this.dataState.questions.values());
  }

  /**
   * 标记面试完成
   */
  markInterviewComplete(): void {
    if (this.dataState) {
      this.dataState.isComplete = true;
      this.dataState.endTime = Date.now();
    }
  }

  /**
   * 获取面试数据状态
   */
  getInterviewDataState(): InterviewDataState | null {
    return this.dataState;
  }

  /**
   * 重置面试数据状态
   */
  resetInterviewDataState(): void {
    this.dataState = null;
  }
}

export const interviewDataService = new InterviewDataService();
