/**
 * Prompt 服务
 * 从数据库获取 prompt 模板并渲染
 */

import { createLogger } from '../../utils/rendererLogger.js';

const log = createLogger('PromptService');

interface Prompt {
  id: string;
  content: string;
  description: string;
  variables: string;
  source: 'desktop' | 'web';
  defaultContent: string;
  historyPre: string | null;
  extra: string | null;
  createdAt: number;
  updatedAt: number;
}

interface InterviewQuestion {
  question: string;
  answer?: string;
}

class PromptService {
  private baseUrl = 'http://localhost:3001';

  /**
   * 从数据库获取 prompt 完整数据(包含 extra 配置)
   */
  private async fetchPromptWithConfig(id: string): Promise<Prompt> {
    const url = `${this.baseUrl}/prompts/${id}`;

    try {
      await log.http.request('fetchPromptWithConfig', url, 'GET', { id });

      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        await log.http.error('fetchPromptWithConfig', url, new Error(`HTTP ${response.status}`), { id }, errorText);
        throw new Error(`Failed to fetch prompt: ${response.statusText}`);
      }
      const data = await response.json();
      await log.http.response('fetchPromptWithConfig', url, response.status, data);
      return data.prompt;
    } catch (error) {
      await log.http.error('fetchPromptWithConfig', url, error, { id });
      throw error;
    }
  }

  /**
   * 渲染模板字符串
   */
  private renderTemplate(template: string, variables: Record<string, any>): string {
    // 使用 Function 构造器来执行模板字符串
    const varNames = Object.keys(variables);
    const varValues = Object.values(variables);

    try {
      const func = new Function(...varNames, `return \`${template}\`;`);
      return func(...varValues);
    } catch (error) {
      log.error('renderTemplate', 'Failed to render template', { template: template.substring(0, 200) }, error);
      return template;
    }
  }

  /**
   * 构建面试初始化 Prompt
   * @param previousQuestions 上一次面试问过的问题列表，用于避免重复提问
   */
  async buildInitPrompt(
    jobPosition: { title?: string; description?: string },
    resume: { resumeTitle?: string; resumeContent?: string },
    questionBank: InterviewQuestion[],
    previousQuestions: string[] = [],
  ): Promise<{ content: string; totalQuestions: number }> {
    const promptData = await this.fetchPromptWithConfig('InitPrompt');

    // 从 extra 字段解析配置参数
    let totalQuestions = 10; // 默认值
    try {
      if (promptData.extra) {
        const config = JSON.parse(promptData.extra);
        totalQuestions = config.totalQuestions || 10;
      }
    } catch (error) {
      log.error('buildInitPrompt', 'Failed to parse extra config', { extra: promptData.extra }, error);
    }

    // 渲染模板，包含 totalQuestions 和 previousQuestions 变量
    const content = this.renderTemplate(promptData.content, {
      jobPosition,
      resume,
      questionBank,
      totalQuestions,
      previousQuestions,
    });

    return { content, totalQuestions };
  }

  /**
   * 构建答案生成 Prompt
   */
  async buildAnswerPrompt(
    jobPosition: { title?: string; description?: string },
    resume: { resumeTitle?: string; resumeContent?: string },
    question: string,
    referenceAnswer?: string,
  ): Promise<string> {
    const promptData = await this.fetchPromptWithConfig('AnswerPrompt');

    // 从 extra 字段解析配置参数
    let minWords = 1000; // 默认值
    let maxWords = 2000; // 默认值
    try {
      if (promptData.extra) {
        const config = JSON.parse(promptData.extra);
        minWords = config.minWords || 1000;
        maxWords = config.maxWords || 2000;
      }
    } catch (error) {
      log.error('buildAnswerPrompt', 'Failed to parse extra config', { extra: promptData.extra }, error);
    }

    return this.renderTemplate(promptData.content, {
      jobPosition,
      resume,
      question,
      referenceAnswer,
      minWords,
      maxWords,
    });
  }

  /**
   * 根据总题数动态计算各面试阶段的范围
   * 阶段分布：自我介绍(1题) → 项目经历(20%) → 技术深入(40%) → 场景设计(20%) → 收尾(20%)
   */
  private calculateStages(totalQuestions: number) {
    // 第 1 题固定是自我介绍（index 0）
    const remaining = Math.max(0, totalQuestions - 1);

    if (remaining === 0) {
      // 只有 1 题，全部都是自我介绍
      return {
        projectStageStart: 1,
        projectStageEnd: 0,
        techStageStart: 1,
        techStageEnd: 0,
        scenarioStageStart: 1,
        scenarioStageEnd: 0,
        endStageStart: 1,
      };
    }

    // 计算各阶段题数（至少 1 题，技术深入阶段优先保证）
    let projectCount = Math.max(1, Math.round(remaining * 0.2));
    let techCount = Math.max(1, Math.round(remaining * 0.4));
    let scenarioCount = Math.max(1, Math.round(remaining * 0.2));
    let endCount = remaining - projectCount - techCount - scenarioCount;

    // 如果收尾题数不足，从其他阶段调整
    if (endCount < 1) {
      endCount = 1;
      const excess = projectCount + techCount + scenarioCount + endCount - remaining;
      if (excess > 0) {
        // 优先减少项目经历和场景设计
        if (projectCount > 1) projectCount = Math.max(1, projectCount - Math.ceil(excess / 2));
        if (scenarioCount > 1) scenarioCount = Math.max(1, scenarioCount - Math.floor(excess / 2));
      }
    }

    // 计算各阶段的起止位置（0-indexed，用于 currentQuestionIndex 比较）
    const projectStageStart = 1;
    const projectStageEnd = projectStageStart + projectCount - 1;

    const techStageStart = projectStageEnd + 1;
    const techStageEnd = techStageStart + techCount - 1;

    const scenarioStageStart = techStageEnd + 1;
    const scenarioStageEnd = scenarioStageStart + scenarioCount - 1;

    const endStageStart = scenarioStageEnd + 1;

    log.debug('calculateStages', '动态计算面试阶段', {
      totalQuestions,
      projectCount,
      techCount,
      scenarioCount,
      endCount,
      stages: { projectStageStart, projectStageEnd, techStageStart, techStageEnd, scenarioStageStart, scenarioStageEnd, endStageStart },
    });

    return {
      projectStageStart,
      projectStageEnd,
      techStageStart,
      techStageEnd,
      scenarioStageStart,
      scenarioStageEnd,
      endStageStart,
    };
  }

  /**
   * 构建问题生成 Prompt
   * @param currentQuestionIndex 当前问题索引（0-indexed）
   * @param totalQuestions 总题数
   */
  async buildQuestionPrompt(currentQuestionIndex: number, totalQuestions: number): Promise<string> {
    const promptData = await this.fetchPromptWithConfig('QuestionPrompt');

    // 根据总题数动态计算各阶段范围
    const stages = this.calculateStages(totalQuestions);

    return this.renderTemplate(promptData.content, {
      currentQuestionIndex,
      ...stages,
    });
  }

  /**
   * 构建回答分析 Prompt
   */
  async buildAnalysisPrompt(
    askedQuestion: string,
    candidateAnswer: string,
    referenceAnswer: string,
  ): Promise<string> {
    const promptData = await this.fetchPromptWithConfig('AnalysisPrompt');

    // 从 extra 字段解析配置参数
    let scoreMin = 1;
    let scoreMax = 10;
    let passScore = 7;
    let relevanceWeight = 30;
    let professionalWeight = 30;
    let completenessWeight = 20;
    let expressionWeight = 20;
    try {
      if (promptData.extra) {
        const config = JSON.parse(promptData.extra);
        scoreMin = config.scoreMin || 1;
        scoreMax = config.scoreMax || 10;
        passScore = config.passScore || 7;
        relevanceWeight = config.relevanceWeight || 30;
        professionalWeight = config.professionalWeight || 30;
        completenessWeight = config.completenessWeight || 20;
        expressionWeight = config.expressionWeight || 20;
      }
    } catch (error) {
      log.error('buildAnalysisPrompt', 'Failed to parse extra config', { extra: promptData.extra }, error);
    }

    return this.renderTemplate(promptData.content, {
      askedQuestion,
      candidateAnswer,
      referenceAnswer,
      scoreMin,
      scoreMax,
      passScore,
      relevanceWeight,
      professionalWeight,
      completenessWeight,
      expressionWeight,
    });
  }

  /**
   * 构建面试评分 Prompt
   */
  async buildScorePrompt(
    jobTitle: string,
    resumeContent: string,
    reviewsData: string,
  ): Promise<string> {
    const promptData = await this.fetchPromptWithConfig('ScorePrompt');

    // 从 extra 字段解析配置参数
    let scoreMin = 0;
    let scoreMax = 100;
    let summaryMaxWords = 200;
    let prosMin = 3;
    let prosMax = 5;
    let consMin = 3;
    let consMax = 5;
    let suggestionsMin = 3;
    let suggestionsMax = 5;
    try {
      if (promptData.extra) {
        const config = JSON.parse(promptData.extra);
        scoreMin = config.scoreMin ?? 0;
        scoreMax = config.scoreMax || 100;
        summaryMaxWords = config.summaryMaxWords || 200;
        prosMin = config.prosMin || 3;
        prosMax = config.prosMax || 5;
        consMin = config.consMin || 3;
        consMax = config.consMax || 5;
        suggestionsMin = config.suggestionsMin || 3;
        suggestionsMax = config.suggestionsMax || 5;
      }
    } catch (error) {
      log.error('buildScorePrompt', 'Failed to parse extra config', { extra: promptData.extra }, error);
    }

    return this.renderTemplate(promptData.content, {
      jobTitle,
      resumeContent,
      reviewsData,
      scoreMin,
      scoreMax,
      summaryMaxWords,
      prosMin,
      prosMax,
      consMin,
      consMax,
      suggestionsMin,
      suggestionsMax,
    });
  }

  /**
   * 构建面试洞察 Prompt
   */
  async buildInsightPrompt(
    jobTitle: string,
    resumeContent: string,
    reviewsData: string,
  ): Promise<string> {
    const promptData = await this.fetchPromptWithConfig('InsightPrompt');

    // 从 extra 字段解析配置参数
    let scoreMin = 0;
    let scoreMax = 100;
    let summaryMaxWords = 100;
    try {
      if (promptData.extra) {
        const config = JSON.parse(promptData.extra);
        scoreMin = config.scoreMin ?? 0;
        scoreMax = config.scoreMax || 100;
        summaryMaxWords = config.summaryMaxWords || 100;
      }
    } catch (error) {
      log.error('buildInsightPrompt', 'Failed to parse extra config', { extra: promptData.extra }, error);
    }

    return this.renderTemplate(promptData.content, {
      jobTitle,
      resumeContent,
      reviewsData,
      scoreMin,
      scoreMax,
      summaryMaxWords,
    });
  }

  /**
   * 构建 AI 提问面试分析 Prompt
   */
  async buildAIQuestionAnalysisPrompt(analysisData: {
    interviewId: string;
    durationMinutes: number;
    totalQuestions: number;
    totalAnswers: number;
    positionJson: string;
    qaText: string;
  }): Promise<string> {
    const promptData = await this.fetchPromptWithConfig('AIQuestionAnalysisPrompt');

    // 从 extra 字段解析配置参数
    let overallScoreMin = 1;
    let overallScoreMax = 100;
    let summaryMinWords = 150;
    let summaryMaxWords = 200;
    let prosMinWords = 100;
    let prosMaxWords = 150;
    let consMinWords = 100;
    let consMaxWords = 150;
    let suggestionsMinWords = 150;
    let suggestionsMaxWords = 200;
    let radarScoreMin = 1;
    let radarScoreMax = 10;
    let interviewerSummaryWords = 100;
    let candidateSummaryWords = 100;
    let strategyWords = 80;
    let qaFeedbackWords = 80;

    try {
      if (promptData.extra) {
        const config = JSON.parse(promptData.extra);
        overallScoreMin = config.overallScoreMin ?? 1;
        overallScoreMax = config.overallScoreMax || 100;
        summaryMinWords = config.summaryMinWords || 150;
        summaryMaxWords = config.summaryMaxWords || 200;
        prosMinWords = config.prosMinWords || 100;
        prosMaxWords = config.prosMaxWords || 150;
        consMinWords = config.consMinWords || 100;
        consMaxWords = config.consMaxWords || 150;
        suggestionsMinWords = config.suggestionsMinWords || 150;
        suggestionsMaxWords = config.suggestionsMaxWords || 200;
        radarScoreMin = config.radarScoreMin ?? 1;
        radarScoreMax = config.radarScoreMax || 10;
        interviewerSummaryWords = config.interviewerSummaryWords || 100;
        candidateSummaryWords = config.candidateSummaryWords || 100;
        strategyWords = config.strategyWords || 80;
        qaFeedbackWords = config.qaFeedbackWords || 80;
      }
    } catch (error) {
      log.error('buildAIQuestionAnalysisPrompt', 'Failed to parse extra config', { extra: promptData.extra }, error);
    }

    return this.renderTemplate(promptData.content, {
      ...analysisData,
      overallScoreMin,
      overallScoreMax,
      summaryMinWords,
      summaryMaxWords,
      prosMinWords,
      prosMaxWords,
      consMinWords,
      consMaxWords,
      suggestionsMinWords,
      suggestionsMaxWords,
      radarScoreMin,
      radarScoreMax,
      interviewerSummaryWords,
      candidateSummaryWords,
      strategyWords,
      qaFeedbackWords,
    });
  }

  /**
   * 获取指定 ID 的 prompt 内容（用于 system prompt 等简单场景）
   */
  async getPromptContent(id: string): Promise<string> {
    const promptData = await this.fetchPromptWithConfig(id);
    return promptData.content;
  }

}

export const promptService = new PromptService();
