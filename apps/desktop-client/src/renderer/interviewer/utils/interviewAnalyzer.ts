/**
 * ============================================================================
 * 面试回答分析器 - interviewAnalyzer
 * ============================================================================
 *
 * 提供面试回答分析的公共逻辑，供模拟面试和面试训练共用。
 *
 * 【功能】
 * 1. 分析单个回答（优缺点、建议等）
 * 2. 批量分析未分析的回答
 * 3. 保存分析结果到数据库和向量库
 *
 * ============================================================================
 */

import { logger } from '../../../utils/rendererLogger.js';
import { promptService } from '../../prompts/promptService';
import type { ModelConfig, ModelParam } from '../../utils/ai/aiService';
import { aiService } from '../../utils/ai/aiService';
import { ensureString, cleanJsonWrapper } from '../../utils/stringUtils';
import { mockInterviewService } from '../../ai-question/components/shared/services/InterviewService';

// ============================================================================
// 类型定义
// ============================================================================

export interface AnalysisResult {
  pros: string;
  cons: string;
  suggestions: string;
  keyPoints: string;
  assessment: string;
}

export interface ReviewData {
  id?: string;
  askedQuestion?: string;
  question?: string;
  candidateAnswer?: string;
  referenceAnswer?: string;
  otherId?: string;
  otherContent?: string;
  pros?: string;
  cons?: string;
  suggestions?: string;
  keyPoints?: string;
  assessment?: string;
}

export interface AnalyzeReviewParams {
  review: ReviewData;
  modelConfig: ModelConfig;
  modelParams: ModelParam[];
  onError?: (error: string) => void;
}

export interface BatchAnalyzeParams {
  interviewId: string;
  modelConfig?: ModelConfig;  // 可选，如果提供则使用此配置，否则从 userData 获取
  modelParams?: ModelParam[];
  onProgress?: (message: string) => void;
  onError?: (error: string) => void;
}

// ============================================================================
// 公共函数
// ============================================================================

/**
 * 分析单个回答
 */
export async function analyzeReview(params: AnalyzeReviewParams): Promise<AnalysisResult | null> {
  const { review, modelConfig, modelParams, onError } = params;

  try {
    const askedQuestion = review.askedQuestion || review.question || '';
    const candidateAnswer = review.candidateAnswer || '';
    const referenceAnswer = review.referenceAnswer || '';

    if (!askedQuestion || !candidateAnswer || !review.id) {
      return null;
    }

    const analysisPrompt = await promptService.buildAnalysisPrompt(
      askedQuestion,
      candidateAnswer,
      referenceAnswer
    );

    const messages = [
      {
        role: 'user' as const,
        content: analysisPrompt,
      }
    ];

    let analysisResult = '';

    await aiService.callAIStreamWithCustomModel(messages, modelConfig, modelParams, (chunk: any) => {
      if (chunk.error) {
        throw new Error(chunk.error);
      }

      if (!chunk.finished) {
        analysisResult += chunk.content;
      }
    });

    // 清理 markdown 代码块标记（AI 可能返回 ```json ... ```）
    const jsonStr = cleanJsonWrapper(analysisResult);
    const rawAnalysis = JSON.parse(jsonStr);

    // 将 AI 返回的结果统一转换为字符串（AI 可能返回数组格式）
    const analysis: AnalysisResult = {
      pros: ensureString(rawAnalysis.pros),
      cons: ensureString(rawAnalysis.cons),
      suggestions: ensureString(rawAnalysis.suggestions),
      keyPoints: ensureString(rawAnalysis.keyPoints),
      assessment: ensureString(rawAnalysis.assessment),
    };

    // 更新数据库
    await mockInterviewService.updateReview(review.id, {
      pros: analysis.pros,
      cons: analysis.cons,
      suggestions: analysis.suggestions,
      keyPoints: analysis.keyPoints,
      assessment: analysis.assessment,
      otherId: review.otherId,
      otherContent: review.otherContent,
    });

    return analysis;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '分析回答失败';
    await logger.error(`[分析器] 分析回答失败: ${error}`);
    onError?.(`分析回答失败: ${errorMsg}`);
    throw error;
  }
}

