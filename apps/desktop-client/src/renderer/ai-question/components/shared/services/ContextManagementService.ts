/**
 * 上下文管理服务
 * 负责优化 LLM 调用的上下文，减少 Token 使用
 *
 * 核心策略：
 * 1. 简历/JD 管理：第1轮完整，第2轮开始使用摘要
 * 2. 滑动窗口：保留最近3轮完整对话
 * 3. 历史摘要：每5轮生成一次摘要
 * 4. ChromaDB：长期记忆，语义检索
 */

import type { ChatMessage } from '../../../../utils/ai/aiService';
import { aiService } from '../../../../utils/ai/aiService';
import { conversationVectorService } from './ConversationVectorService';

// 上下文管理配置
interface ContextConfig {
  windowSize: number;           // 滑动窗口大小（保留最近几轮完整对话）
  summaryInterval: number;       // 摘要生成间隔（每几轮生成一次摘要）
  resumeSummaryMaxLength: number; // 简历摘要最大长度
  jdSummaryMaxLength: number;     // JD摘要最大长度
  conversationSummaryMaxLength: number; // 对话摘要最大长度
}

// 对话轮次
interface ConversationRound {
  sequence: number;
  question: string;
  answer: string;
  timestamp: number;
}

// 上下文状态
interface ContextState {
  interviewId: string;

  // 简历/JD
  resume: string;
  resumeSummary?: string;
  jd: string;
  jdSummary?: string;

  // 对话历史
  conversations: ConversationRound[];
  conversationSummary?: string;
  lastSummaryIndex: number; // 上次生成摘要时的对话索引

  // 当前轮次
  currentRound: number;
}

export class ContextManagementService {
  private config: ContextConfig = {
    windowSize: 3,              // 保留最近3轮
    summaryInterval: 5,          // 每5轮生成一次摘要
    resumeSummaryMaxLength: 200, // 简历摘要200字
    jdSummaryMaxLength: 100,     // JD摘要100字
    conversationSummaryMaxLength: 500, // 对话摘要500字
  };

  private state: ContextState | null = null;

  /**
   * 初始化上下文管理
   */
  async initialize(params: {
    interviewId: string;
    resume: string;
    jd: string;
  }): Promise<void> {
    this.state = {
      interviewId: params.interviewId,
      resume: params.resume,
      jd: params.jd,
      conversations: [],
      lastSummaryIndex: 0,
      currentRound: 0,
    };

    console.log('[ContextManagement] 初始化完成', {
      interviewId: params.interviewId,
      resumeLength: params.resume.length,
      jdLength: params.jd.length,
    });

    // 异步存储简历/JD到ChromaDB（不阻塞初始化）
    conversationVectorService
      .storeResumeAndJD({
        interviewId: params.interviewId,
        resume: params.resume,
        jd: params.jd,
      })
      .catch((error) => {
        console.error('[ContextManagement] 存储简历/JD到ChromaDB失败:', error);
      });
  }

  /**
   * 获取当前应该使用的上下文（核心方法）
   *
   * 返回优化后的 messages 数组，包括：
   * - system message（简历/JD摘要 + 历史摘要）
   * - 最近N轮完整对话（滑动窗口）
   */
  async getOptimizedContext(currentQuestion: string): Promise<ChatMessage[]> {
    if (!this.state) {
      throw new Error('Context not initialized');
    }

    const messages: ChatMessage[] = [];

    // 1. 构建 system message
    const systemContent = await this.buildSystemMessage();
    messages.push({
      role: 'system',
      content: systemContent,
    });

    // 2. 添加滑动窗口内的完整对话
    const windowConversations = this.getWindowConversations();
    for (const conv of windowConversations) {
      messages.push({
        role: 'user',
        content: conv.question,
      });
      messages.push({
        role: 'assistant',
        content: conv.answer,
      });
    }

    // 3. 添加当前问题
    messages.push({
      role: 'user',
      content: currentQuestion,
    });

    console.log('[ContextManagement] 生成优化上下文', {
      round: this.state.currentRound + 1,
      systemLength: systemContent.length,
      windowSize: windowConversations.length,
      totalMessages: messages.length,
    });

    return messages;
  }

