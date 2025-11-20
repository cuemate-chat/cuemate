/**
 * 面试专用服务
 * 处理面试流程中的所有数据操作（支持模拟面试和面试训练）
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
  other_id?: string;
  other_content?: string;
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
  other_id?: string;
  other_content?: string;
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
  other_id?: string;
  other_content?: string;
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

export class InterviewService {
  private baseURL = 'http://localhost:3001';
  private ragServiceURL = 'http://localhost:3003';

  private async getToken(): Promise<string> {
    const api = (window as any).electronAPI || (window as any).electronInterviewerAPI;
    const result = await api?.getUserData?.();
    if (result?.success && result.userData?.token) {
      return result.userData.token;
    }
    throw new Error('用户未登录或 token 获取失败');
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
        otherId: data.other_id,
        otherContent: data.other_content,
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
      if (data.other_id !== undefined) updateData.otherId = data.other_id;
      if (data.other_content !== undefined) updateData.otherContent = data.other_content;

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
      return result.items || [];
    } catch (error) {
      console.error('获取问答记录失败:', error);
      throw error;
    }
  }

  /**
   * 检查问题与题库的相似度，同时查询其他文件中的项目内容
   */
  async findSimilarQuestion(
    question: string,
    jobId: string,
    threshold: number = 0.8,
  ): Promise<{
    questionId?: string;
    question?: string;
    answer?: string;
    similarity?: number;
    otherId?: string;
    otherContent?: string;
  }> {
    try {
      // 1. 查询面试押题
      const questionResponse = await fetch(`${this.ragServiceURL}/similarity/questions`, {
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

      let questionResult: any = {};
      if (questionResponse.ok) {
        const data = await questionResponse.json();
        if (data.match && data.match.questionId) {
          questionResult = {
            questionId: data.match.questionId,
            question: data.match.question,
            answer: data.match.answer || '',
            similarity: data.match.score,
          };
        }
      } else {
        console.warn('查询面试押题失败');
      }

      // 2. 查询其他文件
      const otherFilesResponse = await fetch(
        `${this.ragServiceURL}/search/other-files?query=${encodeURIComponent(question)}&k=1`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      let otherFilesResult: any = {};
      if (otherFilesResponse.ok) {
        const data = await otherFilesResponse.json();
        if (data.success && data.results && data.results.length > 0) {
          const topResult = data.results[0];
          otherFilesResult = {
            otherId: topResult.id,
            otherContent: topResult.content || '',
          };
        }
      } else {
        console.warn('查询其他文件失败');
      }

      // 3. 合并结果
      const mergedResult = {
        ...questionResult,
        ...otherFilesResult,
      };

      console.log('[InterviewService] 查询结果', {
        hasQuestion: !!questionResult.questionId,
        hasOtherFile: !!otherFilesResult.otherId,
      });

      return mergedResult;
    } catch (error) {
      console.warn('RAG 服务不可用:', error);
      return {};
    }
  }

  /**
   * 查询所有岗位的押题（用于语音提问场景）
   * 不需要指定 jobId，会查询所有岗位
   */
  async findSimilarQuestionInAllJobs(
    question: string,
    threshold: number = 0.8,
  ): Promise<{
    questionId?: string;
    question?: string;
    answer?: string;
    similarity?: number;
    otherId?: string;
    otherContent?: string;
  }> {
    try {
      // 调用统一接口，查询所有 ChromaDB 集合（岗位信息、简历信息、面试押题、其他文件）
      const response = await fetch(`${this.ragServiceURL}/similarity/questions/all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: question,
          threshold,
        }),
      });

      if (!response.ok) {
        console.warn('查询 ChromaDB 失败');
        return {};
      }

      const data = await response.json();

      if (!data.success || !data.match) {
        console.log('[InterviewService] 未找到匹配结果');
        return {};
      }

      const match = data.match;

      const result = {
        questionId: match.questionId,
        question: match.question,
        answer: match.answer || '',
        similarity: match.score,
        otherId: match.otherId,
        otherContent: match.otherContent || '',
      };

      console.log('[InterviewService] 查询所有 ChromaDB 集合结果', {
        hasQuestion: !!result.questionId,
        hasOtherContent: !!result.otherContent,
        similarity: result.similarity,
      });

      return result;
    } catch (error) {
      console.warn('RAG 服务不可用:', error);
      return {};
    }
  }

  /**
   * 保存 AI 向量记录到 ChromaDB
   * （当使用了押题或其他文件时调用）
   */
  async saveAIVectorRecord(data: {
    id: string;
    interview_id: string;
    note_type: string;
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
    other_id?: string;
    other_content?: string;
    created_at: number;
  }): Promise<boolean> {
    try {
      const response = await fetch(`${this.ragServiceURL}/ai-vector-records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.error('保存 AI 向量记录失败:', response.status);
        return false;
      }

      const result = await response.json();
      return result.success || false;
    } catch (error) {
      console.error('保存 AI 向量记录失败:', error);
      return false;
    }
  }

}

// 导出单例 - 向后兼容，保留 mockInterviewService
export const interviewService = new InterviewService();
export const mockInterviewService = interviewService; // 别名，用于向后兼容
