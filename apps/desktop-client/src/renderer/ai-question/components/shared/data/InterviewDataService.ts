/**
 * 面试数据管理服务
 * 负责面试过程中的所有数据库操作和状态同步
 */

import { createLogger } from '../../../../../utils/rendererLogger.js';
import { CreateReviewData, interviewService } from '../services/InterviewService';

const log = createLogger('InterviewDataService');

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
  startedAt?: number; // 问题开始时间（毫秒）
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
   * 从数据库查询指定 interview 的所有 reviews，检查是否存在指定 sequence 的记录
   * 用于幂等性保护，避免暂停/恢复后重复创建记录
   */
  async findExistingReviewBySequence(interviewId: string, sequence: number): Promise<{ reviewId: string; question: string } | null> {
    try {
      const reviews = await interviewService.getInterviewReviews(interviewId);
      // 按创建时间排序，sequence 对应创建顺序（第 0 个问题是第一个创建的 review）
      const sortedReviews = reviews.sort((a, b) => a.created_at - b.created_at);

      if (sequence < sortedReviews.length) {
        const review = sortedReviews[sequence];
        return {
          reviewId: review.id || '',
          question: review.asked_question || review.content || '',
        };
      }
      return null;
    } catch (error) {
      log.warn('findExistingReviewBySequence', '查询已存在 review 失败', undefined, error?.toString());
      return null;
    }
  }

  /**
   * 创建问题记录（AI 提问阶段）
   * 只创建最基本的记录，其他字段后续一次性 UPDATE
   *
   * 幂等性保护：先查询数据库检查是否已存在，避免重复创建
   */
  async createQuestionRecord(sequence: number, askedQuestion: string): Promise<string> {
    if (!this.dataState) {
      throw new Error('Interview data state not initialized');
    }

    // 幂等性检查：先查数据库，看该 sequence 是否已有记录
    const existing = await this.findExistingReviewBySequence(this.dataState.interviewId, sequence);
    if (existing && existing.reviewId) {
      // 已存在，更新本地状态并返回现有 ID
      const questionState: QuestionState = {
        reviewId: existing.reviewId,
        sequence,
        phase: 'question_generated',
        question: existing.question,
        startedAt: Date.now(),
      };
      this.dataState.questions.set(sequence, questionState);
      this.dataState.currentSequence = sequence;

      log.debug('createQuestionRecord', '跳过创建，使用已存在的 review', { reviewId: existing.reviewId });
      return existing.reviewId;
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
      startedAt: Date.now(),
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

    log.debug('markQuestionComplete', '标记问题完成', { sequence });
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
