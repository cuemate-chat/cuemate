/**
 * 面试数据管理服务
 * 负责面试过程中的所有数据库操作和状态同步
 */

import { createLogger } from '../../../../../utils/rendererLogger.js';
import { CreateReviewData, interviewService } from '../services/InterviewService';
import { getMockInterviewState } from '../../../../utils/mockInterviewState';

const log = createLogger('InterviewDataService');

// 面试分数接口
export interface InterviewScore {
  id?: string;
  interviewId: string;
  totalScore: number;
  durationSec: number;
  numQuestions: number;
  overallSummary?: string;
  createdAt: number;
  pros?: string;
  cons?: string;
  suggestions?: string;
  radarInteractivity?: number;
  radarConfidence?: number;
  radarProfessionalism?: number;
  radarRelevance?: number;
  radarClarity?: number;
}

// 面试洞察接口
export interface InterviewInsight {
  id?: string;
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
  createdAt: number;
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
    log.debug('initializeInterview', '初始化面试数据', { interviewId, totalQuestions });
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
      const sortedReviews = reviews.sort((a, b) => a.createdAt - b.createdAt);

      if (sequence < sortedReviews.length) {
        const review = sortedReviews[sequence];
        return {
          reviewId: review.id || '',
          question: review.askedQuestion || review.content || '',
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
    log.debug('createQuestionRecord', '开始创建问题记录', {
      sequence,
      hasDataState: !!this.dataState,
      dataStateInterviewId: this.dataState?.interviewId,
    });

    // 跨窗口同步：如果 dataState 未初始化，从跨窗口状态获取 interviewId 并初始化
    if (!this.dataState || !this.dataState.interviewId) {
      const mockState = getMockInterviewState();
      log.debug('createQuestionRecord', '尝试从跨窗口状态获取 interviewId', {
        mockStateInterviewId: mockState.interviewId,
      });
      if (mockState.interviewId) {
        log.debug('createQuestionRecord', '从跨窗口状态获取 interviewId', { interviewId: mockState.interviewId });
        this.initializeInterview(mockState.interviewId, 10);
      } else {
        throw new Error('Interview data state not initialized and no interviewId in cross-window state');
      }
    }

    // 此时 dataState 一定存在
    const dataState = this.dataState!;

    // 幂等性检查：先查数据库，看该 sequence 是否已有记录
    const existing = await this.findExistingReviewBySequence(dataState.interviewId, sequence);
    if (existing && existing.reviewId) {
      // 已存在，更新本地状态并返回现有 ID
      const questionState: QuestionState = {
        reviewId: existing.reviewId,
        sequence,
        phase: 'question_generated',
        question: existing.question,
        startedAt: Date.now(),
      };
      dataState.questions.set(sequence, questionState);
      dataState.currentSequence = sequence;

      log.debug('createQuestionRecord', '跳过创建，使用已存在的 review', { reviewId: existing.reviewId });
      return existing.reviewId;
    }

    const reviewData: CreateReviewData = {
      interviewId: dataState.interviewId,
      noteType: 'interview_qa',
      content: askedQuestion,
      questionId: undefined,
      question: undefined,
      answer: undefined,
      askedQuestion: askedQuestion,
      candidateAnswer: undefined,
      pros: undefined,
      cons: undefined,
      suggestions: undefined,
      keyPoints: undefined,
      assessment: undefined,
      referenceAnswer: undefined,
      otherId: undefined,
      otherContent: undefined,
      endAt: undefined,
      duration: undefined,
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

    dataState.questions.set(sequence, questionState);
    dataState.currentSequence = sequence;

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
