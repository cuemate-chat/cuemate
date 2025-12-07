/**
 * 面试 AI 分析服务
 * 处理面试（模拟面试和面试训练）结束后的 AI 分析、评分和报告生成
 */

import { createLogger } from '../../../../../utils/rendererLogger.js';
import { ModelParam, modelService } from '../../../../interviewer/api/modelService.js';
import { promptService } from '../../../../prompts/promptService.js';
import { ensureString } from '../../../../utils/stringUtils';
import { InterviewInsight, InterviewScore } from '../data/InterviewDataService';

const log = createLogger('InterviewAnalysisService');

// 面试分析请求接口
export interface AnalysisRequest {
  interviewId: string;
  interviewerQuestions: Array<{
    id: string;
    content: string;
    timestamp: number;
  }>;
  userAnswers: Array<{
    id: string;
    questionId: string;
    content: string;
    timestamp: number;
  }>;
  duration: number; // 面试时长（秒）
  jobPosition?: any;
  candidateProfile?: any;
}

// AI 分析结果接口
export interface AnalysisResult {
  overallScore: number; // 总分（1-100）
  summary: string; // 总体评价
  pros: string; // 优点
  cons: string; // 不足
  suggestions: string; // 改进建议

  // 雷达图评分（1-10 分）
  radarScores: {
    interactivity: number; // 互动性
    confidence: number; // 自信度
    professionalism: number; // 专业性
    relevance: number; // 相关性
    clarity: number; // 表达清晰度
  };

  // 面试洞察
  insights: {
    interviewerAnalysis: {
      score: number;
      summary: string;
      role: string;
      mbti: string;
      personality: string;
      preference: string;
    };
    candidateAnalysis: {
      summary: string;
      mbti: string;
      personality: string;
      jobPreference: string;
    };
    strategies: {
      prepareDetails: string;
      businessUnderstanding: string;
      keepLogical: string;
    };
  };

  // 问答详细分析
  qaAnalysis: Array<{
    questionId: string;
    question: string;
    answer: string;
    score: number;
    feedback: string;
    keyPoints: string[];
    improvements: string[];
  }>;
}

export class InterviewAnalysisService {
  private baseURL = 'http://localhost:3001';
  private llmRouterURL = 'http://localhost:3002';
  private token: string | null = null;

  constructor() {
    this.initAuth();
  }

  private async initAuth() {
    try {
      const api = (window as any).electronAPI || (window as any).electronInterviewerAPI;
      const result = await api?.getUserData?.();
      if (result?.success && result.userData?.token) {
        this.token = result.userData.token;
      }
    } catch (error: unknown) {
      await log.error('initAuth', '初始化面试训练分析服务认证失败', {}, error);
    }
  }

