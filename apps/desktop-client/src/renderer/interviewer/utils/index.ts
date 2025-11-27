/**
 * ============================================================================
 * 面试工具模块索引
 * ============================================================================
 *
 * 导出所有公共工具函数，供组件使用。
 *
 * ============================================================================
 */

// 音频设备管理
export {
  type AudioDevice,
  type AudioDevices,
  type DefaultDevices,
  getAudioDevices,
  getDefaultDevices,
  saveMicrophoneDevice,
  saveSpeakerDevice,
  loadAudioDevicesWithDefaults
} from './audioDeviceManager';

// 回答分析器
export {
  type AnalysisResult,
  type ReviewData,
  type AnalyzeReviewParams,
  type BatchAnalyzeParams,
  analyzeReview,
  batchAnalyzeReviews,
  needsAnalysis,
  getCurrentModelConfig
} from './interviewAnalyzer';

// 报告生成器
export {
  type ReportGeneratorParams,
  type ScoreData,
  type InsightData,
  generateInterviewReport
} from './interviewReportGenerator';
