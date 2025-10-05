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
  question_id?: string;
  question?: string;
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

export class MockInterviewService {
  private baseURL = 'http://localhost:3001';
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
      if (data.question_id !== undefined) updateData.questionId = data.question_id;
      if (data.question !== undefined) updateData.question = data.question;
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
      const response = await fetch(
        `${this.baseURL}/interview-reviews?interview_id=${interviewId}`,
        {
          method: 'GET',
          headers,
        },
      );

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
   * 检查问题与题库的相似度
   */
  async findSimilarQuestion(
    question: string,
    jobId: string,
    threshold: number = 0.8,
  ): Promise<{ questionId?: string; question?: string; answer?: string; similarity?: number }> {
    try {
      // 使用RAG服务在向量知识库中搜索相似问题
      const response = await fetch(`${this.ragServiceURL}/similarity/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: question,
          jobId,
          threshold,
        }),
      });

      if (!response.ok) {
        console.warn('RAG服务调用失败');
        return {};
      }

      const result = await response.json();

      // 后端返回 match 对象（可能是空对象 {}）
      if (result.match && result.match.questionId) {
        return {
          questionId: result.match.questionId,
          question: result.match.question,
          answer: result.match.answer || '',
          similarity: result.match.score,
        };
      }

      // 没有匹配到，返回空对象
      return {};
    } catch (error) {
      console.warn('RAG服务不可用:', error);
      return {};
    }
  }

  /**
   * 构建面试初始化prompt
   */
  buildInitPrompt(jobPosition: any, resume: any, questionBank: InterviewQuestion[]): string {
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
   * 构建答案生成prompt
   */
  buildAnswerPrompt(
    jobPosition: any,
    resume: any,
    question: string,
    referenceAnswer?: string,
  ): string {
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

export const mockInterviewService = new MockInterviewService();
