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
    try {
      const template = await this.fetchPrompt('InitPrompt');

      const questionsText = questionBank
        .map((q) => `Q: ${q.question}\nA: ${q.answer || '无参考答案'}`)
        .join('\n\n');

      return this.renderTemplate(template, {
        jobPosition,
        resume,
        questionsText,
      });
    } catch (error) {
      // Fallback to local implementation
      const questionsText = questionBank
        .map((q) => `Q: ${q.question}\nA: ${q.answer || '无参考答案'}`)
        .join('\n\n');

      return `你是一名专业的面试官，即将开始一场${jobPosition.title || '软件开发'}的面试。

【岗位信息】
职位：${jobPosition.title || '未指定'}
描述：${jobPosition.description || '无描述'}

【候选人简历】
${resume.resumeTitle ? `简历标题：${resume.resumeTitle}` : ''}
${resume.resumeContent || '无简历内容'}

【参考押题库】（如问题相似度>80%请基于题库答案回答）
${questionsText || '无押题'}

面试规则：
1. 每次只问一个问题，等待候选人回答后再继续
2. 问题要有针对性，结合岗位要求和候选人背景
3. 问题难度要循序渐进
4. 保持专业和友好的语气
5. 总共进行10个问题的面试

请开始面试，首先进行简单的开场白和自我介绍引导。`;
    }
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
    try {
      const template = await this.fetchPrompt('AnswerPrompt');

      return this.renderTemplate(template, {
        jobPosition,
        resume,
        question,
        referenceAnswer,
      });
    } catch (error) {
      // Fallback to local implementation
      let prompt = `你是一名面试辅导专家，需要为面试者生成优质的参考答案。

【岗位信息】
职位：${jobPosition.title || '未指定'}
描述：${jobPosition.description || '无描述'}

【候选人简历】
${resume.resumeTitle ? `简历标题：${resume.resumeTitle}` : ''}
${resume.resumeContent || '无简历内容'}

【面试问题】
${question}
`;

      if (referenceAnswer) {
        prompt += `
【押题库参考答案】
${referenceAnswer}

【任务要求】
1. 仔细分析押题库的参考答案是否切题、是否符合当前面试问题
2. 如果参考答案切题且质量高：
   - 基于参考答案进行优化、补充或校准
   - 结合候选人的简历背景进行个性化调整
   - 确保答案更加具体、专业、有条理
3. 如果参考答案不切题或质量较差：
   - 忽略参考答案，重新生成答案
   - 确保答案紧扣问题，结合岗位要求
   - 体现候选人的实际能力和经验
4. 答案要求：
   - 专业、具体、有条理
   - 结合实际工作经验和项目案例
   - 体现相关技能和能力
   - 控制在2000字以内
   - 直接输出答案内容，不要包含"参考答案："等前缀

请生成答案：`;
      } else {
        prompt += `
【任务要求】
1. 为以上面试问题生成一个优秀的参考答案
2. 答案要求：
   - 紧扣问题，符合岗位要求
   - 结合候选人简历中的实际经验和项目
   - 专业、具体、有条理
   - 体现相关技能和能力
   - 控制在2000字以内
   - 直接输出答案内容，不要包含"参考答案："等前缀

请生成答案：`;
      }

      return prompt;
    }
  }

  /**
   * 构建问题生成 Prompt
   */
  async buildQuestionPrompt(currentQuestionIndex: number): Promise<string> {
    try {
      const template = await this.fetchPrompt('QuestionPrompt');

      return this.renderTemplate(template, {
        currentQuestionIndex,
      });
    } catch (error) {
      // Fallback to local implementation
      return `现在开始第${currentQuestionIndex + 1}个问题。请根据之前的对话历史和岗位要求，生成一个合适的面试问题。直接输出问题内容，不要包含其他解释。`;
    }
  }

  /**
   * 构建回答分析 Prompt
   */
  async buildAnalysisPrompt(
    askedQuestion: string,
    candidateAnswer: string,
    referenceAnswer: string,
  ): Promise<string> {
    try {
      const template = await this.fetchPrompt('AnalysisPrompt');

      return this.renderTemplate(template, {
        askedQuestion,
        candidateAnswer,
        referenceAnswer,
      });
    } catch (error) {
      // Fallback to local implementation
      return `请分析这个面试回答，并给出详细的评价和建议。

面试问题：${askedQuestion}

候选人回答：${candidateAnswer}

参考答案：${referenceAnswer}

请按以下JSON格式输出分析结果（只输出JSON，不要其他内容）：
{
  "pros": "回答的亮点和优势",
  "cons": "回答的问题和不足",
  "suggestions": "具体的改进建议",
  "key_points": "这个问题主要考察什么能力",
  "assessment": "1-10分的评分并说明理由"
}`;
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const promptService = new PromptService();
