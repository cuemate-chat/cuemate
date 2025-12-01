/**
 * ============================================================================
 * 面试报告生成器 - interviewReportGenerator
 * ============================================================================
 *
 * 提供面试报告生成的公共逻辑，供模拟面试和面试训练共用。
 *
 * 【功能】
 * 1. 生成面试评分报告（Score）
 * 2. 生成面试洞察报告（Insight）
 * 3. 支持分批处理大量数据
 *
 * ============================================================================
 */

import { logger } from '../../../utils/rendererLogger.js';
import { promptService } from '../../prompts/promptService';
import { aiService } from '../../utils/ai/aiService';
import { ensureString } from '../../utils/stringUtils';
import { interviewService } from '../api/interviewService';
import { mockInterviewService } from '../../ai-question/components/shared/services/InterviewService';

// ============================================================================
// 类型定义
// ============================================================================

export interface ReportGeneratorParams {
  interviewId: string;
  jobTitle: string;
  resumeContent: string;
  durationSec: number;
  onProgress?: (message: string) => void;
  onError?: (error: string) => void;
}

export interface ScoreData {
  total_score: number;
  num_questions: number;
  radar: {
    interactivity: number;
    confidence: number;
    professionalism: number;
    relevance: number;
    clarity: number;
  };
  overall_summary: string;
  pros: string;
  cons: string;
  suggestions: string;
}

export interface InsightData {
  interviewer: {
    score: number;
    summary: string;
    role: string;
    mbti: string;
    personality: string;
    preference: string;
  };
  candidate: {
    summary: string;
    mbti: string;
    personality: string;
    job_preference: string;
  };
  strategy: {
    prepare_details: string;
    business_understanding: string;
    keep_logical: string;
  };
}

// ============================================================================
// 公共函数
// ============================================================================

/**
 * 生成面试报告（评分 + 洞察）
 */
export async function generateInterviewReport(params: ReportGeneratorParams): Promise<void> {
  const { interviewId, jobTitle, resumeContent, durationSec, onProgress, onError } = params;

  try {
    // 获取所有回答记录
    const reviews = await mockInterviewService.getInterviewReviews(interviewId);

    if (!reviews || reviews.length === 0) {
      await logger.error('[报告生成] 无面试问答记录');
      onError?.('无法生成面试报告: 没有面试问答记录');
      return;
    }

    onProgress?.('正在生成面试报告...');

    // 构建摘要数据
    const summaryData = buildSummaryData(reviews);
    const reviewsData = JSON.stringify(summaryData, null, 2);

    // 生成评分报告
    const scoreData = await generateScoreReport(jobTitle, resumeContent, reviewsData, reviews);

    // 生成洞察报告
    const insightData = await generateInsightReport(jobTitle, resumeContent, reviewsData);

    // 保存评分报告（使用 ensureString 处理可能的数组格式）
    await interviewService.saveInterviewScore({
      interviewId,
      totalScore: scoreData.total_score || 0,
      durationSec,
      numQuestions: scoreData.num_questions || 0,
      overallSummary: ensureString(scoreData.overall_summary) || '',
      pros: ensureString(scoreData.pros) || '',
      cons: ensureString(scoreData.cons) || '',
      suggestions: ensureString(scoreData.suggestions) || '',
      radarInteractivity: scoreData.radar?.interactivity || 0,
      radarConfidence: scoreData.radar?.confidence || 0,
      radarProfessionalism: scoreData.radar?.professionalism || 0,
      radarRelevance: scoreData.radar?.relevance || 0,
      radarClarity: scoreData.radar?.clarity || 0,
    });

    // 保存洞察报告（使用 ensureString 处理可能的数组格式）
    await interviewService.saveInterviewInsight({
      interviewId,
      interviewerScore: insightData.interviewer?.score || 0,
      interviewerSummary: ensureString(insightData.interviewer?.summary) || '',
      interviewerRole: ensureString(insightData.interviewer?.role) || '',
      interviewerMbti: ensureString(insightData.interviewer?.mbti) || '',
      interviewerPersonality: ensureString(insightData.interviewer?.personality) || '',
      interviewerPreference: ensureString(insightData.interviewer?.preference) || '',
      candidateSummary: ensureString(insightData.candidate?.summary) || '',
      candidateMbti: ensureString(insightData.candidate?.mbti) || '',
      candidatePersonality: ensureString(insightData.candidate?.personality) || '',
      candidateJobPreference: ensureString(insightData.candidate?.job_preference) || '',
      strategyPrepareDetails: ensureString(insightData.strategy?.prepare_details) || '',
      strategyBusinessUnderstanding: ensureString(insightData.strategy?.business_understanding) || '',
      strategyKeepLogical: ensureString(insightData.strategy?.keep_logical) || '',
    });

    onProgress?.('面试报告生成完成');

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '生成面试报告失败';
    await logger.error(`[报告生成] 生成面试报告失败: ${error}`);
    onError?.(`生成面试报告失败: ${errorMsg}`);
    throw error;
  }
}