  /**
   * 记录一轮对话（在收到答案后调用）
   */
  async recordConversation(question: string, answer: string): Promise<void> {
    if (!this.state) {
      throw new Error('Context not initialized');
    }

    const round: ConversationRound = {
      sequence: this.state.currentRound,
      question,
      answer,
      timestamp: Date.now(),
    };

    this.state.conversations.push(round);
    this.state.currentRound++;

    console.log('[ContextManagement] 记录对话', {
      sequence: round.sequence,
      questionLength: question.length,
      answerLength: answer.length,
    });

    // 第1轮结束后，生成简历/JD摘要
    if (this.state.currentRound === 1) {
      await this.generateResumeAndJDSummary();
    }

    // 检查是否需要生成对话摘要
    if (this.shouldGenerateSummary()) {
      await this.generateConversationSummary();
    }

    // 存入 ChromaDB（异步，不阻塞）
    conversationVectorService
      .storeConversation({
        interviewId: this.state.interviewId,
        sequence: round.sequence,
        question,
        answer,
      })
      .catch((error) => {
        console.error('[ContextManagement] 存储对话到ChromaDB失败:', error);
      });
  }

  /**
   * 构建 system message
   */
  private async buildSystemMessage(): Promise<string> {
    if (!this.state) {
      throw new Error('Context not initialized');
    }

    const parts: string[] = [];

    // 岗位信息
    if (this.state.currentRound === 0) {
      // 第1轮：使用完整JD
      parts.push(`# 岗位要求\n${this.state.jd}`);
    } else {
      // 第2轮开始：使用JD摘要
      const jdSummary = this.state.jdSummary || this.state.jd;
      parts.push(`# 岗位要求（摘要）\n${jdSummary}`);
    }

    // 简历信息
    if (this.state.currentRound === 0) {
      // 第1轮：使用完整简历
      parts.push(`\n# 候选人简历\n${this.state.resume}`);
    } else {
      // 第2轮开始：使用简历摘要
      const resumeSummary = this.state.resumeSummary || this.state.resume;
      parts.push(`\n# 候选人简历（摘要）\n${resumeSummary}`);
    }

    // 历史对话摘要（如果存在）
    if (this.state.conversationSummary) {
      parts.push(`\n# 之前讨论的内容\n${this.state.conversationSummary}`);
    }

    return parts.join('\n');
  }

  /**
   * 获取滑动窗口内的对话
   */
  private getWindowConversations(): ConversationRound[] {
    if (!this.state) {
      return [];
    }

    const { conversations, currentRound } = this.state;
    const windowSize = this.config.windowSize;

    // 计算窗口起始位置
    const startIndex = Math.max(0, currentRound - windowSize);

    return conversations.slice(startIndex);
  }

  /**
   * 是否需要生成对话摘要
   */
  private shouldGenerateSummary(): boolean {
    if (!this.state) {
      return false;
    }

    const { currentRound, lastSummaryIndex } = this.state;
    const { summaryInterval } = this.config;

    // 每N轮生成一次摘要
    return (currentRound - lastSummaryIndex) >= summaryInterval;
  }

