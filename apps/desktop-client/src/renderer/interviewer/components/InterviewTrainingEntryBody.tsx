/**
 * ============================================================================
 * 面试训练模式入口组件 - InterviewTrainingEntryBody
 * ============================================================================
 *
 * 【核心原则】
 * voiceState 只存 interviewId，所有数据 100% 从数据库获取
 *
 * 【流程概述】
 * 面试训练模式的完整流程分为以下步骤：
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  第一步：初始化                                                           │
 * │  - 检查是否有可恢复的训练（从 voiceState 获取 interviewId，查数据库恢复）     │
 * │  - 加载音频设备配置                                                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  第二步：用户点击"开始面试训练"                                            │
 * │  - 创建面试记录（数据库）                                                  │
 * │  - 初始化状态机                                                           │
 * │  - 开始监听扬声器（面试官语音）                                             │
 * │  - 保存 interviewId 到 voiceState                                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  第三步：监听面试官提问 (LISTENING_INTERVIEWER)                            │
 * │  - 扬声器实时识别面试官语音                                                │
 * │  - 手动模式：用户点击"提问完毕"                                            │
 * │  - 自动模式：5秒静音+>=5字自动触发                                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  第四步：生成 AI 参考答案 (GENERATING_ANSWER)                              │
 * │  - 调用向量知识库搜索相似问题                                              │
 * │  - 调用 LLM 生成参考答案                                                  │
 * │  - 【数据库】创建问答记录 (createReview)                                   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  第五步：用户查看答案并准备回答 (USER_LISTENING)                            │
 * │  - 显示 AI 参考答案                                                       │
 * │  - 用户可以开始录音回答                                                    │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  第六步：用户回答中 (USER_SPEAKING)                                        │
 * │  - 用户通过语音或文本输入回答                                              │
 * │  - 用户点击"完成回答"提交                                                  │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  第七步：AI 分析用户回答 (AI_ANALYZING)                                    │
 * │  - 调用 LLM 分析用户回答（优缺点、建议等）                                   │
 * │  - 【数据库】更新问答记录 (updateReview: 用户回答 + 分析结果)               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  第八步：本轮完成 (ROUND_COMPLETE)                                         │
 * │  - 判断是否继续下一轮                                                      │
 * │  - 继续：返回第三步                                                        │
 * │  - 结束：进入第九步                                                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  第九步：生成面试报告 (GENERATING_REPORT)                                   │
 * │  - 汇总所有轮次的分析结果                                                  │
 * │  - 调用 LLM 生成综合评分和建议                                             │
 * │  - 【数据库】保存报告 (saveInterviewScore + saveInterviewInsight)          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  第十步：面试训练完成 (COMPLETED)                                          │
 * │  - 显示完成提示                                                           │
 * │  - 【数据库】更新面试状态为 completed                                      │
 * │  - 清理 voiceState                                                       │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * 【数据安全规则】
 * 1. voiceState 只存 interviewId，所有数据从数据库获取
 * 2. 页面刷新后通过 interviewId 查询数据库恢复
 * 3. 数据库是唯一数据源，不存在数据不一致问题
 * 4. interviewId 只在用户主动停止或面试正常完成时才清理
 *
 * ============================================================================
 */

