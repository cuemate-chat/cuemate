/**
 * 面试训练数据管理服务
 * 负责面试训练过程中的所有数据收集、整理和分析结果保存
 */

import { interviewTrainingAnalysisService, TrainingAnalysisRequest } from '../services/InterviewTrainingAnalysisService';

// 面试训练问题状态
export interface TrainingQuestionState {
  id: string;
  content: string;
  timestamp: number;
  source: 'interviewer'; // 面试训练中问题都来自真实面试官
  processed: boolean;
}

// 面试训练回答状态
export interface TrainingAnswerState {
  id: string;
  questionId: string;
  content: string;
  timestamp: number;
  duration: number; // 回答时长（毫秒）
  processed: boolean;
}

// 面试训练数据状态
export interface InterviewTrainingDataState {
  interviewId: string;
  questions: Map<string, TrainingQuestionState>;
  answers: Map<string, TrainingAnswerState>;
  startTime: number;
  endTime?: number;
  isComplete: boolean;
  isAnalyzing: boolean;
  analysisResult?: any;
}

export class InterviewTrainingDataService {
  private dataState: InterviewTrainingDataState | null = null;

  constructor() {
    // 面试训练数据服务主要用于本地数据管理
    // 暂时不需要认证和API调用功能
  }

  /**
   * 初始化面试训练数据状态
   */
  initializeTraining(interviewId: string): void {
    this.dataState = {
      interviewId,
      questions: new Map(),
      answers: new Map(),
      startTime: Date.now(),
      isComplete: false,
      isAnalyzing: false,
    };

    console.debug(`已初始化面试训练数据状态: ${interviewId}`);
  }

  /**
   * 添加面试官问题
   */
  addInterviewerQuestion(questionContent: string): string {
    if (!this.dataState) {
      throw new Error('面试训练数据状态未初始化');
    }

    const questionId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const question: TrainingQuestionState = {
      id: questionId,
      content: questionContent.trim(),
      timestamp: Date.now(),
      source: 'interviewer',
      processed: false,
    };

    this.dataState.questions.set(questionId, question);

    console.debug(`添加面试官问题: ${questionId}`);
    return questionId;
  }