/**
 * 构建摘要数据
 */
function buildSummaryData(reviews: any[]) {
  return {
    totalQuestions: reviews.length,
    questions: reviews.map((r, i) => ({
      index: i + 1,
      question: r.asked_question?.substring(0, 100),
      pros: r.pros || '无',
      cons: r.cons || '无',
      suggestions: r.suggestions || '无',
      keyPoints: r.key_points || '无',
      assessment: r.assessment || '无'
    }))
  };
}

/**
 * 生成评分报告
 */
async function generateScoreReport(
  jobTitle: string,
  resumeContent: string,
  reviewsData: string,
  reviews: any[]
): Promise<ScoreData> {
  try {
    const scorePrompt = await promptService.buildScorePrompt(jobTitle, resumeContent, reviewsData);
    return await aiService.callAIForJson([
      { role: 'user', content: scorePrompt }
    ]);
  } catch (error: any) {
    // 如果是 token 超限，使用分批处理
    if (error?.message?.includes('maximum context length') || error?.message?.includes('tokens')) {
      return await processBatchScore(reviews, jobTitle, resumeContent);
    }
    throw error;
  }
}

/**
 * 生成洞察报告
 */
async function generateInsightReport(
  jobTitle: string,
  resumeContent: string,
  reviewsData: string
): Promise<InsightData> {
  try {
    const insightPrompt = await promptService.buildInsightPrompt(jobTitle, resumeContent, reviewsData);
    return await aiService.callAIForJson([
      { role: 'user', content: insightPrompt }
    ]);
  } catch (error: any) {
    // 如果是 token 超限，返回空数据
    if (error?.message?.includes('maximum context length') || error?.message?.includes('tokens')) {
      return {
        interviewer: { score: 0, summary: '', role: '', mbti: '', personality: '', preference: '' },
        candidate: { summary: '', mbti: '', personality: '', job_preference: '' },
        strategy: { prepare_details: '', business_understanding: '', keep_logical: '' }
      };
    }
    throw error;
  }
}

/**
 * 分批处理评分（当数据量过大时）
 */
async function processBatchScore(
  reviews: any[],
  jobTitle: string,
  resumeContent: string
): Promise<ScoreData> {
  const batchSize = 1;
  const batches: any[][] = [];

  for (let i = 0; i < reviews.length; i += batchSize) {
    batches.push(reviews.slice(i, i + batchSize));
  }

  const batchSettledResults = await Promise.allSettled(batches.map(async (batch) => {
    const batchSummary = {
      totalQuestions: batch.length,
      questions: batch.map((r, i) => ({
        index: i + 1,
        question: r.asked_question?.substring(0, 100),
        pros: r.pros || '无',
        cons: r.cons || '无',
        suggestions: r.suggestions || '无',
      }))
    };
    const batchData = JSON.stringify(batchSummary);
    const prompt = await promptService.buildScorePrompt(jobTitle, resumeContent, batchData);
    return await aiService.callAIForJson([{ role: 'user', content: prompt }]);
  }));

  const batchResults = batchSettledResults
    .filter(result => result.status === 'fulfilled')
    .map(result => (result as PromiseFulfilledResult<any>).value);

  if (batchResults.length === 0) {
    throw new Error('所有批次处理都失败了');
  }

  // 合并结果（使用 ensureString 处理可能的数组格式）
  return {
    total_score: Math.round(batchResults.reduce((sum, r) => sum + (r.total_score || 0), 0) / batchResults.length),
    num_questions: reviews.length,
    radar: {
      interactivity: Math.round(batchResults.reduce((sum, r) => sum + (r.radar?.interactivity || 0), 0) / batchResults.length),
      confidence: Math.round(batchResults.reduce((sum, r) => sum + (r.radar?.confidence || 0), 0) / batchResults.length),
      professionalism: Math.round(batchResults.reduce((sum, r) => sum + (r.radar?.professionalism || 0), 0) / batchResults.length),
      relevance: Math.round(batchResults.reduce((sum, r) => sum + (r.radar?.relevance || 0), 0) / batchResults.length),
      clarity: Math.round(batchResults.reduce((sum, r) => sum + (r.radar?.clarity || 0), 0) / batchResults.length),
    },
    overall_summary: batchResults.map(r => ensureString(r.overall_summary)).join(' '),
    pros: batchResults.map(r => ensureString(r.pros)).join('\n'),
    cons: batchResults.map(r => ensureString(r.cons)).join('\n'),
    suggestions: batchResults.map(r => ensureString(r.suggestions)).join('\n'),
  };
}