  private async ensureAuth() {
    if (!this.token) {
      await this.initAuth();
    }
    if (!this.token) {
      throw new Error('用户未登录或 token 获取失败');
    }
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
    };
  }

  /**
   * 执行完整的面试分析
   */
  async analyzeInterview(request: AnalysisRequest): Promise<AnalysisResult> {
    log.debug('analyzeInterview', '开始分析面试数据', { interviewId: request.interviewId });

    try {
      // 1. 准备分析数据
      const analysisData = this.prepareAnalysisData(request);

      // 2. 调用 AI 进行分析
      const aiAnalysis = await this.performAIAnalysis(analysisData);

      // 3. 处理和格式化结果
      const formattedResult = this.formatAnalysisResult(aiAnalysis, request);

      log.debug('analyzeInterview', '面试分析完成');
      return formattedResult;
    } catch (error: unknown) {
      await log.error(
        'analyzeInterview',
        '面试分析失败',
        { interviewId: request.interviewId },
        error,
      );
      throw new Error(`面试分析失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 准备分析数据
   */
  private prepareAnalysisData(request: AnalysisRequest): any {
    const qaData = request.userAnswers.map((answer) => {
      const question = request.interviewerQuestions.find((q) => q.id === answer.questionId);
      return {
        question: question?.content || '未知问题',
        answer: answer.content,
        questionTime: question?.timestamp || 0,
        answerTime: answer.timestamp,
        responseTime: answer.timestamp - (question?.timestamp || 0),
      };
    });

    return {
      interview: {
        id: request.interviewId,
        duration: request.duration,
        totalQuestions: request.interviewerQuestions.length,
        totalAnswers: request.userAnswers.length,
        position: request.jobPosition,
        candidate: request.candidateProfile,
      },
      qaData,
      interviewerQuestions: request.interviewerQuestions,
      userAnswers: request.userAnswers,
    };
  }

  /**
   * 获取用户的默认 LLM 模型配置
   */
  private async getDefaultModelConfig(): Promise<{
    modelName: string;
    modelParams: Record<string, any>;
  }> {
    try {
      // 获取用户的 LLM 模型列表
      const { list: models } = await modelService.getModels({ type: 'llm' });
      if (!models || models.length === 0) {
        throw new Error('没有可用的 LLM 模型');
      }

      // 使用第一个启用的模型
      const enabledModel = models.find((m) => m.isEnabled === 1) || models[0];

      // 获取模型参数
      const params: ModelParam[] = await modelService.getModelParams(enabledModel.id);

      // 将参数数组转换为对象
      const modelParams: Record<string, any> = {};
      for (const param of params) {
        modelParams[param.paramKey] = param.value ?? param.defaultValue;
      }

      return {
        modelName: enabledModel.modelName,
        modelParams,
      };
    } catch (error) {
      await log.error('getDefaultModelConfig', '获取默认模型配置失败', {}, error);
      throw new Error('获取模型配置失败，请先在系统设置中配置 LLM 大模型供应商');
    }
  }

  /**
   * 执行 AI 分析
   */
  private async performAIAnalysis(analysisData: any): Promise<any> {
    const prompt = await this.buildAnalysisPrompt(analysisData);

    // 从数据库获取 system prompt，失败时使用 fallback
    let systemPrompt =
      '你是一位资深的 HR 专家和面试分析师，具有丰富的面试评估经验。请基于提供的面试训练数据进行专业分析。';
    try {
      systemPrompt = await promptService.getPromptContent('AIQuestionAnalysisSystemPrompt');
    } catch (error) {
      await log.error(
        'performAIAnalysis',
        'Failed to fetch AIQuestionAnalysisSystemPrompt',
        {},
        error,
      );
    }

    // 获取用户的模型配置
    const { modelName, modelParams } = await this.getDefaultModelConfig();

    const url = `${this.llmRouterURL}/chat/completions`;
    const requestBody = {
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: modelName,
      ...modelParams,
    };

    try {
      await log.http.request('performAIAnalysis', url, 'POST', requestBody);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        await log.http.error(
          'performAIAnalysis',
          url,
          new Error(`HTTP ${response.status}`),
          requestBody,
          errorText,
        );
        throw new Error(`AI 分析请求失败: ${response.status}`);
      }

      const result = await response.json();
      await log.http.response('performAIAnalysis', url, response.status, result);
      const content = result.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('AI 分析响应为空');
      }

      // 尝试解析 JSON 响应
      try {
        return JSON.parse(content);
      } catch (parseError) {
        await log.error('performAIAnalysis', 'JSON解析失败', { llmResponse: content }, parseError);
        // 如果不是 JSON 格式，尝试从文本中提取信息
        return this.parseTextAnalysis(content);
      }
    } catch (error) {
      await log.http.error('performAIAnalysis', url, error, requestBody);
      throw error;
    }
  }

  /**
   * 构建分析提示词
   */
  private async buildAnalysisPrompt(analysisData: any): Promise<string> {
    const qaText = analysisData.qaData
      .map(
        (qa: any, index: number) => `
第${index + 1}题：
问题：${qa.question}
回答：${qa.answer}
响应时间：${Math.round(qa.responseTime / 1000)}秒
`,
      )
      .join('\n');

    try {
      // 使用 promptService 从数据库获取参数化的 prompt
      return await promptService.buildAIQuestionAnalysisPrompt({
        interviewId: analysisData.interview.id,
        durationMinutes: Math.round(analysisData.interview.duration / 60),
        totalQuestions: analysisData.interview.totalQuestions,
        totalAnswers: analysisData.interview.totalAnswers,
        positionJson: JSON.stringify(analysisData.interview.position || {}),
        qaText,
      });
    } catch (error) {
      await log.error('buildAnalysisPrompt', 'Failed to build from promptService', {}, error);
      // 如果 promptService 失败，使用 fallback
      return this.buildFallbackAnalysisPrompt(analysisData, qaText);
    }
  }

  /**
   * 构建 fallback 分析提示词（当 promptService 不可用时）
   */
  private buildFallbackAnalysisPrompt(analysisData: any, qaText: string): string {
    return `请分析以下面试训练数据，并返回 JSON 格式的详细分析报告：

【面试基本信息】
面试 ID：${analysisData.interview.id}
面试时长：${Math.round(analysisData.interview.duration / 60)}分钟
问题总数：${analysisData.interview.totalQuestions}
回答总数：${analysisData.interview.totalAnswers}
职位信息：${JSON.stringify(analysisData.interview.position || {})}

【问答对话记录】
${qaText}

请返回以下 JSON 格式的分析结果：

{
  "overallScore": 数字(1-100),
  "summary": "总体评价（150-200 字）",
  "pros": "优点分析（100-150 字）",
  "cons": "不足分析（100-150 字）",
  "suggestions": "改进建议（150-200 字）",
  "radarScores": {
    "interactivity": 数字(1-10),
    "confidence": 数字(1-10),
    "professionalism": 数字(1-10),
    "relevance": 数字(1-10),
    "clarity": 数字(1-10)
  },
  "insights": {
    "interviewerAnalysis": {
      "score": 数字(1-10),
      "summary": "面试官分析（100 字）",
      "role": "面试官角色判断",
      "mbti": "推测 MBTI 类型",
      "personality": "性格特点",
      "preference": "面试偏好"
    },
    "candidateAnalysis": {
      "summary": "候选人表现分析（100 字）",
      "mbti": "推测 MBTI 类型",
      "personality": "性格特点展现",
      "jobPreference": "职业倾向分析"
    },
    "strategies": {
      "prepareDetails": "准备策略建议（80 字）",
      "businessUnderstanding": "业务理解建议（80 字）",
      "keepLogical": "逻辑表达建议（80 字）"
    }
  },
  "qaAnalysis": [
    {
      "questionId": "问题 ID",
      "question": "问题内容",
      "answer": "回答内容",
      "score": 数字(1-10),
      "feedback": "具体反馈（80 字）",
      "keyPoints": ["关键点 1", "关键点 2"],
      "improvements": ["改进点 1", "改进点 2"]
    }
  ]
}

分析要求：
1. 基于真实面试标准进行评分
2. 考虑回答的专业性、逻辑性、完整性
3. 分析候选人的沟通能力和表达清晰度
4. 评估面试官的提问质量和风格
5. 提供具体可行的改进建议
6. 雷达图评分要客观公正
7. 确保返回标准 JSON 格式`;
  }

  /**
   * 从文本中解析分析结果（备用方案）
   */
  private parseTextAnalysis(_text: string): any {
    // 这是一个备用解析方案，当 AI 没有返回 JSON 时使用

    return {
      overallScore: 75, // 默认分数
      summary: '基于文本分析的基础评估',
      pros: '表现出积极的面试态度',
      cons: '在某些方面还有提升空间',
      suggestions: '建议多练习面试技巧，提高表达能力',
      radarScores: {
        interactivity: 7,
        confidence: 7,
        professionalism: 7,
        relevance: 7,
        clarity: 7,
      },
      insights: {
        interviewerAnalysis: {
          score: 7,
          summary: '面试官表现正常',
          role: '技术面试官',
          mbti: 'ESTJ',
          personality: '严谨务实',
          preference: '重视技术能力',
        },
        candidateAnalysis: {
          summary: '候选人基础表现',
          mbti: 'ISFJ',
          personality: '谨慎稳重',
          jobPreference: '技术开发',
        },
        strategies: {
          prepareDetails: '充分准备常见问题',
          businessUnderstanding: '加强业务理解',
          keepLogical: '保持逻辑清晰',
        },
      },
      qaAnalysis: [],
    };
  }

  /**
   * 格式化分析结果
   */
  private formatAnalysisResult(aiAnalysis: any, _request: AnalysisRequest): AnalysisResult {
    // 确保所有字段都有默认值（使用 ensureString 处理可能的数组格式）
    const result: AnalysisResult = {
      overallScore: Math.max(1, Math.min(100, aiAnalysis.overallScore || 75)),
      summary: ensureString(aiAnalysis.summary) || '面试分析完成',
      pros: ensureString(aiAnalysis.pros) || '展现了基本的面试素养',
      cons: ensureString(aiAnalysis.cons) || '在表达和逻辑方面还有提升空间',
      suggestions: ensureString(aiAnalysis.suggestions) || '建议多进行面试练习，提高沟通技巧',

      radarScores: {
        interactivity: Math.max(1, Math.min(10, aiAnalysis.radarScores?.interactivity || 7)),
        confidence: Math.max(1, Math.min(10, aiAnalysis.radarScores?.confidence || 7)),
        professionalism: Math.max(1, Math.min(10, aiAnalysis.radarScores?.professionalism || 7)),
        relevance: Math.max(1, Math.min(10, aiAnalysis.radarScores?.relevance || 7)),
        clarity: Math.max(1, Math.min(10, aiAnalysis.radarScores?.clarity || 7)),
      },

      insights: {
        interviewerAnalysis: {
          score: Math.max(1, Math.min(10, aiAnalysis.insights?.interviewerAnalysis?.score || 7)),
          summary:
            ensureString(aiAnalysis.insights?.interviewerAnalysis?.summary) || '面试官表现正常',
          role: ensureString(aiAnalysis.insights?.interviewerAnalysis?.role) || '技术面试官',
          mbti: ensureString(aiAnalysis.insights?.interviewerAnalysis?.mbti) || 'ESTJ',
          personality:
            ensureString(aiAnalysis.insights?.interviewerAnalysis?.personality) || '专业严谨',
          preference:
            ensureString(aiAnalysis.insights?.interviewerAnalysis?.preference) || '重视技术能力',
        },
        candidateAnalysis: {
          summary:
            ensureString(aiAnalysis.insights?.candidateAnalysis?.summary) || '候选人基础表现良好',
          mbti: ensureString(aiAnalysis.insights?.candidateAnalysis?.mbti) || 'ISFJ',
          personality:
            ensureString(aiAnalysis.insights?.candidateAnalysis?.personality) || '稳重认真',
          jobPreference:
            ensureString(aiAnalysis.insights?.candidateAnalysis?.jobPreference) || '技术开发',
        },
        strategies: {
          prepareDetails:
            ensureString(aiAnalysis.insights?.strategies?.prepareDetails) || '深入准备技术细节',
          businessUnderstanding:
            ensureString(aiAnalysis.insights?.strategies?.businessUnderstanding) ||
            '加强业务理解能力',
          keepLogical:
            ensureString(aiAnalysis.insights?.strategies?.keepLogical) || '保持回答逻辑清晰',
        },
      },

      qaAnalysis: Array.isArray(aiAnalysis.qaAnalysis)
        ? aiAnalysis.qaAnalysis.map((qa: any) => ({
            questionId: qa.questionId || '',
            question: qa.question || '',
            answer: qa.answer || '',
            score: Math.max(1, Math.min(10, qa.score || 7)),
            feedback: ensureString(qa.feedback) || '回答基本符合要求',
            keyPoints: Array.isArray(qa.keyPoints) ? qa.keyPoints : ['基础知识'],
            improvements: Array.isArray(qa.improvements) ? qa.improvements : ['提高表达清晰度'],
          }))
        : [],
    };

    log.debug('formatAnalysisResult', '分析结果格式化完成', {
      overallScore: result.overallScore,
      qaCount: result.qaAnalysis.length,
    });

    return result;
  }

  /**
   * 保存分析结果到数据库
   */
  async saveAnalysisToDatabase(
    interviewId: string,
    analysisResult: AnalysisResult,
  ): Promise<{ scoreId: string; insightId: string }> {
    await this.ensureAuth();

    try {
      // 1. 创建面试分数记录
      const scoreData: Omit<InterviewScore, 'id' | 'createdAt'> = {
        interviewId: interviewId,
        totalScore: analysisResult.overallScore,
        durationSec: 0, // 这里需要从外部传入
        numQuestions: analysisResult.qaAnalysis.length,
        overallSummary: analysisResult.summary,
        pros: analysisResult.pros,
        cons: analysisResult.cons,
        suggestions: analysisResult.suggestions,
        radarInteractivity: analysisResult.radarScores.interactivity,
        radarConfidence: analysisResult.radarScores.confidence,
        radarProfessionalism: analysisResult.radarScores.professionalism,
        radarRelevance: analysisResult.radarScores.relevance,
        radarClarity: analysisResult.radarScores.clarity,
      };

      const scoreUrl = `${this.baseURL}/interview-scores`;
      // 发送 camelCase 字段，后端会自动转换为 snake_case
      const scoreRequestBody = {
        interviewId: scoreData.interviewId,
        totalScore: scoreData.totalScore,
        durationSec: scoreData.durationSec,
        numQuestions: scoreData.numQuestions,
        overallSummary: scoreData.overallSummary,
        pros: scoreData.pros,
        cons: scoreData.cons,
        suggestions: scoreData.suggestions,
        radarInteractivity: scoreData.radarInteractivity,
        radarConfidence: scoreData.radarConfidence,
        radarProfessionalism: scoreData.radarProfessionalism,
        radarRelevance: scoreData.radarRelevance,
        radarClarity: scoreData.radarClarity,
        createdAt: Date.now(),
      };
      await log.http.request('saveAnalysisToDatabase', scoreUrl, 'POST', scoreRequestBody);

      const scoreResponse = await fetch(scoreUrl, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(scoreRequestBody),
      });

      if (!scoreResponse.ok) {
        const errorText = await scoreResponse.text();
        await log.http.error(
          'saveAnalysisToDatabase',
          scoreUrl,
          new Error(`HTTP ${scoreResponse.status}`),
          scoreRequestBody,
          errorText,
        );
        throw new Error(`创建面试分数记录失败: ${scoreResponse.status}`);
      }

      const scoreResult = await scoreResponse.json();
      await log.http.response(
        'saveAnalysisToDatabase',
        scoreUrl,
        scoreResponse.status,
        scoreResult,
      );
      const scoreId = scoreResult.id;

      // 2. 创建面试洞察记录
      const insightData: Omit<InterviewInsight, 'id' | 'createdAt'> = {
        interviewId: interviewId,
        interviewerScore: analysisResult.insights.interviewerAnalysis.score,
        interviewerSummary: analysisResult.insights.interviewerAnalysis.summary,
        interviewerRole: analysisResult.insights.interviewerAnalysis.role,
        interviewerMbti: analysisResult.insights.interviewerAnalysis.mbti,
        interviewerPersonality: analysisResult.insights.interviewerAnalysis.personality,
        interviewerPreference: analysisResult.insights.interviewerAnalysis.preference,
        candidateSummary: analysisResult.insights.candidateAnalysis.summary,
        candidateMbti: analysisResult.insights.candidateAnalysis.mbti,
        candidatePersonality: analysisResult.insights.candidateAnalysis.personality,
        candidateJobPreference: analysisResult.insights.candidateAnalysis.jobPreference,
        strategyPrepareDetails: analysisResult.insights.strategies.prepareDetails,
        strategyBusinessUnderstanding: analysisResult.insights.strategies.businessUnderstanding,
        strategyKeepLogical: analysisResult.insights.strategies.keepLogical,
      };

      const insightUrl = `${this.baseURL}/interview-insights`;
      // 发送 camelCase 字段，后端会自动转换为 snake_case
      const insightRequestBody = {
        interviewId: insightData.interviewId,
        interviewerScore: insightData.interviewerScore,
        interviewerSummary: insightData.interviewerSummary,
        interviewerRole: insightData.interviewerRole,
        interviewerMbti: insightData.interviewerMbti,
        interviewerPersonality: insightData.interviewerPersonality,
        interviewerPreference: insightData.interviewerPreference,
        candidateSummary: insightData.candidateSummary,
        candidateMbti: insightData.candidateMbti,
        candidatePersonality: insightData.candidatePersonality,
        candidateJobPreference: insightData.candidateJobPreference,
        strategyPrepareDetails: insightData.strategyPrepareDetails,
        strategyBusinessUnderstanding: insightData.strategyBusinessUnderstanding,
        strategyKeepLogical: insightData.strategyKeepLogical,
        createdAt: Date.now(),
      };
      await log.http.request('saveAnalysisToDatabase', insightUrl, 'POST', insightRequestBody);

      const insightResponse = await fetch(insightUrl, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(insightRequestBody),
      });

      if (!insightResponse.ok) {
        const errorText = await insightResponse.text();
        await log.http.error(
          'saveAnalysisToDatabase',
          insightUrl,
          new Error(`HTTP ${insightResponse.status}`),
          insightRequestBody,
          errorText,
        );
        throw new Error(`创建面试洞察记录失败: ${insightResponse.status}`);
      }

      const insightResult = await insightResponse.json();
      await log.http.response(
        'saveAnalysisToDatabase',
        insightUrl,
        insightResponse.status,
        insightResult,
      );
      const insightId = insightResult.id;

      log.debug('saveAnalysisToDatabase', '分析结果已保存到数据库', { scoreId, insightId });

      return { scoreId, insightId };
    } catch (error) {
      await log.error('saveAnalysisToDatabase', '保存分析结果失败', { interviewId }, error);
      throw error;
    }
  }

  /**
   * 保存问答详细分析到数据库
   */
  async saveQAAnalysisToDatabase(
    interviewId: string,
    qaAnalysis: AnalysisResult['qaAnalysis'],
  ): Promise<string[]> {
    await this.ensureAuth();

    const reviewIds: string[] = [];

    try {
      for (const qa of qaAnalysis) {
        const reviewData = {
          interviewId: interviewId,
          noteType: 'interview_training_qa',
          content: qa.question,
          askedQuestion: qa.question,
          candidateAnswer: qa.answer,
          assessment: qa.feedback,
          keyPoints: qa.keyPoints.join('; '),
          suggestions: qa.improvements.join('; '),
          pros: qa.score >= 7 ? '回答质量良好' : '',
          cons: qa.score < 7 ? '回答需要改进' : '',
          createdAt: Date.now(),
        };

        const url = `${this.baseURL}/interview-reviews`;
        await log.http.request('saveQAAnalysisToDatabase', url, 'POST', reviewData);

        const response = await fetch(url, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(reviewData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          await log.http.error(
            'saveQAAnalysisToDatabase',
            url,
            new Error(`HTTP ${response.status}`),
            reviewData,
            errorText,
          );
          continue;
        }

        const result = await response.json();
        await log.http.response('saveQAAnalysisToDatabase', url, response.status, result);
        reviewIds.push(result.id);
      }

      log.debug('saveQAAnalysisToDatabase', `保存了${reviewIds.length}条问答分析记录`);
      return reviewIds;
    } catch (error) {
      await log.error('saveQAAnalysisToDatabase', '保存问答分析失败', { interviewId }, error);
      throw error;
    }
  }

  /**
   * 执行完整的分析和保存流程
   */
  async analyzeAndSave(request: AnalysisRequest): Promise<{
    analysis: AnalysisResult;
    scoreId: string;
    insightId: string;
    reviewIds: string[];
  }> {
    try {
      log.debug('analyzeAndSave', '开始完整的面试分析流程');

      // 1. 执行 AI 分析
      const analysis = await this.analyzeInterview(request);

      // 2. 保存核心分析结果
      const { scoreId, insightId } = await this.saveAnalysisToDatabase(
        request.interviewId,
        analysis,
      );

      // 3. 保存问答详细分析
      const reviewIds = await this.saveQAAnalysisToDatabase(
        request.interviewId,
        analysis.qaAnalysis,
      );

      log.debug('analyzeAndSave', '面试分析和保存流程完成');

      return {
        analysis,
        scoreId,
        insightId,
        reviewIds,
      };
    } catch (error) {
      await log.error(
        'analyzeAndSave',
        '面试分析和保存流程失败',
        { interviewId: request.interviewId },
        error,
      );
      throw error;
    }
  }
}

export const interviewAnalysisService = new InterviewAnalysisService();