  /**
   * 添加用户回答
   */
  addUserAnswer(questionId: string, answerContent: string): string {
    if (!this.dataState) {
      throw new Error('面试训练数据状态未初始化');
    }

    const question = this.dataState.questions.get(questionId);
    if (!question) {
      throw new Error(`未找到对应的问题: ${questionId}`);
    }

    const answerId = `a_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const answer: TrainingAnswerState = {
      id: answerId,
      questionId,
      content: answerContent.trim(),
      timestamp: Date.now(),
      duration: Date.now() - question.timestamp,
      processed: false,
    };

    this.dataState.answers.set(answerId, answer);

    // 标记问题已处理
    question.processed = true;

    console.debug(`添加用户回答: ${answerId} (对应问题: ${questionId})`);
    return answerId;
  }

  /**
   * 更新问题内容
   */
  updateQuestionContent(questionId: string, content: string): void {
    if (!this.dataState) {
      throw new Error('面试训练数据状态未初始化');
    }

    const question = this.dataState.questions.get(questionId);
    if (question) {
      question.content = content.trim();
      console.debug(`更新问题内容: ${questionId}`);
    }
  }

  /**
   * 更新回答内容
   */
  updateAnswerContent(answerId: string, content: string): void {
    if (!this.dataState) {
      throw new Error('面试训练数据状态未初始化');
    }

    const answer = this.dataState.answers.get(answerId);
    if (answer) {
      answer.content = content.trim();
      console.debug(`更新回答内容: ${answerId}`);
    }
  }

  /**
   * 结束面试训练
   */
  finishTraining(): void {
    if (!this.dataState) {
      throw new Error('面试训练数据状态未初始化');
    }

    this.dataState.endTime = Date.now();
    this.dataState.isComplete = true;

    console.debug(`面试训练结束: ${this.dataState.interviewId}`);
  }

  /**
   * 获取训练统计信息
   */
  getTrainingStats(): {
    duration: number;
    totalQuestions: number;
    totalAnswers: number;
    processedQuestions: number;
    averageResponseTime: number;
  } | null {
    if (!this.dataState) {
      return null;
    }

    const now = this.dataState.endTime || Date.now();
    const duration = Math.floor((now - this.dataState.startTime) / 1000);

    let processedQuestions = 0;
    let totalResponseTime = 0;
    let responseTimes: number[] = [];

    // 统计处理过的问题和回答时间
    for (const question of this.dataState.questions.values()) {
      if (question.processed) {
        processedQuestions++;
      }
    }

    for (const answer of this.dataState.answers.values()) {
      responseTimes.push(answer.duration);
      totalResponseTime += answer.duration;
    }

    const averageResponseTime = responseTimes.length > 0
      ? Math.floor(totalResponseTime / responseTimes.length / 1000)
      : 0;

    return {
      duration,
      totalQuestions: this.dataState.questions.size,
      totalAnswers: this.dataState.answers.size,
      processedQuestions,
      averageResponseTime,
    };
  }

  /**
   * 获取所有问题（按时间顺序）
   */
  getAllQuestions(): TrainingQuestionState[] {
    if (!this.dataState) {
      return [];
    }
    return Array.from(this.dataState.questions.values())
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 获取所有回答（按时间顺序）
   */
  getAllAnswers(): TrainingAnswerState[] {
    if (!this.dataState) {
      return [];
    }
    return Array.from(this.dataState.answers.values())
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 获取问答对（用于分析）
   */
  getQuestionAnswerPairs(): Array<{
    question: TrainingQuestionState;
    answer: TrainingAnswerState | null;
  }> {
    if (!this.dataState) {
      return [];
    }

    const pairs: Array<{
      question: TrainingQuestionState;
      answer: TrainingAnswerState | null;
    }> = [];

    for (const question of this.getAllQuestions()) {
      const answer = Array.from(this.dataState.answers.values())
        .find(a => a.questionId === question.id) || null;

      pairs.push({ question, answer });
    }

    return pairs;
  }

  /**
   * 检查是否可以开始分析
   */
  canStartAnalysis(): boolean {
    if (!this.dataState || !this.dataState.isComplete) {
      return false;
    }

    // 至少要有一个问答对
    const pairs = this.getQuestionAnswerPairs();
    return pairs.length > 0 && pairs.some(pair => pair.answer !== null);
  }

  /**
   * 执行面试训练分析
   */
  async performAnalysis(jobPosition?: any, candidateProfile?: any): Promise<any> {
    if (!this.dataState) {
      throw new Error('面试训练数据状态未初始化');
    }

    if (!this.canStartAnalysis()) {
      throw new Error('无法开始分析：数据不足或面试未完成');
    }

    this.dataState.isAnalyzing = true;

    try {
      const stats = this.getTrainingStats();
      if (!stats) {
        throw new Error('无法获取训练统计信息');
      }

      // 准备分析请求数据
      const analysisRequest: TrainingAnalysisRequest = {
        interviewId: this.dataState.interviewId,
        interviewerQuestions: this.getAllQuestions().map(q => ({
          id: q.id,
          content: q.content,
          timestamp: q.timestamp
        })),
        userAnswers: this.getAllAnswers().map(a => ({
          id: a.id,
          questionId: a.questionId,
          content: a.content,
          timestamp: a.timestamp
        })),
        duration: stats.duration,
        jobPosition,
        candidateProfile
      };

      console.debug('开始执行面试训练分析:', {
        interviewId: this.dataState.interviewId,
        questionsCount: analysisRequest.interviewerQuestions.length,
        answersCount: analysisRequest.userAnswers.length,
        duration: stats.duration
      });

      // 调用分析服务
      const result = await interviewTrainingAnalysisService.analyzeAndSave(analysisRequest);

      this.dataState.analysisResult = result;
      this.dataState.isAnalyzing = false;

      console.debug('面试训练分析完成:', {
        overallScore: result.analysis.overallScore,
        scoreId: result.scoreId,
        insightId: result.insightId,
        reviewIds: result.reviewIds.length
      });

      return result;

    } catch (error: unknown) {
      this.dataState.isAnalyzing = false;
      console.error('面试训练分析失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前状态
   */
  getCurrentState(): InterviewTrainingDataState | null {
    return this.dataState ? { ...this.dataState } : null;
  }

  /**
   * 导出训练数据（用于调试和备份）
   */
  exportTrainingData(): any {
    if (!this.dataState) {
      return null;
    }

    const pairs = this.getQuestionAnswerPairs();
    const stats = this.getTrainingStats();

    return {
      interviewId: this.dataState.interviewId,
      questionAnswerPairs: pairs.map(pair => ({
        question: pair.question,
        answer: pair.answer,
        responseTime: pair.answer ? pair.answer.duration : null
      })),
      stats,
      metadata: {
        startTime: this.dataState.startTime,
        endTime: this.dataState.endTime,
        isComplete: this.dataState.isComplete,
        isAnalyzing: this.dataState.isAnalyzing,
        hasAnalysisResult: !!this.dataState.analysisResult
      },
      analysisResult: this.dataState.analysisResult
    };
  }

  /**
   * 清理数据状态
   */
  cleanup(): void {
    this.dataState = null;
    console.debug('面试训练数据服务已清理');
  }

  /**
   * 获取分析进度（如果正在分析中）
   */
  getAnalysisProgress(): {
    isAnalyzing: boolean;
    phase?: string;
    progress?: number;
  } {
    if (!this.dataState) {
      return { isAnalyzing: false };
    }

    return {
      isAnalyzing: this.dataState.isAnalyzing,
      phase: this.dataState.isAnalyzing ? 'AI分析中...' : undefined,
      progress: this.dataState.isAnalyzing ? undefined : 100
    };
  }

  /**
   * 检查是否有完整的问答对
   */
  hasCompleteQAPairs(): boolean {
    if (!this.dataState) {
      return false;
    }

    const pairs = this.getQuestionAnswerPairs();
    return pairs.length > 0 && pairs.every(pair => pair.answer !== null);
  }

  /**
   * 获取未完成的问题
   */
  getIncompleteQuestions(): TrainingQuestionState[] {
    if (!this.dataState) {
      return [];
    }

    const answeredQuestionIds = new Set(
      Array.from(this.dataState.answers.values()).map(a => a.questionId)
    );

    return Array.from(this.dataState.questions.values())
      .filter(q => !answeredQuestionIds.has(q.id))
      .sort((a, b) => a.timestamp - b.timestamp);
  }
}

export const interviewTrainingDataService = new InterviewTrainingDataService();