/**
 * 批量分析未分析的回答
 */
export async function batchAnalyzeReviews(params: BatchAnalyzeParams): Promise<{
  analyzed: number;
  skipped: number;
  failed: number;
}> {
  const { interviewId, onProgress, onError } = params;

  const result = {
    analyzed: 0,
    skipped: 0,
    failed: 0
  };

  try {
    // 优先使用传入的 modelConfig，否则从 userData 获取
    let modelConfig: ModelConfig;
    let modelParams: ModelParam[];

    if (params.modelConfig) {
      // 使用调用方传入的模型配置
      modelConfig = params.modelConfig;
      modelParams = params.modelParams || [];
    } else {
      // 从 userData 获取模型配置（兜底逻辑）
      const api: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
      const userDataResult = await api?.getUserData?.();
      const selectedModelData = userDataResult?.success ? userDataResult.userData?.selectedModel : null;

      if (!selectedModelData) {
        throw new Error('未选择模型');
      }

      modelConfig = {
        provider: selectedModelData.provider,
        modelName: selectedModelData.modelName,
        credentials: selectedModelData.credentials || '{}',
      };

      modelParams = userDataResult?.success ? (userDataResult.userData?.modelParams || []) : [];
    }

    // 获取所有回答记录
    const reviews = await mockInterviewService.getInterviewReviews(interviewId);

    if (!reviews || reviews.length === 0) {
      return result;
    }

    // 筛选需要分析的回答
    const needsAnalysis: ReviewData[] = [];

    for (const review of reviews) {
      if (!review.candidateAnswer) {
        result.skipped++;
        continue;
      }

      const hasAnalysis = review.pros && review.cons && review.suggestions &&
                         review.keyPoints && review.assessment;

      if (!hasAnalysis) {
        needsAnalysis.push(review);
      } else {
        result.skipped++;
      }
    }

    if (needsAnalysis.length === 0) {
      return result;
    }

    onProgress?.(`正在分析 ${needsAnalysis.length} 个回答...`);

    // 逐个分析
    for (let i = 0; i < needsAnalysis.length; i++) {
      const review = needsAnalysis[i];

      try {
        await analyzeReview({
          review,
          modelConfig,
          modelParams,
          onError
        });
        result.analyzed++;
        onProgress?.(`已分析 ${i + 1}/${needsAnalysis.length} 个回答`);
      } catch (error) {
        result.failed++;
        await logger.error(`[分析器] 分析回答 ${review.id} 失败: ${error}`);
      }
    }

    return result;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '批量分析失败';
    await logger.error(`[分析器] 批量分析失败: ${error}`);
    onError?.(`批量分析失败: ${errorMsg}`);
    throw error;
  }
}

/**
 * 检查回答是否需要分析
 */
export function needsAnalysis(review: ReviewData): boolean {
  if (!review.candidateAnswer) {
    return false;
  }

  const hasAnalysis = review.pros && review.cons && review.suggestions &&
                     review.keyPoints && review.assessment;

  return !hasAnalysis;
}

/**
 * 获取当前用户的模型配置
 */
export async function getCurrentModelConfig(): Promise<{
  modelConfig: ModelConfig;
  modelParams: ModelParam[];
} | null> {
  try {
    const api: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
    const userDataResult = await api?.getUserData?.();
    const selectedModelData = userDataResult?.success ? userDataResult.userData?.selectedModel : null;

    if (!selectedModelData) {
      return null;
    }

    return {
      modelConfig: {
        provider: selectedModelData.provider,
        modelName: selectedModelData.modelName,
        credentials: selectedModelData.credentials || '{}',
      },
      modelParams: userDataResult?.success ? (userDataResult.userData?.modelParams || []) : []
    };
  } catch {
    return null;
  }
}
