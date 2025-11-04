/**
 * Prompt 服务
 * 从数据库获取 prompt 模板并渲染
 */

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
  private cache: Map<string, string> = new Map();

  /**
   * 从数据库获取 prompt 模板
   */
  private async fetchPrompt(id: string): Promise<string> {
    // 检查缓存
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    try {
      const response = await fetch(`${this.baseUrl}/prompts/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch prompt: ${response.statusText}`);
      }
      const data = await response.json();
      const prompt: Prompt = data.prompt;

      // 缓存 prompt
      this.cache.set(id, prompt.content);
      return prompt.content;
    } catch (error) {
      console.error(`Failed to fetch prompt ${id}, using fallback`, error);
      // 如果获取失败，返回空字符串，调用方应该使用本地 fallback
      throw error;
    }
  }

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
      console.error(`Failed to fetch prompt ${id}`, error);
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
      console.error('Failed to render template:', error);
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
      console.error('Failed to parse prompt extra config:', error);
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
    const template = await this.fetchPrompt('AnswerPrompt');

    return this.renderTemplate(template, {
      jobPosition,
      resume,
      question,
      referenceAnswer,
    });
  }

  /**
   * 构建问题生成 Prompt
   */
  async buildQuestionPrompt(currentQuestionIndex: number): Promise<string> {
    const template = await this.fetchPrompt('QuestionPrompt');

    return this.renderTemplate(template, {
      currentQuestionIndex,
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
    const template = await this.fetchPrompt('AnalysisPrompt');

    return this.renderTemplate(template, {
      askedQuestion,
      candidateAnswer,
      referenceAnswer,
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
    const template = await this.fetchPrompt('ScorePrompt');

    return this.renderTemplate(template, {
      jobTitle,
      resumeContent,
      reviewsData,
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
    const template = await this.fetchPrompt('InsightPrompt');

    return this.renderTemplate(template, {
      jobTitle,
      resumeContent,
      reviewsData,
    });
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const promptService = new PromptService();
