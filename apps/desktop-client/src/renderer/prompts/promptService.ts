/**
 * Prompt 服务
 * 从数据库获取 prompt 模板并渲染
 */

import { logger } from '../../utils/rendererLogger.js';

interface Prompt {
  id: string;
  content: string;
  description: string;
  variables: string;
  source: 'desktop' | 'web';
  default_content: string;
  history_pre: string | null;
  extra: string | null;
  created_at: number;
  updated_at: number;
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
    try {
      const response = await fetch(`${this.baseUrl}/prompts/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch prompt: ${response.statusText}`);
      }
      const data = await response.json();
      return data.prompt;
    } catch (error) {
      logger.error(`Failed to fetch prompt ${id}: ${error}`);
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
      logger.error(`Failed to render template: ${error}`);
      return template;
    }
  }

  /**
   * 构建面试初始化 Prompt
   */
  async buildInitPrompt(
    jobPosition: { title?: string; description?: string },
    resume: { resumeTitle?: string; resumeContent?: string },
    questionBank: InterviewQuestion[],
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
      logger.error(`Failed to parse prompt extra config: ${error}`);
    }

    // 渲染模板,包含 totalQuestions 作为变量 8
    const content = this.renderTemplate(promptData.content, {
      jobPosition,
      resume,
      questionBank,
      totalQuestions,
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
      logger.error(`Failed to parse AnswerPrompt extra config: ${error}`);
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
   * 构建问题生成 Prompt
   */
  async buildQuestionPrompt(currentQuestionIndex: number): Promise<string> {
    const promptData = await this.fetchPromptWithConfig('QuestionPrompt');

    // 从 extra 字段解析配置参数
    let projectStageStart = 2;
    let projectStageEnd = 3;
    let techStageStart = 4;
    let techStageEnd = 6;
    let scenarioStageStart = 7;
    let scenarioStageEnd = 8;
    let endStageStart = 9;
    try {
      if (promptData.extra) {
        const config = JSON.parse(promptData.extra);
        projectStageStart = config.projectStageStart || 2;
        projectStageEnd = config.projectStageEnd || 3;
        techStageStart = config.techStageStart || 4;
        techStageEnd = config.techStageEnd || 6;
        scenarioStageStart = config.scenarioStageStart || 7;
        scenarioStageEnd = config.scenarioStageEnd || 8;
        endStageStart = config.endStageStart || 9;
      }
    } catch (error) {
      logger.error(`Failed to parse QuestionPrompt extra config: ${error}`);
    }

    return this.renderTemplate(promptData.content, {
      currentQuestionIndex,
      projectStageStart,
      projectStageEnd,
      techStageStart,
      techStageEnd,
      scenarioStageStart,
      scenarioStageEnd,
      endStageStart,
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
      logger.error(`Failed to parse AnalysisPrompt extra config: ${error}`);
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
      logger.error(`Failed to parse ScorePrompt extra config: ${error}`);
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
      logger.error(`Failed to parse InsightPrompt extra config: ${error}`);
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

}

export const promptService = new PromptService();
