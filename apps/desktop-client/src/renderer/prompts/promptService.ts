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
  ): Promise<string> {
    const template = await this.fetchPrompt('InitPrompt');

    return this.renderTemplate(template, {
      jobPosition,
      resume,
      questionBank,
    });
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
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const promptService = new PromptService();