import * as Tooltip from '@radix-ui/react-tooltip';
import { ChevronDown, CornerDownLeft, Pause, Play, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { startSpeakerRecognition } from '../../../utils/audioRecognition';
import { createLogger, logger } from '../../../utils/rendererLogger.js';
import { getTimerState, setTimerState } from '../../../utils/timerState';
import { setVoiceState, useVoiceState } from '../../../utils/voiceState';
import { interviewDataService } from '../../ai-question/components/shared/data/InterviewDataService';
import { contextManagementService } from '../../ai-question/components/shared/services/ContextManagementService';
import { mockInterviewService } from '../../ai-question/components/shared/services/InterviewService';
import { TrainingState } from '../../ai-question/components/shared/state/TrainingStateMachine';
import { promptService } from '../../prompts/promptService';
import type { ModelConfig, ModelParam } from '../../utils/ai/aiService';
import { aiService } from '../../utils/ai/aiService';
import { currentInterview } from '../../utils/currentInterview';
import {
  canStartInterviewAsync,
  getInterviewTypeName,
  type OngoingInterviewInfo,
} from '../../utils/interviewGuard';
import { setInterviewTrainingState, useInterviewTrainingState } from '../../utils/interviewTrainingState';
import {
  getResumingTrainingInterviewId,
  getSpeakerController,
  getTrainingStateMachine,
  restoreInterviewTraining,
  setSpeakerController,
  startInterviewTraining,
  stopInterviewTraining,
} from '../../utils/trainingManager';
import { interviewService } from '../api/interviewService';
import { JobPosition } from '../api/jobPositionService';
import { Model, modelService } from '../api/modelService';
import {
  analyzeReview,
  batchAnalyzeReviews,
  generateInterviewReport as generateReport,
  getCurrentModelConfig,
  loadAudioDevicesWithDefaults,
  saveMicrophoneDevice,
  saveSpeakerDevice,
  type AudioDevice
} from '../utils';
import { onInterviewCommand } from '../utils/interviewCommandChannel';
import { JobPositionCard } from './JobPositionCard';

// ============================================================================
// 类型定义
// ============================================================================

interface InterviewTrainingEntryBodyProps {
  selectedJobId?: string;
  onStart?: () => void;
}

// 当前问题的临时数据（用于分析时保存到数据库）
interface CurrentQuestionData {
  sequence: number;
  questionId?: string;
  question?: string;
  answer?: string;
  referenceAnswer?: string;
  candidateAnswer?: string;
  otherId?: string;
  otherContent?: string;
}

// ============================================================================
// Logger
// ============================================================================

const log = createLogger('InterviewTrainingEntryBody');

// ============================================================================
// 主组件
// ============================================================================

export function InterviewTrainingEntryBody({ selectedJobId, onStart }: InterviewTrainingEntryBodyProps) {
  // ---------------------------------------------------------------------------
  // 状态定义
  // ---------------------------------------------------------------------------

  // UI 状态
  const [currentLine, setCurrentLine] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [timestamp, setTimestamp] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);

  // 选择状态
  const [selectedPosition, setSelectedPosition] = useState<JobPosition | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'zh-CN' | 'zh-TW' | 'en-US'>('zh-CN');

  // 音频设备
  const [micDevices, setMicDevices] = useState<AudioDevice[]>([]);
  const [speakerDevices, setSpeakerDevices] = useState<AudioDevice[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('');

  // 状态机状态（仅用于触发 UI 更新，实际状态由 trainingManager 管理）
  const [_interviewState, setInterviewState] = useState<TrainingState>(TrainingState.IDLE);

  // 互斥保护
  const [_blockingInterview, setBlockingInterview] = useState<OngoingInterviewInfo | null>(null);

  // 当前问题数据（临时存储，用于分析时保存）
  const currentQuestionData = useRef<CurrentQuestionData | null>(null);

  // 全局状态
  const voiceState = useVoiceState();
  const trainingState = useInterviewTrainingState();

  // ===========================================================================
  // 第一步：初始化 - 检查恢复 & 加载设备
  // ===========================================================================

  /**
   * 【第一步-A】加载音频设备配置
   * - 获取系统音频设备列表
   * - 回填之前保存的默认设备
   */
  useEffect(() => {
    const loadAudioSettings = async () => {
      try {
        const { devices, selectedMic: mic, selectedSpeaker: speaker } = await loadAudioDevicesWithDefaults();

        setMicDevices(devices.microphones);
        setSpeakerDevices(devices.speakers);
        setSelectedMic(mic);
        setSelectedSpeaker(speaker);

      } catch (error) {
        await logger.error(`[第一步-A] 加载音频设备失败: ${error}`);
      } finally {
        setLoading(false);
      }
    };

    loadAudioSettings();
  }, []);

  /**
   * 【第一步-B】检查并恢复面试训练数据
   * 用户点击"面试训练"进入此组件时触发
   * 从持久化文件读取 trainingInterviewId，查询数据库恢复所有数据
   */
  useEffect(() => {
    const recoverTraining = async () => {
      try {
        // 从持久化文件获取 trainingInterviewId
        const trainingInterviewId = await getResumingTrainingInterviewId();
        if (!trainingInterviewId) {
          return;
        }

        // 查询数据库获取训练数据
        const result = await interviewService.getInterview(trainingInterviewId);
        if (!result || !result.interview) {
          return;
        }

        const interview = result.interview;

        // 只处理训练类型
        if (interview.interviewType !== 'training') {
          return;
        }

        const dbStatus = interview.status as string;

        // 【恢复】设置 voiceState
        setVoiceState({
          mode: 'interview-training',
          subState: dbStatus as any,
          interviewId: trainingInterviewId,
        });

        // 【恢复】设置 currentInterview
        currentInterview.set(trainingInterviewId);

        // 【恢复】岗位信息
        if (interview.jobTitle) {
          setSelectedPosition({
            id: interview.jobId,
            title: interview.jobTitle,
            description: interview.jobContent,
            resumeId: interview.resumesId,
            resumeTitle: interview.resumesTitle,
            resumeContent: interview.resumesContent,
            // 恢复时这些字段不重要，使用默认值
            userId: '',
            status: 'active',
            createdAt: 0,
            vectorStatus: 0,
          });
        }

        // 【恢复】设备配置
        if (interview.microphoneDeviceId) {
          setSelectedMic(interview.microphoneDeviceId);
        }
        if (interview.speakerDeviceId) {
          setSelectedSpeaker(interview.speakerDeviceId);
        }

        // 【恢复】问题数据，同步给其他窗口
        if (result.questions && result.questions.length > 0) {
          const lastQuestion = result.questions[result.questions.length - 1];
          setCurrentLine(lastQuestion.askedQuestion || lastQuestion.question || '');
          setInterviewTrainingState({
            interviewState: interview.interviewState,
            aiMessage: lastQuestion.referenceAnswer || '',
            candidateAnswer: lastQuestion.candidateAnswer || '',
            interviewerQuestion: lastQuestion.askedQuestion || lastQuestion.question || '',
            isLoading: false,
          });
        }

        // 【恢复】计时器
        setTimerState({
          duration: interview.duration || 0,
          isRunning: dbStatus === 'interview-training-recording' || dbStatus === 'interview-training-playing',
        });

        // 【恢复】如果训练未结束，恢复状态机以继续训练流程
        const isEnded = dbStatus === 'interview-training-completed' ||
                        dbStatus === 'interview-training-error' ||
                        dbStatus === 'interview-training-expired';

        if (!isEnded) {
          const machine = await restoreInterviewTraining(trainingInterviewId);
          if (!machine) {
            await logger.error('[恢复训练] 恢复状态机失败');
            return;
          }

          const context = machine.getContext();
          const currentState = machine.getState();

          // 监听状态机变化
          machine.onStateChange(async (state, ctx) => {
            setInterviewState(state);
            await handleStateChange(state, ctx);
          });

          // 恢复数据服务
          interviewDataService.initializeInterview(
            context.interviewId,
            context.totalQuestions
          );

          // 更新跨窗口状态
          setInterviewTrainingState({
            interviewState: currentState,
            aiMessage: context.referenceAnswer || '',
            interviewerQuestion: context.currentQuestion || '',
            isListening: currentState === TrainingState.USER_LISTENING,
            currentPhase: currentState === TrainingState.LISTENING_INTERVIEWER ? 'listening-interviewer' : undefined,
          });

          // 更新显示
          if (context.currentQuestion) {
            setCurrentLine(context.currentQuestion);
          } else {
            setCurrentLine(`训练已恢复，当前第 ${context.currentQuestionIndex + 1} 题`);
          }
        }

      } catch (error) {
        await logger.error(`[恢复训练] 失败: ${error}`);
      }
    };

    // 延迟执行，确保组件完全加载
    const timer = setTimeout(recoverTraining, 200);
    return () => clearTimeout(timer);
  }, []);

  // ===========================================================================
  // 第二步：开始面试训练
  // ===========================================================================

  /**
   * 【第二步】用户点击"开始面试训练"按钮
   * - 检查互斥（是否有其他面试进行中）
   * - 创建面试记录到数据库
   * - 初始化状态机
   * - 开始监听扬声器
   */
  const handleStartInterview = async () => {
    // 【检查】互斥保护（异步查询数据库确认是否有进行中的面试）
    const { canStart, blockingInterview: blocking } = await canStartInterviewAsync('interview-training');
    if (!canStart && blocking) {
      setBlockingInterview(blocking);
      const typeName = getInterviewTypeName(blocking.type);
      setErrorMessage(`无法开始面试训练：您有一个未完成的${typeName}（${blocking.jobPositionTitle || '未知岗位'}）。请先完成或结束该面试。`);
      setCurrentLine('');
      return;
    }
    setBlockingInterview(null);

    // 【检查】必要参数
    if (!selectedPosition) {
      setErrorMessage('请先选择面试岗位');
      setCurrentLine('');
      return;
    }

    if (!selectedModel) {
      setErrorMessage('请先选择 AI 模型');
      setCurrentLine('');
      return;
    }

    try {
      setIsInitializing(true);

      // 【创建】获取用户信息
      const api: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
      const userDataResult = await api?.getUserData?.();
      const userData = userDataResult?.success ? userDataResult.userData?.user : null;

      // 【创建】面试记录数据
      const interviewData = {
        jobId: selectedPosition.id,
        jobTitle: selectedPosition.title,
        jobContent: selectedPosition.description,
        questionCount: selectedPosition.questionCount || 10,
        resumesId: selectedPosition.resumeId,
        resumesTitle: selectedPosition.resumeTitle,
        resumesContent: selectedPosition.resumeContent,
        interviewType: 'training' as const,
        status: 'interview-training-recording' as const,
        message: '面试训练进行中',
        locale: selectedLanguage,
        timezone: userData?.timezone || 'Asia/Shanghai',
        theme: userData?.theme || 'system',
        selectedModelId: selectedModel?.id
      };

      // 【创建】保存到数据库
      const response = await interviewService.createInterview(interviewData);

      // 【保存】设置 interview_id（这是最关键的数据，绝对不能丢失！）
      currentInterview.clear();
      currentInterview.set(response.id);

      // 【持久化】保存面试训练 ID 到文件（用于恢复）
      try {
        await api?.trainingInterviewId?.set?.(response.id);
      } catch (e) {
        await logger.error(`保存面试训练 ID 到文件失败: ${e}`);
      }

      // 【保存】初始化跨窗口状态
      setInterviewTrainingState({
        aiMessage: '',
        speechText: '',
        candidateAnswer: '',
        interviewerQuestion: '',
        isLoading: false,
        isListening: false,
        currentPhase: 'listening-interviewer',
      });

      // 【保存】设置 voiceState（会自动同步到其他窗口）
      setVoiceState({
        interviewId: response.id,
        mode: 'interview-training',
        subState: 'interview-training-recording',
      });

      // 【初始化】数据服务
      interviewDataService.initializeInterview(response.id, interviewData.questionCount);

      // 【初始化】上下文管理服务
      await contextManagementService.initialize({
        interviewId: response.id,
        resume: interviewData.resumesContent || '',
        jd: interviewData.jobContent || '',
      });

      // 【第三步开始】开始监听扬声器
      await startListeningInterviewer();

      setCurrentLine('正在监听面试官提问...');
      setErrorMessage('');
      setIsInitializing(false);

      if (onStart) {
        onStart();
      }
    } catch (error) {
      await logger.error(`[第二步] 开始面试训练失败: ${error}`);
      const errorMsg = `开始面试训练失败: ${error instanceof Error ? error.message : '未知错误'}`;
      setErrorMessage(errorMsg);
      setCurrentLine('');
      setIsInitializing(false);

      // 更新数据库状态为错误
      if (voiceState.interviewId) {
        try {
          await interviewService.updateInterview(voiceState.interviewId, {
            status: 'idle',
            message: errorMsg
          });
        } catch (updateError) {
          await logger.error(`[第二步] 更新面试错误状态失败: ${updateError}`);
        }
      }
    }
  };

  // ===========================================================================
  // 第三步：监听面试官提问
  // ===========================================================================

  /**
   * 【第三步-A】开始监听扬声器（面试官提问）
   */
  const startListeningInterviewer = async () => {
    try {
      const controller = await startSpeakerRecognition({
        deviceId: selectedSpeaker || undefined,
        sessionId: 'interviewer-training',
        onText: (text) => {
          // 实时更新面试官问题文本
          setInterviewTrainingState({
            interviewerQuestion: text,
            lastInterviewerSpeechTime: Date.now()
          });
        },
        onError: async (errorMessage) => {
          await logger.error(`[第三步-A] 扬声器识别错误: ${errorMessage}`);
          setErrorMessage(`扬声器识别错误: ${errorMessage}`);
          setInterviewTrainingState({
            currentPhase: undefined,
            interviewerQuestion: ''
          });
        },
        onOpen: () => {},
        onClose: () => {},
      });

      // 【保存】扬声器控制器到全局管理器（会触发持久化）
      setSpeakerController(controller, {
        deviceId: selectedSpeaker || '',
        sessionId: 'interviewer-training',
      });

      setInterviewTrainingState({
        currentPhase: 'listening-interviewer',
        interviewerQuestion: '',
      });
    } catch (error) {
      await logger.error(`[第三步-A] 启动扬声器监听失败: ${error}`);
      throw error;
    }
  };

  /**
   * 【第三步-B】停止监听扬声器
   */
  const stopListeningInterviewer = async () => {
    try {
      const controller = getSpeakerController();
      if (controller) {
        await controller.stop();
      }
    } catch (error) {
      await logger.error(`[第三步-B] 停止扬声器监听失败: ${error}`);
    }
  };

  /**
   * 【第三步-C】自动模式：检测面试官问题完成（5秒静音 + >=5字）
   */
  useEffect(() => {
    if (!trainingState.isAutoMode) return;
    if (voiceState.subState !== 'interview-training-recording') return;
    if (trainingState.currentPhase !== 'listening-interviewer') return;

    const timer = setInterval(() => {
      const now = Date.now();
      const silenceDuration = now - trainingState.lastInterviewerSpeechTime;
      const question = trainingState.interviewerQuestion.trim();

      // 检查: 5秒静音 + 至少5个字符
      if (silenceDuration >= 5000 && question.length >= 5 && trainingState.lastInterviewerSpeechTime > 0) {
        handleAutoQuestionDetected(question);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [
    trainingState.isAutoMode,
    trainingState.lastInterviewerSpeechTime,
    trainingState.interviewerQuestion,
    trainingState.currentPhase,
    voiceState.subState
  ]);

  /**
   * 【第三步-D】手动模式：用户点击"提问完毕"
   */
  const handleQuestionComplete = async () => {
    try {
      await stopListeningInterviewer();

      const interviewerQuestion = trainingState.interviewerQuestion;

      if (!interviewerQuestion || interviewerQuestion.length < 5) {
        setErrorMessage('面试官问题太短，请重新提问');
        await startListeningInterviewer();
        return;
      }

      // 【保存】当前问题到显示
      setCurrentLine(interviewerQuestion);

      setInterviewTrainingState({
        currentPhase: 'ai-generating',
        isLoading: true,
      });

      // 【创建/更新】状态机
      const interviewId = currentInterview.get();
      if (!interviewId) {
        throw new Error('面试 ID 不存在，无法继续');
      }

      if (!getTrainingStateMachine()) {
        // 首次创建状态机
        const initialContext = {
          interviewId: interviewId,
          jobPosition: selectedPosition,
          resume: {
            resumeTitle: selectedPosition?.resumeTitle,
            resumeContent: selectedPosition?.resumeContent,
          },
          questionsBank: [],
          currentQuestionIndex: 0,
          totalQuestions: selectedPosition?.questionCount || 10,
          currentQuestion: interviewerQuestion,
        };

        const machine = startInterviewTraining(initialContext);

        machine.onStateChange(async (state, context) => {
          setInterviewState(state);
          await handleStateChange(state, context);
        });

        // 发送事件进入生成答案阶段
        machine.send({
          type: 'QUESTION_RECEIVED',
          payload: { question: interviewerQuestion }
        });
      } else {
        // 更新现有状态机
        const machine = getTrainingStateMachine();
        if (machine) {
          machine.updateContextPartial({
            currentQuestion: interviewerQuestion,
          });

          machine.send({
            type: 'QUESTION_RECEIVED',
            payload: { question: interviewerQuestion }
          });
        }
      }

    } catch (error) {
      await logger.error(`[第三步-D] 处理提问完毕失败: ${error}`);
      setErrorMessage(`处理提问完毕失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  /**
   * 【第三步-E】自动模式下的问题检测处理
   */
  const handleAutoQuestionDetected = async (question: string) => {
    try {
      // 如果有上一轮的 review ID，先保存并分析上一轮
      if (trainingState.currentRoundReviewId) {
        await saveAndAnalyzePreviousRound(trainingState.currentRoundReviewId);
      }

      // 清空扬声器文本，准备接收新问题
      setInterviewTrainingState({
        interviewerQuestion: '',
        lastInterviewerSpeechTime: 0,
      });

      // 【保存】当前问题
      setCurrentLine(question);
      setInterviewTrainingState({
        currentPhase: 'ai-generating',
        isLoading: true,
      });

      const interviewId = currentInterview.get();
      if (!interviewId) {
        throw new Error('面试 ID 不存在');
      }

      // 创建或更新状态机
      if (!getTrainingStateMachine()) {
        const initialContext = {
          interviewId: interviewId,
          jobPosition: selectedPosition,
          resume: {
            resumeTitle: selectedPosition?.resumeTitle,
            resumeContent: selectedPosition?.resumeContent,
          },
          questionsBank: [],
          currentQuestionIndex: 0,
          totalQuestions: selectedPosition?.questionCount || 10,
          currentQuestion: question,
        };

        const machine = startInterviewTraining(initialContext);

        machine.onStateChange(async (state, context) => {
          setInterviewState(state);
          await handleStateChange(state, context);
        });
      } else {
        const machine = getTrainingStateMachine();
        if (machine) {
          const context = machine.getContext();
          machine.updateContextPartial({
            currentQuestion: question,
            currentQuestionIndex: context.currentQuestionIndex + 1,
          });
        }
      }

      // 【保存】创建新的 review 记录
      const newReview = await mockInterviewService.createReview({
        interviewId: interviewId,
        content: question,
        askedQuestion: question,
      });

      setInterviewTrainingState({
        currentRoundReviewId: newReview.id,
      });

      // 【第四步】生成 AI 答案
      const machine = getTrainingStateMachine();
      if (machine) {
        await generateAnswerInBackground(machine.getContext());
        machine.send({ type: 'ANSWER_GENERATED' });
      }

    } catch (error) {
      await logger.error(`[第三步-E] 自动问题检测处理失败: ${error}`);
      setErrorMessage(`自动问题检测处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // ===========================================================================
  // 第四步：生成AI参考答案
  // ===========================================================================

  /**
   * 【第四步】生成AI参考答案
   * - 搜索向量知识库
   * - 调用LLM生成答案
   * - 【保存】答案到状态机和UI
   */
  const generateAnswerInBackground = async (context: any) => {
    setErrorMessage('');

    try {
      if (!selectedModel) {
        throw new Error('未选择模型');
      }

      // 【搜索】向量知识库
      const similarQuestion = await mockInterviewService.findSimilarQuestion(
        context.currentQuestion,
        context.jobPosition.id,
        0.8
      );

      // 提取各类内容
      const referenceAnswerFromBank = similarQuestion?.answer || '';
      const jobContent = similarQuestion?.jobContent || '';
      const resumeContent = similarQuestion?.resumeContent || '';
      const otherFileContent = similarQuestion?.otherContent || '';

      // 使用数据库中的 AnswerPrompt 模板
      // 注意：优先使用当前面试的简历数据 context.resume，而不是向量数据库返回的可能过时的数据
      // 向量数据库的 resumeContent 仅作为备用（当当前面试没有简历数据时）
      const answerQuestionPrompt = await promptService.buildAnswerPrompt(
        {
          title: context.jobPosition?.title || '',
          description: jobContent || context.jobPosition?.description || '',
        },
        {
          resumeTitle: context.resume?.resumeTitle || '',
          resumeContent: context.resume?.resumeContent || resumeContent || '',
        },
        context.currentQuestion,
        referenceAnswerFromBank || undefined,
      );

      // 如果有其他文件内容，追加到 prompt
      let finalPrompt = answerQuestionPrompt;
      if (otherFileContent) {
        finalPrompt += `\n\n【相关项目资料】\n${otherFileContent}`;
      }

      // 使用优化后的上下文
      const optimizedMessages = await contextManagementService.getOptimizedContext(finalPrompt);

      const modelConfig: ModelConfig = {
        provider: selectedModel.provider,
        modelName: selectedModel.modelName,
        credentials: selectedModel.credentials || '{}',
      };

      // 获取当前选中模型的参数
      const modelParams: ModelParam[] = await modelService.getModelParams(selectedModel.id);

      let referenceAnswer = '';

      await aiService.callAIStreamWithCustomModel(optimizedMessages, modelConfig, modelParams, async (chunk) => {
        if (chunk.error) {
          getTrainingStateMachine()?.send({ type: 'GENERATION_ERROR', payload: { error: chunk.error } });
          return;
        }

        if (chunk.finished) {
          referenceAnswer = referenceAnswer.trim();

          // 【保存】同步更新状态机的 context.referenceAnswer（触发持久化）
          const machine = getTrainingStateMachine();
          if (machine) {
            machine.updateContextPartial({ referenceAnswer: referenceAnswer });
          }

          // 【保存】暂存问题数据到本地状态
          currentQuestionData.current = {
            sequence: context.currentQuestionIndex,
            questionId: similarQuestion?.questionId,
            question: similarQuestion?.question,
            answer: similarQuestion?.answer,
            referenceAnswer: referenceAnswer,
            otherId: similarQuestion?.otherId,
            otherContent: similarQuestion?.otherContent,
          };

          // 【保存】更新UI显示
          setInterviewTrainingState({
            aiMessage: referenceAnswer,
          });

        } else {
          referenceAnswer += chunk.content;
          // 流式显示
          setInterviewTrainingState({
            aiMessage: referenceAnswer,
          });
        }
      });
    } catch (error) {
      log.error('generateAnswerInBackground', 'generateAnswerInBackground 失败', undefined, error);
      // 显示错误消息给用户
      const errorMsg = `AI 参考答案生成失败: ${error instanceof Error ? error.message : '未知错误'}`;
      setInterviewTrainingState({ aiMessage: errorMsg });
    }
  };

  // ===========================================================================
  // 第五步 & 第六步：用户查看答案并回答
  // ===========================================================================

  /**
   * 监听用户回答提交
   */
  useEffect(() => {
    const candidateAnswer = trainingState.candidateAnswer;

    if (candidateAnswer) {
      const machine = getTrainingStateMachine();
      if (machine) {
        const currentState = machine.getState();

        if (currentState === TrainingState.USER_LISTENING ||
            currentState === TrainingState.USER_SPEAKING) {

          // 【保存】用户回答
          if (currentQuestionData.current) {
            currentQuestionData.current.candidateAnswer = candidateAnswer;
          }

          machine.send({
            type: 'USER_FINISHED_SPEAKING',
            payload: { response: candidateAnswer }
          });
        } else {
          // 非法状态下提交，忽略
          setInterviewTrainingState({ candidateAnswer: '' });
        }
      }
    }
  }, [trainingState.candidateAnswer]);

  /**
   * 监听来自 control-bar 的面试控制命令
   */
  useEffect(() => {
    const unsubscribe = onInterviewCommand((cmd) => {
      // 只处理面试训练的命令
      if (cmd.mode !== 'interview-training') return;

      switch (cmd.type) {
        case 'pause':
          handlePauseInterview();
          break;
        case 'resume':
          handleResumeInterview();
          break;
        case 'stop':
          handleStopInterview();
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // ===========================================================================
  // 状态机事件处理
  // ===========================================================================

  /**
   * 处理状态机状态变化
   * 【重要】每个状态变化都会触发 trainingManager 的持久化
   */
  const handleStateChange = async (state: TrainingState, context: any) => {
    // 【保存】更新跨窗口状态
    setInterviewTrainingState({ interviewState: state });

    // 保存状态和时长到数据库（恢复时可以继续计时）
    if (context.interviewId) {
      try {
        await interviewService.updateInterview(context.interviewId, {
          interviewState: state,
          duration: getTimerState().duration || 0,
        });
      } catch (error) {
        log.error('handleStateChange', '保存 interviewState/duration 到数据库失败', undefined, error);
      }
    }

    try {
      switch (state) {
        case TrainingState.LISTENING_INTERVIEWER:
          // 已在 startListeningInterviewer 中处理
          break;

        case TrainingState.GENERATING_ANSWER:
          // 【第四步】生成答案
          await handleGeneratingAnswer(context);
          break;

        case TrainingState.USER_LISTENING:
          // 【第五步】用户查看答案
          handleUserListening();
          break;

        case TrainingState.USER_SPEAKING:
          // 【第六步】用户回答中
          handleUserSpeaking();
          break;

        case TrainingState.AI_ANALYZING:
          // 【第七步】AI分析用户回答
          await handleAIAnalyzing(context);
          break;

        case TrainingState.ROUND_COMPLETE:
          // 【第八步】本轮完成
          await handleRoundComplete(context);
          break;

        case TrainingState.INTERVIEW_ENDING:
          // 面试即将结束
          await handleInterviewEnding();
          break;

        case TrainingState.GENERATING_REPORT:
          // 【第九步】生成报告
          transitionToNext('REPORT_COMPLETE');
          break;

        case TrainingState.COMPLETED:
          // 【第十步】面试训练完成
          await handleInterviewCompleted();
          break;

        case TrainingState.ERROR:
          handleError(context);
          break;
      }
    } catch (error) {
      await logger.error(`[状态处理] 错误: ${error}`);
      setErrorMessage(`状态处理错误: ${error instanceof Error ? error.message : '未知错误'}`);
      setCurrentLine('');
    } finally {
      setIsInitializing(false);
    }
  };

  /**
   * 【第四步】生成答案阶段
   */
  const handleGeneratingAnswer = async (context: any) => {
    try {
      const question = context.currentQuestion;
      if (!question) throw new Error('No question available');

      setCurrentLine(question);

      // 创建问题记录
      const existingQuestion = interviewDataService.getQuestionState(context.currentQuestionIndex);
      if (!existingQuestion || !existingQuestion.reviewId) {
        await interviewDataService.createQuestionRecord(context.currentQuestionIndex, question);
      }

      // 生成答案
      await generateAnswerInBackground(context);

      // 发送完成事件
      getTrainingStateMachine()?.send({ type: 'ANSWER_GENERATED' });
    } catch (error) {
      getTrainingStateMachine()?.send({ type: 'GENERATION_ERROR', payload: { error: error instanceof Error ? error.message : String(error) } });
    }
  };

  /**
   * 【第五步】用户监听阶段
   */
  const handleUserListening = () => {
    setErrorMessage('');
    setInterviewTrainingState({
      isListening: true,
      speechText: '',
      currentPhase: 'listening-candidate'
    });
  };

  /**
   * 【第六步】用户说话阶段
   */
  const handleUserSpeaking = () => {
    setErrorMessage('');
  };

  /**
   * 【第七步】AI分析用户回答
   */
  const handleAIAnalyzing = async (context: any) => {
    setErrorMessage('');
    // 用户回答结束，停止录音（确保麦克风不会录到后续的 AI 说话声音）
    setInterviewTrainingState({ isListening: false });

    try {
      if (!selectedModel || !currentQuestionData.current) {
        throw new Error('数据不完整');
      }

      const questionData = currentQuestionData.current;
      const candidateAnswer = questionData.candidateAnswer || context.userResponse || '';
      const askedQuestion = context.currentQuestion;
      const referenceAnswer = questionData.referenceAnswer || '';

      const analysisPrompt = await promptService.buildAnalysisPrompt(askedQuestion, candidateAnswer, referenceAnswer);

      const messages = [
        {
          role: 'user' as const,
          content: analysisPrompt,
        }
      ];

      const modelConfig: ModelConfig = {
        provider: selectedModel.provider,
        modelName: selectedModel.modelName,
        credentials: selectedModel.credentials || '{}',
      };

      // 获取当前选中模型的参数
      const modelParams: ModelParam[] = await modelService.getModelParams(selectedModel.id);

      let analysisResult = '';

      await aiService.callAIStreamWithCustomModel(messages, modelConfig, modelParams, async (chunk) => {
        if (chunk.error) {
          getTrainingStateMachine()?.send({ type: 'ANALYSIS_ERROR', payload: { error: chunk.error } });
          return;
        }

        if (chunk.finished) {
          analysisResult = analysisResult.trim();

          try {
            // 清理 markdown 代码块标记（AI 可能返回 ```json ... ```）
            let jsonStr = analysisResult;
            if (jsonStr.startsWith('```json')) {
              jsonStr = jsonStr.slice(7);
            } else if (jsonStr.startsWith('```')) {
              jsonStr = jsonStr.slice(3);
            }
            if (jsonStr.endsWith('```')) {
              jsonStr = jsonStr.slice(0, -3);
            }
            jsonStr = jsonStr.trim();

            const rawAnalysis = JSON.parse(jsonStr);

            // 将 AI 返回的结果统一转换为字符串（AI 可能返回数组格式）
            const ensureStr = (v: unknown): string => {
              if (typeof v === 'string') return v;
              if (Array.isArray(v)) return v.map((item, i) => `${i + 1}. ${String(item)}`).join('\n');
              if (typeof v === 'object' && v !== null) return JSON.stringify(v, null, 2);
              return String(v ?? '');
            };

            const analysis = {
              pros: ensureStr(rawAnalysis.pros),
              cons: ensureStr(rawAnalysis.cons),
              suggestions: ensureStr(rawAnalysis.suggestions),
              keyPoints: ensureStr(rawAnalysis.key_points),
              assessment: ensureStr(rawAnalysis.assessment),
            };

            const questionState = interviewDataService.getQuestionState(context.currentQuestionIndex);
            if (!questionState?.reviewId) {
              throw new Error('Review ID not found');
            }

            // 计算问题结束时间和持续时长
            const endAt = Date.now();
            const duration = questionState.startedAt
              ? Math.round((endAt - questionState.startedAt) / 1000)
              : 0;

            // 【保存】更新数据库
            await mockInterviewService.updateReview(questionState.reviewId, {
              questionId: questionData.questionId,
              question: questionData.question,
              answer: questionData.answer,
              referenceAnswer: questionData.referenceAnswer || '',
              candidateAnswer: candidateAnswer,
              pros: analysis.pros,
              cons: analysis.cons,
              suggestions: analysis.suggestions,
              keyPoints: analysis.keyPoints,
              assessment: analysis.assessment,
              otherId: questionData.otherId,
              otherContent: questionData.otherContent,
              endAt: endAt,
              duration,
            });

            // 保存到向量数据库
            if (questionData.questionId || questionData.otherId) {
              await mockInterviewService.saveAIVectorRecord({
                id: questionState.reviewId,
                interviewId: interviewDataService.getInterviewDataState()?.interviewId || '',
                noteType: 'training',
                content: '',
                questionId: questionData.questionId,
                question: questionData.question,
                answer: questionData.answer,
                askedQuestion: context.currentQuestion,
                candidateAnswer: candidateAnswer,
                pros: analysis.pros || '',
                cons: analysis.cons || '',
                suggestions: analysis.suggestions || '',
                keyPoints: analysis.keyPoints || '',
                assessment: analysis.assessment || '',
                referenceAnswer: questionData.referenceAnswer || '',
                otherId: questionData.otherId,
                otherContent: questionData.otherContent,
                createdAt: Date.now(),
              });
            }

            interviewDataService.markQuestionComplete(context.currentQuestionIndex);

            getTrainingStateMachine()?.send({ type: 'ANALYSIS_COMPLETE' });
          } catch (parseError) {
            await log.error('handleAIAnalyzing', 'JSON解析失败', {
              questionIndex: context.currentQuestionIndex,
              llmResponse: analysisResult,
            }, parseError, '第七步');
            getTrainingStateMachine()?.send({ type: 'ANALYSIS_ERROR', payload: { error: '分析结果解析失败' } });
          }
        } else {
          analysisResult += chunk.content;
        }
      });
    } catch (error) {
      getTrainingStateMachine()?.send({ type: 'ANALYSIS_ERROR', payload: { error: error instanceof Error ? error.message : String(error) } });
    }
  };

  /**
   * 【第八步】本轮完成
   */
  const handleRoundComplete = async (context: any) => {
    setCurrentLine(`第${context.currentQuestionIndex + 1}个问题已完成`);
    setErrorMessage('');

    try {
      // 记录对话到上下文管理服务
      const question = context.currentQuestion || '';
      const candidateAnswer = currentQuestionData.current?.candidateAnswer || context.userResponse || '';

      if (question && candidateAnswer) {
        await contextManagementService.recordConversation(question, candidateAnswer);
      }
    } catch (error) {
      await logger.error(`[第八步] 记录对话失败: ${error}`);
    }

    interviewDataService.markQuestionComplete(context.currentQuestionIndex);

    const shouldEnd = getTrainingStateMachine()?.shouldEndInterview();

    if (shouldEnd) {
      getTrainingStateMachine()?.send({ type: 'END_TRAINING' });
    } else {
      // 继续下一轮
      if (!trainingState.isAutoMode) {
        // 手动模式：重新开始监听扬声器
        setTimeout(async () => {
          try {
            setInterviewTrainingState({
              currentPhase: 'listening-interviewer',
              interviewerQuestion: '',
              aiMessage: '',
              speechText: '',
              candidateAnswer: ''
            });
            await startListeningInterviewer();
            setCurrentLine('正在监听面试官下一个问题...');
          } catch (error) {
            await logger.error(`[第八步] 重新启动扬声器监听失败: ${error}`);
            setErrorMessage('重新启动扬声器监听失败');
          }
        }, 2000);
      } else {
        // 自动模式：清理状态，扬声器持续监听
        setInterviewTrainingState({
          currentPhase: 'listening-interviewer',
          aiMessage: '',
          speechText: '',
          candidateAnswer: '',
          lastInterviewerSpeechTime: 0
        });
        setCurrentLine('正在监听面试官下一个问题...');
      }
    }
  };

  /**
   * 面试即将结束
   */
  const handleInterviewEnding = async () => {
    setCurrentLine('面试训练即将结束，正在生成报告...');
    setErrorMessage('');

    try {
      const timerDuration = getTimerState().duration || 0;

      interviewDataService.markInterviewComplete();

      const interviewId = currentInterview.get();

      if (interviewId) {
        await interviewService.updateInterview(interviewId, {
          status: 'interview-training-completed',
          duration: timerDuration,
          message: '面试训练已完成'
        });
      }

      transitionToNext('GENERATE_REPORT');
    } catch (error) {
      await logger.error(`[面试结束] 发生错误: ${error}`);
      transitionToNext('ENDING_ERROR', { error: error instanceof Error ? error.message : String(error) });
    }
  };

  /**
   * 【第十步】面试训练完成
   * 【重要】只有在这里才能清理 localStorage 中的训练数据！
   */
  const handleInterviewCompleted = async () => {
    setCurrentLine('面试训练已完成！感谢您的参与。');
    setErrorMessage('');

    // 清理上下文管理服务
    contextManagementService.clear();

    const interviewId = currentInterview.get();

    if (interviewId) {
      const machine = getTrainingStateMachine();
      if (machine) {
        const context = machine.getContext();
        const jobTitle = context.jobPosition?.title || '未知职位';
        const resumeContent = context.resume?.resumeContent || '';
        const durationSec = getTimerState().duration || 0;

        generateReport({
          interviewId,
          jobTitle,
          resumeContent,
          durationSec,
          onError: (error) => {
            setErrorMessage(`后台生成面试训练报告失败: ${error}`);
            setTimestamp(Date.now());
          }
        }).catch(async (error) => {
          await logger.error(`[第十步] 生成面试训练报告失败: ${error}`);
        });
      }
    }

    setVoiceState({
      mode: 'interview-training',
      subState: 'interview-training-completed',
      interviewId: interviewId
    });

    // 【清理】只在面试正常完成时才清理状态机和 localStorage
    // stopInterviewTraining() 会清理 localStorage 中的持久化数据
    // 但 interview_id 仍然保留在 currentInterview 中，直到用户开始新的面试
  };

  /**
   * 错误处理
   */
  const handleError = async (context: any) => {
    const errorMsg = context.errorMessage || '面试训练过程中发生错误';
    setErrorMessage(errorMsg);
    setCurrentLine('');

    const interviewId = currentInterview.get();

    if (interviewId) {
      try {
        await interviewService.updateInterview(interviewId, {
          status: 'interview-training-error',
          message: `错误: ${errorMsg}`
        });
      } catch (error) {
        await logger.error(`[错误处理] 更新面试训练错误状态失败: ${error}`);
      }
    }

    // 同步更新 voiceState 到错误状态，让控制栏等其他窗口能感知到错误
    setVoiceState({
      mode: 'interview-training',
      subState: 'interview-training-error',
      interviewId: interviewId
    });

    // 【重要】错误状态不清理 interview_id，让用户可以查看错误信息
  };

  // ===========================================================================
  // 辅助函数
  // ===========================================================================

  const transitionToNext = (eventType: string, payload?: any): boolean => {
    const machine = getTrainingStateMachine();
    if (!machine) return false;

    const context = machine.getContext();
    if (context.isPaused) {
      return false;
    }

    return machine.send({ type: eventType, payload });
  };

  const continueFromState = (state: TrainingState): void => {
    const machine = getTrainingStateMachine();
    if (!machine) return;

    const completionEvents: Record<TrainingState, string | null> = {
      [TrainingState.IDLE]: null,
      [TrainingState.LISTENING_INTERVIEWER]: null,
      [TrainingState.GENERATING_ANSWER]: 'ANSWER_GENERATED',
      [TrainingState.USER_LISTENING]: null,
      [TrainingState.USER_SPEAKING]: null,
      [TrainingState.AI_ANALYZING]: 'ANALYSIS_COMPLETE',
      [TrainingState.ROUND_COMPLETE]: 'CONTINUE_TRAINING',
      [TrainingState.INTERVIEW_ENDING]: 'GENERATE_REPORT',
      [TrainingState.GENERATING_REPORT]: 'REPORT_COMPLETE',
      [TrainingState.COMPLETED]: null,
      [TrainingState.ERROR]: null,
    };

    const eventType = completionEvents[state];
    if (eventType) {
      machine.send({ type: eventType });
    }
  };

  /**
   * 保存并分析上一轮回答
   */
  const saveAndAnalyzePreviousRound = async (reviewId: string) => {
    try {
      const candidateAnswer = trainingState.candidateAnswer;

      if (!candidateAnswer || candidateAnswer.trim().length === 0) {
        return;
      }

      await mockInterviewService.updateReview(reviewId, {
        candidateAnswer: candidateAnswer,
      });

      const reviews = await mockInterviewService.getInterviewReviews(currentInterview.get() || '');
      const review = reviews.find(r => r.id === reviewId);

      if (review) {
        const modelConfigResult = await getCurrentModelConfig();
        if (modelConfigResult) {
          await analyzeReview({
            review,
            modelConfig: modelConfigResult.modelConfig,
            modelParams: modelConfigResult.modelParams,
            onError: (error) => {
              setErrorMessage(error);
              setTimestamp(Date.now());
            }
          });
        }
      }
    } catch (error) {
      await logger.error(`[辅助] 保存并分析上一轮失败: ${error}`);
      throw error;
    }
  };

  // ===========================================================================
  // 暂停/继续/停止
  // ===========================================================================

  /**
   * 暂停面试
   */
  const handlePauseInterview = async () => {
    const machine = getTrainingStateMachine();
    if (!machine) return;

    const interviewId = currentInterview.get();
    if (!interviewId) return;

    try {
      machine.updateContextPartial({ isPaused: true });

      await interviewService.updateInterview(interviewId, {
        status: 'interview-training-paused',
        message: '面试训练已暂停'
      });

      setVoiceState({
        mode: 'interview-training',
        subState: 'interview-training-paused',
        interviewId: interviewId
      });
      setCurrentLine('面试训练已暂停');

    } catch (error) {
      await logger.error(`[暂停] 暂停面试失败: ${error}`);
      setErrorMessage(`暂停面试失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  /**
   * 继续面试
   */
  const handleResumeInterview = async () => {
    const machine = getTrainingStateMachine();
    if (!machine) return;

    const interviewId = currentInterview.get();
    if (!interviewId) return;

    try {
      // 状态机还在内存中，直接使用当前 context
      const currentState = machine.getState();
      machine.updateContextPartial({ isPaused: false });

      await interviewService.updateInterview(interviewId, {
        status: 'interview-training-recording',
        message: '面试训练已恢复'
      });

      setVoiceState({
        mode: 'interview-training',
        subState: 'interview-training-playing',
        interviewId: interviewId
      });
      setCurrentLine('面试训练已恢复');

      continueFromState(currentState);

    } catch (error) {
      await logger.error(`[继续] 恢复面试失败: ${error}`);
      setErrorMessage(`恢复面试失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  /**
   * 停止面试
   * 【重要】这是用户主动停止，可以清理数据
   */
  const handleStopInterview = async () => {
    try {
      const interviewId = currentInterview.get();
      if (!interviewId) {
        return;
      }

      // 停止扬声器监听
      await stopListeningInterviewer();

      const timerDuration = getTimerState().duration || 0;

      setCurrentLine('正在结束面试训练...');

      // 【保存】更新数据库状态
      await interviewService.updateInterview(interviewId, {
        status: 'interview-training-completed',
        duration: timerDuration,
        message: '用户主动停止面试训练'
      });

      // 构造模型配置，使用组件状态中的 selectedModel
      const modelConfig = selectedModel ? {
        provider: selectedModel.provider,
        modelName: selectedModel.modelName,
        credentials: selectedModel.credentials || '{}',
      } : undefined;

      // 获取当前选中模型的参数
      const modelParams = selectedModel ? await modelService.getModelParams(selectedModel.id) : [];

      // 分析未分析的回答，传入模型配置
      const analyzeResult = await batchAnalyzeReviews({
        interviewId,
        modelConfig,
        modelParams,
        onProgress: (message) => setCurrentLine(message),
        onError: (error) => {
          setErrorMessage(error);
          setTimestamp(Date.now());
        }
      });

      // 生成面试报告
      const totalValidReviews = analyzeResult.analyzed + analyzeResult.skipped;
      if (totalValidReviews > 0) {
        setCurrentLine('正在生成面试报告...');
        const jobTitle = selectedPosition?.title || '未知职位';
        const resumeContent = selectedPosition?.resumeContent || '';

        await generateReport({
          interviewId,
          jobTitle,
          resumeContent,
          durationSec: timerDuration,
          onProgress: (message) => setCurrentLine(message),
          onError: (error) => {
            setErrorMessage(error);
            setTimestamp(Date.now());
          }
        });
      }

      setCurrentLine('面试训练已结束');
      setVoiceState({
        mode: 'interview-training',
        subState: 'interview-training-completed',
        interviewId: interviewId
      });

      // 先将状态机状态设置为 COMPLETED，触发 persistCurrentState 更新 localStorage
      const machine = getTrainingStateMachine();
      if (machine) {
        machine.setState(TrainingState.COMPLETED);
      }

      stopInterviewTraining();

    } catch (error) {
      await logger.error(`[停止] 结束面试训练失败: ${error}`);
      setErrorMessage(`结束面试训练失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setCurrentLine('');
      const interviewId = currentInterview.get();
      setVoiceState({
        mode: 'interview-training',
        subState: 'interview-training-completed',
        interviewId: interviewId
      });

      // 先将状态机状态设置为 COMPLETED，触发 persistCurrentState 更新 localStorage
      const machineInCatch = getTrainingStateMachine();
      if (machineInCatch) {
        machineInCatch.setState(TrainingState.COMPLETED);
      }

      stopInterviewTraining();
    }
  };

  // ===========================================================================
  // 事件处理
  // ===========================================================================

  const handlePositionSelect = (position: JobPosition | null) => {
    setSelectedPosition(position);
  };

  const handleModelSelect = (model: Model | null) => {
    setSelectedModel(model);
  };

  // ===========================================================================
  // 渲染
  // ===========================================================================

  return (
    <div className="interviewer-mode-panel">
      {/* 岗位选择卡片 */}
      <JobPositionCard
        selectedJobId={selectedJobId}
        onPositionSelect={handlePositionSelect}
        onModelSelect={handleModelSelect}
        onLanguageSelect={(lang) => setSelectedLanguage(lang)}
        disabled={(voiceState.subState === 'interview-training-recording' ||
                   voiceState.subState === 'interview-training-paused' ||
                   voiceState.subState === 'interview-training-playing')}
      />

      {/* 主控制区域 */}
      <div className="interviewer-top interviewer-top-card">
        <div className="interviewer-left interviewer-avatar-block">
          <div className="interviewer-avatar">
            <div className="ripple" />
            <div className="ripple ripple2" />
            <div className="avatar-circle">
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="28" cy="20" r="10" stroke="rgba(255,255,255,0.9)" strokeWidth="2" fill="rgba(255,255,255,0.15)" />
                <path d="M8 50c0-9 9-16 20-16s20 7 20 16" stroke="rgba(255,255,255,0.9)" strokeWidth="2" fill="rgba(255,255,255,0.08)" />
              </svg>
            </div>
          </div>
          <div className="avatar-label">面试官</div>
        </div>
        <div className="interviewer-right interviewer-controls-column">
          {/* 麦克风选择 */}
          <div className="device-select-group">
            <div className="voice-select">
              <select
                className="device-select"
                value={selectedMic}
                onChange={async (e) => {
                  const value = e.target.value;
                  setSelectedMic(value);
                  const selected = micDevices.find(d => d.deviceId === value);
                  await saveMicrophoneDevice(value, selected?.label || '默认麦克风');
                }}
                disabled={loading || (voiceState.subState === 'interview-training-recording' ||
                         voiceState.subState === 'interview-training-paused' ||
                         voiceState.subState === 'interview-training-playing')}
              >
                {loading ? (
                  <option>加载设备...</option>
                ) : micDevices.length === 0 ? (
                  <option>未检测到麦克风</option>
                ) : (
                  micDevices.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown size={14} className="select-icon" />
            </div>
          </div>

          {/* 扬声器选择 */}
          <div className="device-select-group">
            <div className="voice-select">
              <select
                className="device-select"
                value={selectedSpeaker}
                onChange={async (e) => {
                  const value = e.target.value;
                  setSelectedSpeaker(value);
                  const selected = speakerDevices.find(d => d.deviceId === value);
                  await saveSpeakerDevice(value, selected?.label || '默认扬声器');
                }}
                disabled={loading || (voiceState.subState === 'interview-training-recording' ||
                         voiceState.subState === 'interview-training-paused' ||
                         voiceState.subState === 'interview-training-playing')}
              >
                {loading ? (
                  <option>加载设备...</option>
                ) : speakerDevices.length === 0 ? (
                  <option>未检测到扬声器</option>
                ) : (
                  speakerDevices.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown size={14} className="select-icon" />
            </div>
          </div>

          {/* 开始按钮 */}
          {onStart && (voiceState.subState !== 'interview-training-recording' &&
            voiceState.subState !== 'interview-training-paused' &&
            voiceState.subState !== 'interview-training-playing') && (
            <button
              className="test-button"
              onClick={handleStartInterview}
              disabled={loading || isInitializing}
            >
              {isInitializing ? '正在初始化...' : '开始面试训练'}
            </button>
          )}

          {/* 暂停/继续/停止按钮 */}
          {(voiceState.subState === 'interview-training-recording' ||
            voiceState.subState === 'interview-training-paused' ||
            voiceState.subState === 'interview-training-playing') && (
            <div className="interview-segmented">
              {voiceState.subState === 'interview-training-paused' ? (
                <button
                  className="interview-segmented-btn interview-segmented-btn-left continue"
                  onClick={handleResumeInterview}
                >
                  <Play size={14} />
                  继续
                </button>
              ) : (
                <button
                  className="interview-segmented-btn interview-segmented-btn-left"
                  onClick={handlePauseInterview}
                >
                  <Pause size={14} />
                  暂停
                </button>
              )}
              <div className="interview-separator" />
              <button
                className="interview-segmented-btn interview-segmented-btn-right"
                onClick={handleStopInterview}
              >
                <Square size={14} />
                停止
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 手动模式控制区域 */}
      {(voiceState.subState === 'interview-training-recording' ||
        voiceState.subState === 'interview-training-paused' ||
        voiceState.subState === 'interview-training-playing') && (
        <div className="ai-window-footer">
          <div className="control-actions">
            {/* 自动/手动模式显示 */}
            <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    className={`mode-toggle ${trainingState.isAutoMode ? 'auto' : 'manual'}`}
                    disabled={true}
                    style={{ cursor: 'not-allowed', opacity: 0.6 }}
                  >
                    <span className="toggle-text">{trainingState.isAutoMode ? '自动' : '手动'}</span>
                    <div className="toggle-switch">
                      <div className="toggle-handle" />
                    </div>
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
                  面试进行中无法切换模式，请在面试开始前选择
                  <Tooltip.Arrow className="radix-tooltip-arrow" />
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>

            {/* 提问完毕按钮 */}
            {trainingState.currentPhase === 'listening-interviewer' && (
              <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button
                      onClick={handleQuestionComplete}
                      disabled={trainingState.isAutoMode || !trainingState.interviewerQuestion || trainingState.interviewerQuestion.length < 5}
                      className="response-complete-btn"
                    >
                      <span className="response-text">提问完毕</span>
                      <CornerDownLeft size={16} />
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
                    {trainingState.isAutoMode ? '自动模式下不可用' : '标记面试官提问完毕'}
                    <Tooltip.Arrow className="radix-tooltip-arrow" />
                  </Tooltip.Content>
                </Tooltip.Root>
              </Tooltip.Provider>
            )}
          </div>
        </div>
      )}

      {/* 状态显示区域 */}
      {(currentLine || errorMessage) && (
        <div className="">
          {currentLine && (
            <div className="ai-utterance recognized-text">
              <h5>面试官：</h5>
              {currentLine}
              {timestamp > 0 && <div className="timestamp" style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{new Date(timestamp).toLocaleTimeString()}</div>}
            </div>
          )}
          {errorMessage && (
            <div className="ai-utterance error-text" style={{ color: '#ff6b6b' }}>
              <h5>面试官：</h5>
              {errorMessage}
              {timestamp > 0 && <div className="timestamp" style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{new Date(timestamp).toLocaleTimeString()}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
