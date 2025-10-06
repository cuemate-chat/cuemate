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

}

export const mockInterviewService = new MockInterviewService();
