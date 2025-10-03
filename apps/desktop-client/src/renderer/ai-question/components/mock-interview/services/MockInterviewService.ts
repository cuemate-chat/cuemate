/**
 * 模拟面试专用服务
 * 处理面试流程中的所有数据操作
 */

// 面试问答记录接口
export interface InterviewReview {
  id?: string;
  interview_id: string;
  note_type: string;
  content: string;
  created_at: number;
  question_id?: string;
  question?: string;
  answer?: string;
  asked_question?: string;
  candidate_answer?: string;
  pros?: string;
  cons?: string;
  suggestions?: string;
  key_points?: string;
  assessment?: string;
  reference_answer?: string;
}

// 创建问答记录的数据
export interface CreateReviewData {
  interview_id: string;
  note_type?: string;
  content: string;
  question_id?: string;
  question?: string;
  answer?: string;
  asked_question?: string;
  candidate_answer?: string;
  pros?: string;
  cons?: string;
  suggestions?: string;
  key_points?: string;
  assessment?: string;
  reference_answer?: string;
}

// 更新问答记录的数据
export interface UpdateReviewData {
  content?: string;
  answer?: string;
  candidate_answer?: string;
  pros?: string;
  cons?: string;
  suggestions?: string;
  key_points?: string;
  assessment?: string;
  reference_answer?: string;
}

// 面试题接口
export interface InterviewQuestion {
  id: string;
  job_id: string;
  question: string;
  answer?: string;
  created_at: number;
  tag_id?: string;
  vector_status: number;
}