  /**
   * 生成简历和JD的摘要
   */
  private async generateResumeAndJDSummary(): Promise<void> {
    if (!this.state) {
      return;
    }

    console.log('[ContextManagement] 开始生成简历/JD摘要...');

    try {
      // 生成简历摘要
      const resumeSummaryPrompt: ChatMessage[] = [
        {
          role: 'system',
          content: `你是一个专业的文本摘要助手。请将以下简历压缩为${this.config.resumeSummaryMaxLength}字左右的摘要，保留关键技能、项目经验和核心优势。`,
        },
        {
          role: 'user',
          content: this.state.resume,
        },
      ];

      const resumeSummary = await aiService.callAI(resumeSummaryPrompt);
      this.state.resumeSummary = resumeSummary;

      // 生成JD摘要
      const jdSummaryPrompt: ChatMessage[] = [
        {
          role: 'system',
          content: `你是一个专业的文本摘要助手。请将以下岗位描述压缩为${this.config.jdSummaryMaxLength}字左右的摘要，保留核心职责和关键要求。`,
        },
        {
          role: 'user',
          content: this.state.jd,
        },
      ];

      const jdSummary = await aiService.callAI(jdSummaryPrompt);
      this.state.jdSummary = jdSummary;

      console.log('[ContextManagement] 简历/JD摘要生成完成', {
        resumeOriginal: this.state.resume.length,
        resumeSummary: resumeSummary.length,
        jdOriginal: this.state.jd.length,
        jdSummary: jdSummary.length,
      });
    } catch (error) {
      console.error('[ContextManagement] 生成简历/JD摘要失败:', error);
      // 失败时使用原文
    }
  }

  /**
   * 生成对话历史摘要
   */
  private async generateConversationSummary(): Promise<void> {
    if (!this.state) {
      return;
    }

    console.log('[ContextManagement] 开始生成对话摘要...');

    try {
      // 获取需要摘要的对话（从上次摘要位置到当前位置之前的对话）
      const conversationsToSummarize = this.state.conversations.slice(
        this.state.lastSummaryIndex,
        this.state.currentRound - this.config.windowSize
      );

      if (conversationsToSummarize.length === 0) {
        return;
      }

      // 构建对话文本
      const conversationText = conversationsToSummarize
        .map((conv) => `Q${conv.sequence + 1}: ${conv.question}\nA${conv.sequence + 1}: ${conv.answer}`)
        .join('\n\n');

      const summaryPrompt: ChatMessage[] = [
        {
          role: 'system',
          content: `你是一个专业的对话摘要助手。请将以下面试对话压缩为${this.config.conversationSummaryMaxLength}字左右的摘要，保留关键讨论点和重要信息。`,
        },
        {
          role: 'user',
          content: conversationText,
        },
      ];

      const newSummary = await aiService.callAI(summaryPrompt);

      // 如果已有摘要，追加到现有摘要后
      if (this.state.conversationSummary) {
        // 合并摘要
        const mergeSummaryPrompt: ChatMessage[] = [
          {
            role: 'system',
            content: `你是一个专业的文本摘要助手。请将以下两段摘要合并为一段${this.config.conversationSummaryMaxLength}字左右的综合摘要。`,
          },
          {
            role: 'user',
            content: `之前的摘要：\n${this.state.conversationSummary}\n\n新的摘要：\n${newSummary}`,
          },
        ];

        const mergedSummary = await aiService.callAI(mergeSummaryPrompt);
        this.state.conversationSummary = mergedSummary;
      } else {
        this.state.conversationSummary = newSummary;
      }

      this.state.lastSummaryIndex = this.state.currentRound - this.config.windowSize;

      console.log('[ContextManagement] 对话摘要生成完成', {
        summarizedRounds: conversationsToSummarize.length,
        summaryLength: this.state.conversationSummary?.length || 0,
        lastSummaryIndex: this.state.lastSummaryIndex,
      });
    } catch (error) {
      console.error('[ContextManagement] 生成对话摘要失败:', error);
    }
  }

  /**
   * 清理状态
   */
  clear(): void {
    this.state = null;
    console.log('[ContextManagement] 状态已清理');
  }

  /**
   * 获取统计信息
   */
  getStats() {
    if (!this.state) {
      return null;
    }

    return {
      interviewId: this.state.interviewId,
      currentRound: this.state.currentRound,
      totalConversations: this.state.conversations.length,
      hasResumeSummary: !!this.state.resumeSummary,
      hasJDSummary: !!this.state.jdSummary,
      hasConversationSummary: !!this.state.conversationSummary,
      windowSize: this.config.windowSize,
    };
  }
}

// 导出单例
export const contextManagementService = new ContextManagementService();