// LLM流式响应处理器
export interface StreamingResponse {
  onChunk: (chunk: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

// 问题相似度匹配结果
export interface QuestionMatch {
  question: InterviewQuestion;
  similarity: number;
  useAsReference: boolean; // 是否使用作为参考答案
}

export class MockInterviewService {
  private baseURL = 'http://localhost:3001';
  private llmRouterURL = 'http://localhost:3002';
  private ragServiceURL = 'http://localhost:3003';

  private async getToken(): Promise<string> {
    const api = (window as any).electronAPI || (window as any).electronInterviewerAPI;
    const result = await api?.getUserData?.();
    if (result?.success && result.userData?.token) {
      return result.userData.token;
    }
    throw new Error('用户未登录或token获取失败');
  }

  private async getHeaders() {
    const token = await this.getToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * 获取岗位相关的押题题库
   */
  async getQuestionBank(jobId: string): Promise<InterviewQuestion[]> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseURL}/interview-questions?jobId=${jobId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`获取题库失败: ${response.status}`);
      }

      const result = await response.json();
      return result.items || [];
    } catch (error) {
      console.error('获取题库失败:', error);
      throw error;
    }
  }

  /**
   * 创建面试问答记录
   */
  async createReview(data: CreateReviewData): Promise<{ id: string }> {
    try {
      const headers = await this.getHeaders();
      const reviewData = {
        interviewId: data.interview_id,
        noteType: data.note_type || 'interview_qa',
        content: data.content,
        questionId: data.question_id,
        question: data.question,
        answer: data.answer,
        askedQuestion: data.asked_question,
        candidateAnswer: data.candidate_answer,
        pros: data.pros,
        cons: data.cons,
        suggestions: data.suggestions,
        keyPoints: data.key_points,
        assessment: data.assessment,
        referenceAnswer: data.reference_answer,
      };

      const response = await fetch(`${this.baseURL}/interview-reviews`, {
        method: 'POST',
        headers,
        body: JSON.stringify(reviewData),
      });

      if (!response.ok) {
        throw new Error(`创建问答记录失败: ${response.status}`);
      }

      const result = await response.json();
      return { id: result.id };
    } catch (error) {
      console.error('创建问答记录失败:', error);
      throw error;
    }
  }

  /**
   * 更新面试问答记录
   */
  async updateReview(reviewId: string, data: UpdateReviewData): Promise<void> {
    try {
      const headers = await this.getHeaders();
      const updateData: any = {};

      if (data.content !== undefined) updateData.content = data.content;
      if (data.answer !== undefined) updateData.answer = data.answer;
      if (data.candidate_answer !== undefined) updateData.candidateAnswer = data.candidate_answer;
      if (data.pros !== undefined) updateData.pros = data.pros;
      if (data.cons !== undefined) updateData.cons = data.cons;
      if (data.suggestions !== undefined) updateData.suggestions = data.suggestions;
      if (data.key_points !== undefined) updateData.keyPoints = data.key_points;
      if (data.assessment !== undefined) updateData.assessment = data.assessment;
      if (data.reference_answer !== undefined) updateData.referenceAnswer = data.reference_answer;

      const response = await fetch(`${this.baseURL}/interview-reviews/${reviewId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`更新问答记录失败: ${response.status}`);
      }
    } catch (error) {
      console.error('更新问答记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取面试的问答记录
   */
  async getInterviewReviews(interviewId: string): Promise<InterviewReview[]> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseURL}/interview-reviews?interview_id=${interviewId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`获取问答记录失败: ${response.status}`);
      }

      const result = await response.json();
      return result.reviews || [];
    } catch (error) {
      console.error('获取问答记录失败:', error);
      throw error;
    }
  }

  /**
   * 流式调用LLM生成面试问题
   */
  async generateQuestionStreaming(
    prompt: string,
    conversationHistory: any[],
    handler: StreamingResponse
  ): Promise<void> {
    try {
      const messages = [
        {
          role: 'system',
          content: prompt,
        },
        ...conversationHistory,
      ];

      const response = await fetch(`${this.llmRouterURL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          model: 'gpt-4o', // 可以根据用户设置选择模型
          stream: true,
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM调用失败: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取流式响应');
      }

      const decoder = new TextDecoder();
      let fullText = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.trim() === '') continue;
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                handler.onComplete(fullText);
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || '';
                if (content) {
                  fullText += content;
                  handler.onChunk(content);
                }
              } catch (parseError) {
                console.warn('解析流式响应失败:', parseError);
              }
            }
          }
        }

        handler.onComplete(fullText);
      } catch (streamError) {
        handler.onError(streamError as Error);
      }
    } catch (error) {
      handler.onError(error as Error);
    }
  }

  /**
   * 流式调用LLM分析用户回答
   */
  async analyzeAnswerStreaming(
    question: string,
    userAnswer: string,
    referenceAnswer: string,
    handler: StreamingResponse
  ): Promise<void> {
    const prompt = `请分析这个面试回答，并给出详细的评价和建议。

面试问题：${question}

候选人回答：${userAnswer}

参考答案：${referenceAnswer}

请按以下格式输出分析结果：

【优点】
列出回答的亮点和优势

【不足】
指出回答的问题和不足

【改进建议】
提供具体的改进建议

【考察点】
说明这个问题主要考察什么能力

【评分】
给出1-10分的评分并说明理由`;

    await this.generateQuestionStreaming(prompt, [], handler);
  }

  /**
   * 检查问题与题库的相似度
   */
  async findSimilarQuestions(
    question: string,
    questionBank: InterviewQuestion[],
    threshold: number = 0.6
  ): Promise<QuestionMatch[]> {
    try {
      // 使用RAG服务进行相似度计算
      const response = await fetch(`${this.ragServiceURL}/similarity/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: question,
          candidates: questionBank.map(q => ({
            id: q.id,
            text: q.question,
            metadata: q,
          })),
          threshold,
        }),
      });

      if (!response.ok) {
        console.warn('相似度检测失败，使用字符串匹配');
        return this.fallbackSimilarityCheck(question, questionBank, threshold);
      }

      const result = await response.json();
      return result.matches.map((match: any) => ({
        question: match.metadata,
        similarity: match.score,
        useAsReference: match.score >= threshold,
      }));
    } catch (error) {
      console.warn('相似度检测服务不可用，使用备选方案:', error);
      return this.fallbackSimilarityCheck(question, questionBank, threshold);
    }
  }

  /**
   * 备选的字符串相似度检查
   */
  private fallbackSimilarityCheck(
    question: string,
    questionBank: InterviewQuestion[],
    threshold: number
  ): QuestionMatch[] {
    const matches: QuestionMatch[] = [];

    for (const bankQuestion of questionBank) {
      const similarity = this.calculateStringSimilarity(question, bankQuestion.question);
      if (similarity >= threshold * 0.8) { // 降低阈值，因为字符串匹配不如向量匹配准确
        matches.push({
          question: bankQuestion,
          similarity,
          useAsReference: similarity >= threshold,
        });
      }
    }

    return matches.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * 简单的字符串相似度计算
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * 计算编辑距离
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * 构建面试初始化prompt
   */
  buildInitPrompt(jobPosition: any, resume: any, questionBank: InterviewQuestion[]): string {
    const questionsText = questionBank
      .map(q => `Q: ${q.question}\nA: ${q.answer || '无参考答案'}`)
      .join('\n\n');

    return `你是一名专业的面试官，即将开始一场${jobPosition.title || '软件开发'}的面试。

【岗位信息】
职位：${jobPosition.title || '未指定'}
描述：${jobPosition.description || '无描述'}

【候选人简历】
${resume.resumeTitle ? `简历标题：${resume.resumeTitle}` : ''}
${resume.resumeContent || '无简历内容'}

【参考押题库】（如问题相似度>60%请基于题库答案回答）
${questionsText || '无押题'}

面试规则：
1. 每次只问一个问题，等待候选人回答后再继续
2. 问题要有针对性，结合岗位要求和候选人背景
3. 问题难度要循序渐进
4. 保持专业和友好的语气
5. 总共进行10个问题的面试

请开始面试，首先进行简单的开场白和自我介绍引导。`;
  }

  /**
   * 优化ASR识别结果
   */
  async optimizeTranscription(rawText: string): Promise<string> {
    if (!rawText.trim()) return rawText;

    try {
      // 简单的文本清理
      let cleaned = rawText
        .replace(/\b(嗯+|啊+|呃+|那个|就是说|然后呢|这个)\b/g, '') // 去除语气词
        .replace(/\s+/g, ' ') // 合并多余空格
        .trim();

      // 如果清理后文本过短或包含太多重复，使用LLM优化
      if (cleaned.length < 10 || this.hasExcessiveRepetition(cleaned)) {
        const optimized = await this.optimizeWithLLM(rawText);
        return optimized || cleaned;
      }

      return cleaned;
    } catch (error) {
      console.error('文本优化失败:', error);
      return rawText; // 返回原文本
    }
  }

  /**
   * 检查是否有过多重复
   */
  private hasExcessiveRepetition(text: string): boolean {
    const words = text.split(/\s+/);
    const wordCount = new Map<string, number>();

    for (const word of words) {
      if (word.length > 1) { // 忽略单字符
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    }

    // 如果任何词出现超过3次，认为有过多重复
    for (const count of wordCount.values()) {
      if (count > 3) return true;
    }

    return false;
  }

  /**
   * 使用LLM优化转录文本
   */
  private async optimizeWithLLM(rawText: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.llmRouterURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: '请修正这段语音识别文本的语法错误和重复内容，保持原意，使其更加流畅通顺。如果文本没有意义请返回"无法理解"。',
            },
            {
              role: 'user',
              content: rawText,
            },
          ],
          model: 'gpt-4o-mini', // 使用轻量模型
          max_tokens: 200,
          temperature: 0.3,
        }),
      });

      if (!response.ok) return null;

      const result = await response.json();
      return result.choices?.[0]?.message?.content?.trim() || null;
    } catch (error) {
      console.error('LLM文本优化失败:', error);
      return null;
    }
  }
}

export const mockInterviewService = new MockInterviewService();