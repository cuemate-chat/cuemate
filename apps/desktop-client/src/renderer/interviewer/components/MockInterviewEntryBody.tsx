/**
 * ============================================================================
 * 模拟面试入口组件 - MockInterviewEntryBody
 * ============================================================================
 *
 * 【核心原则】
 * voiceState 只存 interviewId，所有数据 100% 从数据库获取
 *
 * 【流程概述】
 * 模拟面试模式的完整流程分为以下步骤：
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  第一步：初始化                                                           │
 * │  - 检查是否有可恢复的面试（从 voiceState 获取 interviewId，查数据库恢复）     │
 * │  - 加载音频设备配置                                                        │
 * │  - 检查 Piper TTS 可用性                                                  │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  第二步：用户点击"开始模拟面试"                                            │
 * │  - 创建面试记录（数据库）                                                  │
 * │  - 初始化状态机                                                           │
 * │  - 获取押题题库                                                           │
 * │  - 保存 interviewId 到 voiceState                                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  第三步：初始化面试信息 (INITIALIZING)                                     │
 * │  - 构建初始化 Prompt                                                      │
 * │  - 初始化上下文管理服务                                                    │
 * │  - 更新数据库状态                                                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  第四步：AI 思考问题 (AI_THINKING)                                         │
 * │  - 调用 LLM 生成面试问题                                                   │
 * │  - 使用上下文管理服务优化 prompt                                           │
 * │  - 创建问答记录到数据库                                                    │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  第五步：AI 朗读问题 (AI_SPEAKING)                                         │
 * │  - 使用 Piper TTS 朗读问题                                                │
 * │  - 同时后台生成 AI 参考答案                                                │
 * │  - 更新问答记录（参考答案）                                                │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  第六步：用户准备回答 (USER_LISTENING)                                     │
 * │  - 显示 AI 参考答案                                                       │
 * │  - 用户可以开始录音                                                       │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  第七步：用户回答中 (USER_SPEAKING)                                        │
 * │  - 用户通过语音或文本输入回答                                              │
 * │  - 用户点击"完成回答"提交                                                  │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  第八步：AI 分析用户回答 (AI_ANALYZING)                                    │
 * │  - 调用 LLM 分析用户回答（优缺点、建议等）                                   │
 * │  - 更新问答记录（用户回答、分析结果）                                       │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  第九步：本轮完成 (ROUND_COMPLETE)                                         │
 * │  - 判断是否继续下一轮                                                      │
 * │  - 继续：返回第四步                                                        │
 * │  - 结束：进入第十步                                                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  第十步：生成面试报告 (GENERATING_REPORT)                                  │
 * │  - 汇总所有轮次的分析结果                                                  │
 * │  - 调用 LLM 生成综合评分和建议                                             │
 * │  - 保存报告到数据库                                                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  第十一步：面试完成 (COMPLETED)                                            │
 * │  - 显示完成提示                                                           │
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

import { ChevronDown, Pause, Play, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createLogger, logger } from '../../../utils/rendererLogger.js';
import { getTimerState, setTimerState } from '../../../utils/timerState';
import { setVoiceState, useVoiceState } from '../../../utils/voiceState';
import { interviewDataService } from '../../ai-question/components/shared/data/InterviewDataService';
import { contextManagementService } from '../../ai-question/components/shared/services/ContextManagementService';
import { mockInterviewService } from '../../ai-question/components/shared/services/InterviewService';
import { InterviewState } from '../../ai-question/components/shared/state/InterviewStateMachine';
import { promptService } from '../../prompts/promptService';
import type { ModelConfig, ModelParam } from '../../utils/ai/aiService';
import { aiService } from '../../utils/ai/aiService';
import { currentInterview } from '../../utils/currentInterview';
import {
  canStartInterviewAsync,
  getInterviewTypeName,
  type OngoingInterviewInfo,
} from '../../utils/interviewGuard';
import {
  getMockInterviewStateMachine,
  hasRecoverableInterview,
  restoreMockInterview,
  startMockInterview,
  stopMockInterview,
  validateWithDatabase,
} from '../../utils/mockInterviewManager';
import { setMockInterviewState, useMockInterviewState } from '../../utils/mockInterviewState';
import { interviewService } from '../api/interviewService';
import { JobPosition } from '../api/jobPositionService';
import { Model, modelService } from '../api/modelService';
import {
  batchAnalyzeReviews,
  generateInterviewReport as generateReport,
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

interface MockInterviewEntryBodyProps {
  selectedJobId?: string;
  onStart?: () => void;
  onStateChange?: (state: InterviewState) => void;
  onQuestionGenerated?: (question: string) => void;
  onAnswerGenerated?: (answer: string) => void;
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

const log = createLogger('MockInterviewEntryBody');

// ============================================================================
// 主组件
// ============================================================================

export function MockInterviewEntryBody({
  selectedJobId,
  onStart,
  onStateChange,
  onQuestionGenerated,
  onAnswerGenerated
}: MockInterviewEntryBodyProps) {
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
  const [piperAvailable, setPiperAvailable] = useState(false);

  // 状态机状态（仅用于触发 UI 更新，实际状态由 mockInterviewManager 管理）
  const [_interviewState, setInterviewState] = useState<InterviewState>(InterviewState.IDLE);

  // 互斥保护
  const [_blockingInterview, setBlockingInterview] = useState<OngoingInterviewInfo | null>(null);

  // 当前问题数据（临时存储，用于分析时保存）
  const currentQuestionData = useRef<CurrentQuestionData | null>(null);

  // 防重入标志
  const isSpeakingRef = useRef<boolean>(false);
  const lastSpeakingQuestionIndex = useRef<number>(-1);

  // 全局状态
  const voiceState = useVoiceState();
  const mockInterviewState = useMockInterviewState();

  // ===========================================================================
  // 第一步：初始化 - 检查恢复 & 加载设备
  // ===========================================================================

  /**
   * 【第一步-A】加载音频设备配置
   */
  useEffect(() => {
    const loadAudioSettings = async () => {
      try {
        // 检查 Piper TTS 可用性
        const piperAvailableResult = await (window as any).electronInterviewerAPI?.piperTTS?.isAvailable?.();
        setPiperAvailable(piperAvailableResult?.success && piperAvailableResult?.available);

        // 使用公共工具加载音频设备
        const { devices, selectedMic: mic, selectedSpeaker: speaker } = await loadAudioDevicesWithDefaults();

        setMicDevices(devices.microphones);
        setSpeakerDevices(devices.speakers);
        setSelectedMic(mic);
        setSelectedSpeaker(speaker);

      } catch (error) {
        await logger.error(`[第一步-A] 加载音频设备失败: ${error}`);
        setPiperAvailable(false);
      } finally {
        setLoading(false);
      }
    };

    loadAudioSettings();
  }, []);

  /**
   * 【第一步-B】检查并恢复未完成的面试
   */
  useEffect(() => {
    const checkAndRecoverInterview = async () => {
      try {
        // 检查是否有可恢复的面试（从 voiceState 检查）
        if (!hasRecoverableInterview()) {
          return;
        }

        // 先从数据库获取面试状态
        const validationResult = await validateWithDatabase();

        // 已完成的面试也需要显示数据（不是恢复状态机，而是显示已完成状态）
        if (validationResult.status === 'completed' && validationResult.interviewId) {
          // 设置 voiceState 为已完成状态
          setVoiceState({
            mode: 'mock-interview',
            subState: 'mock-interview-completed',
            interviewId: validationResult.interviewId,
          });
          // 从数据库获取最后一个问题显示
          try {
            const result = await interviewService.getInterview(validationResult.interviewId);
            if (result?.questions && result.questions.length > 0) {
              const lastQuestion = result.questions[result.questions.length - 1];
              setCurrentLine(lastQuestion.asked_question || lastQuestion.question || '面试已完成');
            } else {
              setCurrentLine('面试已完成');
            }
          } catch {
            setCurrentLine('面试已完成');
          }
          return;
        }

        if (validationResult.status !== 'valid') {
          return;
        }

        // 【恢复】状态机（100% 从数据库获取数据）
        const machine = await restoreMockInterview();
        if (!machine) {
          await logger.error('[第一步-B] 恢复状态机失败');
          return;
        }

        // 从状态机获取恢复后的数据（100% 来自数据库）
        const context = machine.getContext();
        const currentState = machine.getState();

        // 【恢复】监听状态机变化
        machine.onStateChange(async (state, ctx) => {
          setInterviewState(state);
          onStateChange?.(state);
          await handleStateChange(state, ctx);
        });

        // 【恢复】currentInterview（绝对不能丢失！）
        currentInterview.set(context.interviewId);

        // 【恢复】voiceState（从数据库状态判断是否暂停）
        const isPaused = validationResult.dbStatus === 'mock-interview-paused';
        const isRecording = currentState !== InterviewState.COMPLETED &&
                          currentState !== InterviewState.ERROR &&
                          currentState !== InterviewState.IDLE;
        const subState = isPaused ? 'mock-interview-paused' : (isRecording ? 'mock-interview-recording' : 'idle');

        setVoiceState({
          mode: 'mock-interview',
          subState: subState,
          interviewId: context.interviewId,
        });
        // 恢复计时器时长
        setTimerState({ duration: context.duration || 0, isRunning: !isPaused });

        // 【恢复】岗位信息
        if (context.jobPosition) {
          setSelectedPosition(context.jobPosition);
        }

        // 【恢复】数据服务
        interviewDataService.initializeInterview(
          context.interviewId,
          context.totalQuestions
        );

        // 【恢复】跨窗口状态
        setMockInterviewState({
          interviewState: currentState,
          aiMessage: context.currentAnswer || '',
          speechText: '',
          candidateAnswer: '',
          isLoading: false,
          isListening: currentState === InterviewState.USER_LISTENING,
        });

        // 【恢复】显示当前问题
        if (context.currentQuestion) {
          setCurrentLine(context.currentQuestion);
        } else {
          setCurrentLine(`面试已恢复，当前第 ${context.currentQuestionIndex + 1} 题`);
        }

      } catch (error) {
        await logger.error(`[第一步-B] 恢复面试失败: ${error}`);
      }
    };

    // 延迟执行恢复检查，确保组件完全挂载
    const timer = setTimeout(checkAndRecoverInterview, 200);
    return () => clearTimeout(timer);
  }, []);

  /**
   * 监听用户回答提交（通过跨窗口状态变化）
   */
  useEffect(() => {
    const candidateAnswer = mockInterviewState.candidateAnswer;

    if (candidateAnswer) {
      const machine = getMockInterviewStateMachine();
      if (machine) {
        const currentState = machine.getState();

        if (currentState === InterviewState.USER_LISTENING ||
            currentState === InterviewState.USER_SPEAKING) {

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
          setMockInterviewState({ candidateAnswer: '' });
        }
      }
    }
  }, [mockInterviewState.candidateAnswer]);

  /**
   * 监听来自 control-bar 的面试控制命令
   */
  useEffect(() => {
    const unsubscribe = onInterviewCommand((cmd) => {
      // 只处理模拟面试的命令
      if (cmd.mode !== 'mock-interview') return;

      log.debug('onInterviewCommand', '收到控制命令', { type: cmd.type });

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
  // 第二步：开始模拟面试
  // ===========================================================================

  /**
   * 【第二步】用户点击"开始模拟面试"按钮
   */
  const handleStartInterview = async () => {
    // 【检查】互斥保护（异步查询数据库确认是否有进行中的面试）
    const { canStart, blockingInterview: blocking } = await canStartInterviewAsync('mock-interview');
    if (!canStart && blocking) {
      setBlockingInterview(blocking);
      const typeName = getInterviewTypeName(blocking.type);
      setErrorMessage(`无法开始模拟面试：您有一个未完成的${typeName}（${blocking.jobPositionTitle || '未知岗位'}）。请先完成或结束该面试。`);
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
        questionCount: selectedPosition.question_count || 10,
        resumesId: selectedPosition.resumeId,
        resumesTitle: selectedPosition.resumeTitle,
        resumesContent: selectedPosition.resumeContent,
        interviewType: 'mock' as const,
        status: 'mock-interview-recording' as const,
        message: '面试进行中',
        locale: selectedLanguage,
        timezone: userData?.timezone || 'Asia/Shanghai',
        theme: userData?.theme || 'system',
        selectedModelId: selectedModel?.id
      };

      // 【创建】保存到数据库
      const response = await interviewService.createInterview(interviewData);

      // 【保存】设置 interview_id
      currentInterview.clear();
      currentInterview.set(response.id);

      // 【保存】初始化跨窗口状态
      setMockInterviewState({
        aiMessage: '',
        speechText: '',
        candidateAnswer: '',
        isLoading: false,
        isListening: false,
      });

      // 【保存】设置 voiceState
      setVoiceState({
        interviewId: response.id,
        mode: 'mock-interview',
        subState: 'mock-interview-recording',
      });

      // 获取押题题库
      const questionBank = await mockInterviewService.getQuestionBank(selectedPosition.id);

      // 【初始化】状态机
      const machine = startMockInterview({
        interviewId: response.id,
        totalQuestions: 10,
      });

      machine.onStateChange(async (state, context) => {
        setInterviewState(state);
        onStateChange?.(state);
        await handleStateChange(state, context);
      });

      // 【初始化】数据服务
      interviewDataService.initializeInterview(response.id, interviewData.questionCount);

      // 发送开始事件
      machine.send({
        type: 'START_INTERVIEW',
        payload: {
          interviewId: response.id,
          jobPosition: selectedPosition,
          resume: {
            resumeTitle: selectedPosition.resumeTitle,
            resumeContent: selectedPosition.resumeContent,
          },
          questionBank,
        },
      });

      if (onStart) {
        onStart();
      }
    } catch (error) {
      await logger.error(`[第二步] 开始面试失败: ${error}`);
      const errorMsg = `开始面试失败: ${error instanceof Error ? error.message : '未知错误'}`;
      setErrorMessage(errorMsg);
      setCurrentLine('');
      setIsInitializing(false);

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
  // TTS 朗读
  // ===========================================================================

  /**
   * 使用 Piper TTS 朗读文本（带 30 秒超时保护）
   */
  const speak = async (text: string) => {
    try {
      if (!piperAvailable) {
        throw new Error('Piper TTS 不可用');
      }

      const options = { outputDevice: selectedSpeaker };

      // 添加超时机制：60秒超时，防止 TTS 播放卡住
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('TTS 播放超时（60秒）')), 60000);
      });

      await Promise.race([
        (window as any).electronInterviewerAPI?.piperTTS?.speak?.(text, options),
        timeoutPromise
      ]);

      setCurrentLine(`${text}`);
      setErrorMessage('');
      setTimestamp(Date.now());
    } catch (error) {
      log.error('playTTS', 'TTS 播放失败', undefined, error);
      await logger.error(`[TTS] 语音播放失败: ${error}`);
      setCurrentLine('');
      setErrorMessage(`语音播放失败: ${text}`);
      setTimestamp(Date.now());

      // 发送错误事件到状态机
      const machine = getMockInterviewStateMachine();
      if (machine) {
        const currentState = machine.getState();
        log.error('playTTS', 'TTS 错误时状态，发送 SPEAKING_ERROR', { currentState });
        if (currentState === InterviewState.AI_SPEAKING) {
          machine.send({ type: 'SPEAKING_ERROR', payload: { error: error instanceof Error ? error.message : String(error) } });
        }
      }
    }
  };

  // ===========================================================================
  // 状态机事件处理
  // ===========================================================================

  const transitionToNext = (eventType: string, payload?: any): boolean => {
    const machine = getMockInterviewStateMachine();
    if (!machine) return false;

    const context = machine.getContext();
    if (context.isPaused) {
      return false;
    }

    return machine.send({ type: eventType, payload });
  };

  const continueFromState = (state: InterviewState): void => {
    const machine = getMockInterviewStateMachine();
    if (!machine) return;

    const completionEvents: Record<InterviewState, string | null> = {
      [InterviewState.IDLE]: null,
      [InterviewState.INITIALIZING]: 'INIT_SUCCESS',
      [InterviewState.AI_THINKING]: 'QUESTION_GENERATED',
      [InterviewState.AI_SPEAKING]: 'SPEAKING_COMPLETE',
      [InterviewState.GENERATING_ANSWER]: 'ANSWER_GENERATED',
      [InterviewState.USER_LISTENING]: null,
      [InterviewState.USER_SPEAKING]: null,
      [InterviewState.AI_ANALYZING]: 'ANALYSIS_COMPLETE',
      [InterviewState.ROUND_COMPLETE]: 'CONTINUE_INTERVIEW',
      [InterviewState.INTERVIEW_ENDING]: 'GENERATE_REPORT',
      [InterviewState.GENERATING_REPORT]: 'REPORT_COMPLETE',
      [InterviewState.COMPLETED]: null,
      [InterviewState.ERROR]: null,
    };

    const eventType = completionEvents[state];
    if (eventType) {
      machine.send({ type: eventType });
    }
  };

  /**
   * 处理状态机状态变化
   */
  const handleStateChange = async (state: InterviewState, context: any) => {
    log.debug('handleStateChange', '状态变化', { state, questionIndex: context.currentQuestionIndex });

    setMockInterviewState({ interviewState: state });

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
        case InterviewState.INITIALIZING:
          await handleInitializing(context);
          break;
        case InterviewState.AI_THINKING:
          await handleAIThinking(context);
          break;
        case InterviewState.AI_SPEAKING:
          await handleAISpeaking(context);
          break;
        case InterviewState.USER_LISTENING:
          handleUserListening();
          break;
        case InterviewState.USER_SPEAKING:
          handleUserSpeaking();
          break;
        case InterviewState.AI_ANALYZING:
          await handleAIAnalyzing(context);
          break;
        case InterviewState.GENERATING_ANSWER:
          break;
        case InterviewState.ROUND_COMPLETE:
          await handleRoundComplete(context);
          break;
        case InterviewState.INTERVIEW_ENDING:
          await handleInterviewEnding();
          break;
        case InterviewState.GENERATING_REPORT:
          transitionToNext('REPORT_COMPLETE');
          break;
        case InterviewState.COMPLETED:
          await handleInterviewCompleted();
          break;
        case InterviewState.ERROR:
          await handleError(context);
          break;
      }
    } catch (error) {
      log.error('handleStateChange', 'handleStateChange 错误', { state }, error);
      await logger.error(`[状态处理] 错误: ${error}`);
      setErrorMessage(`状态处理错误: ${error instanceof Error ? error.message : '未知错误'}`);
      setCurrentLine('');
    } finally {
      setIsInitializing(false);
    }
  };

  // ===========================================================================
  // 各阶段处理函数
  // ===========================================================================

  /**
   * 【第三步】初始化阶段
   */
  const handleInitializing = async (context: any) => {
    setCurrentLine('正在初始化面试信息...');
    setErrorMessage('');

    try {
      const initPromptData = await promptService.buildInitPrompt(
        context.jobPosition,
        context.resume,
        context.questionsBank
      );

      await contextManagementService.initialize({
        interviewId: context.interviewId,
        resume: context.resume?.resumeContent || '',
        jd: context.jobPosition?.description || '',
      });

      getMockInterviewStateMachine()?.send({
        type: 'INIT_SUCCESS',
        payload: {
          initPrompt: initPromptData.content,
          totalQuestions: initPromptData.totalQuestions
        }
      });
    } catch (error) {
      log.error('handleInitializing', 'handleInitializing 错误', undefined, error);
      getMockInterviewStateMachine()?.send({ type: 'INIT_ERROR', payload: { error: error instanceof Error ? error.message : String(error) } });
    }
  };

  /**
   * 【第四步】AI 思考问题
   */
  const handleAIThinking = async (context: any) => {
    setCurrentLine('面试官正在思考问题...');
    setErrorMessage('');

    try {
      if (!selectedModel) {
        throw new Error('未选择模型');
      }

      const questionPrompt = await promptService.buildQuestionPrompt(context.currentQuestionIndex);
      const optimizedMessages = await contextManagementService.getOptimizedContext(questionPrompt);

      const modelConfig: ModelConfig = {
        provider: selectedModel.provider,
        model_name: selectedModel.model_name,
        credentials: selectedModel.credentials || '{}',
      };

      // 获取当前选中模型的参数，而不是用户默认模型的参数
      const modelParams: ModelParam[] = await modelService.getModelParams(selectedModel.id);

      let generatedQuestion = '';

      await aiService.callAIStreamWithCustomModel(optimizedMessages, modelConfig, modelParams, (chunk) => {
        if (chunk.error) {
          log.error('handleAIThinking', 'AI 生成问题错误', { error: chunk.error });
          getMockInterviewStateMachine()?.send({ type: 'THINKING_ERROR', payload: { error: chunk.error } });
          return;
        }

        if (chunk.finished) {
          const cleanQuestion = generatedQuestion.trim().replace(/^(问题|Question)\s*[:：]?\s*/, '');
          getMockInterviewStateMachine()?.send({ type: 'QUESTION_GENERATED', payload: { question: cleanQuestion } });
        } else {
          generatedQuestion += chunk.content;
        }
      });
    } catch (error) {
      log.error('handleAIThinking', 'handleAIThinking 错误', undefined, error);
      getMockInterviewStateMachine()?.send({ type: 'THINKING_ERROR', payload: { error: error instanceof Error ? error.message : String(error) } });
    }
  };

  /**
   * 【第五步】AI 朗读问题
   */
  const handleAISpeaking = async (context: any) => {
    // 防重入检查：同一个问题不重复播放
    if (isSpeakingRef.current && lastSpeakingQuestionIndex.current === context.currentQuestionIndex) {
      log.debug('handleAISpeaking', 'TTS 跳过：已在播放中', { index: context.currentQuestionIndex });
      return;
    }

    try {
      const question = context.currentQuestion;
      if (!question) throw new Error('No question to speak');

      // 设置防重入标志
      isSpeakingRef.current = true;
      lastSpeakingQuestionIndex.current = context.currentQuestionIndex;

      setCurrentLine(question);

      const existingQuestion = interviewDataService.getQuestionState(context.currentQuestionIndex);
      if (!existingQuestion || !existingQuestion.reviewId) {
        await interviewDataService.createQuestionRecord(context.currentQuestionIndex, question);
      }

      // 同时启动 TTS 播放和后台生成答案（并行执行提高效率）
      const speakPromise = speak(question);
      const answerPromise = generateAnswerInBackground(context);

      // 等待两者都完成：AI 播报完毕 且 答案生成完毕，才允许用户开始录音
      // 这样可以避免麦克风录到扬声器播放的 AI 提问声音
      await Promise.all([speakPromise, answerPromise]);

      onQuestionGenerated?.(question);

      getMockInterviewStateMachine()?.send({ type: 'SPEAKING_COMPLETE' });
    } catch (error) {
      log.error('handleAISpeaking', 'handleAISpeaking 错误', undefined, error);
      getMockInterviewStateMachine()?.send({ type: 'SPEAKING_ERROR', payload: { error: error instanceof Error ? error.message : String(error) } });
    } finally {
      // 清除防重入标志
      isSpeakingRef.current = false;
    }
  };

  /**
   * 【第六步】用户监听阶段
   */
  const handleUserListening = () => {
    setErrorMessage('');
    setMockInterviewState({ isListening: true, speechText: '' });
  };

  /**
   * 【第七步】用户说话阶段
   */
  const handleUserSpeaking = () => {
    setErrorMessage('');
  };

  /**
   * 【第八步】AI 分析用户回答
   */
  const handleAIAnalyzing = async (context: any) => {
    setErrorMessage('');
    // 用户回答结束，停止录音（确保麦克风不会录到后续的 AI 说话声音）
    setMockInterviewState({ isListening: false });

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
        model_name: selectedModel.model_name,
        credentials: selectedModel.credentials || '{}',
      };

      // 获取当前选中模型的参数
      const modelParams: ModelParam[] = await modelService.getModelParams(selectedModel.id);

      let analysisResult = '';

      await aiService.callAIStreamWithCustomModel(messages, modelConfig, modelParams, async (chunk) => {
        if (chunk.error) {
          getMockInterviewStateMachine()?.send({ type: 'ANALYSIS_ERROR', payload: { error: chunk.error } });
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
              key_points: ensureStr(rawAnalysis.key_points),
              assessment: ensureStr(rawAnalysis.assessment),
            };

            const questionState = interviewDataService.getQuestionState(context.currentQuestionIndex);
            if (!questionState?.reviewId) {
              throw new Error('Review ID not found');
            }

            // 【保存】更新数据库
            await mockInterviewService.updateReview(questionState.reviewId, {
              question_id: questionData.questionId,
              question: questionData.question,
              answer: questionData.answer,
              reference_answer: questionData.referenceAnswer || '',
              candidate_answer: candidateAnswer,
              pros: analysis.pros,
              cons: analysis.cons,
              suggestions: analysis.suggestions,
              key_points: analysis.key_points,
              assessment: analysis.assessment,
              other_id: questionData.otherId,
              other_content: questionData.otherContent,
            });

            // 保存到向量数据库
            if (questionData.questionId || questionData.otherId) {
              await mockInterviewService.saveAIVectorRecord({
                id: questionState.reviewId,
                interview_id: interviewDataService.getInterviewDataState()?.interviewId || '',
                note_type: 'mock',
                content: '',
                question_id: questionData.questionId,
                question: questionData.question,
                answer: questionData.answer,
                asked_question: context.currentQuestion,
                candidate_answer: candidateAnswer,
                pros: analysis.pros || '',
                cons: analysis.cons || '',
                suggestions: analysis.suggestions || '',
                key_points: analysis.key_points || '',
                assessment: analysis.assessment || '',
                reference_answer: questionData.referenceAnswer || '',
                other_id: questionData.otherId,
                other_content: questionData.otherContent,
                created_at: Date.now(),
              });
            }

            interviewDataService.markQuestionComplete(context.currentQuestionIndex);

            getMockInterviewStateMachine()?.send({ type: 'ANALYSIS_COMPLETE' });
          } catch (parseError) {
            await log.error('handleAIAnalyzing', 'JSON解析失败', {
              questionIndex: context.currentQuestionIndex,
              llmResponse: analysisResult,
            }, parseError, '第八步');
            getMockInterviewStateMachine()?.send({ type: 'ANALYSIS_ERROR', payload: { error: '分析结果解析失败' } });
          }
        } else {
          analysisResult += chunk.content;
        }
      });
    } catch (error) {
      getMockInterviewStateMachine()?.send({ type: 'ANALYSIS_ERROR', payload: { error: error instanceof Error ? error.message : String(error) } });
    }
  };

  /**
   * 后台生成 AI 参考答案
   */
  const generateAnswerInBackground = async (context: any) => {
    setErrorMessage('');

    try {
      if (!selectedModel) {
        throw new Error('未选择模型');
      }

      const similarQuestion = await mockInterviewService.findSimilarQuestion(
        context.currentQuestion,
        context.jobPosition.id,
        0.8
      );

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

      const optimizedMessages = await contextManagementService.getOptimizedContext(finalPrompt);

      const modelConfig: ModelConfig = {
        provider: selectedModel.provider,
        model_name: selectedModel.model_name,
        credentials: selectedModel.credentials || '{}',
      };

      // 获取当前选中模型的参数
      const modelParams: ModelParam[] = await modelService.getModelParams(selectedModel.id);

      let referenceAnswer = '';

      await aiService.callAIStreamWithCustomModel(optimizedMessages, modelConfig, modelParams, async (chunk) => {
        if (chunk.error) {
          log.error('generateAnswerInBackground', '生成答案错误', { error: chunk.error });
          getMockInterviewStateMachine()?.send({ type: 'GENERATION_ERROR', payload: { error: chunk.error } });
          return;
        }

        if (chunk.finished) {
          referenceAnswer = referenceAnswer.trim();

          // 【保存】同步更新状态机的 context.currentAnswer
          const machine = getMockInterviewStateMachine();
          if (machine) {
            machine.updateContextPartial({ currentAnswer: referenceAnswer });
          }

          // 【保存】暂存问题数据
          currentQuestionData.current = {
            sequence: context.currentQuestionIndex,
            questionId: similarQuestion?.questionId,
            question: similarQuestion?.question,
            answer: similarQuestion?.answer,
            referenceAnswer: referenceAnswer,
            otherId: similarQuestion?.otherId,
            otherContent: similarQuestion?.otherContent,
          };

          onAnswerGenerated?.(referenceAnswer);

        } else {
          referenceAnswer += chunk.content;
          onAnswerGenerated?.(referenceAnswer);
        }
      });
    } catch (error) {
      log.error('generateAnswerInBackground', 'generateAnswerInBackground 失败', undefined, error);
      // 显示错误消息给用户（因为当前状态是 AI_SPEAKING，GENERATION_ERROR 事件无法处理）
      const errorMsg = `AI 参考答案生成失败: ${error instanceof Error ? error.message : '未知错误'}`;
      onAnswerGenerated?.(errorMsg);
    }
  };

  /**
   * 【第九步】本轮完成
   */
  const handleRoundComplete = async (context: any) => {
    setCurrentLine(`第${context.currentQuestionIndex + 1}个问题已完成`);
    setErrorMessage('');

    try {
      const question = context.currentQuestion || '';
      const candidateAnswer = currentQuestionData.current?.candidateAnswer || context.userResponse || '';

      if (question && candidateAnswer) {
        await contextManagementService.recordConversation(question, candidateAnswer);
      }
    } catch (error) {
      await logger.error(`[第九步] 记录对话失败: ${error}`);
    }

    interviewDataService.markQuestionComplete(context.currentQuestionIndex);

    const shouldEnd = getMockInterviewStateMachine()?.shouldEndInterview();

    if (shouldEnd) {
      getMockInterviewStateMachine()?.send({ type: 'END_INTERVIEW' });
    } else {
      setTimeout(() => {
        transitionToNext('CONTINUE_INTERVIEW');
      }, 2000);
    }
  };

  /**
   * 面试结束阶段
   */
  const handleInterviewEnding = async () => {
    setCurrentLine('面试即将结束，正在生成报告...');
    setErrorMessage('');

    try {
      const timerDuration = getTimerState().duration || 0;

      interviewDataService.markInterviewComplete();

      const interviewId = currentInterview.get();

      if (interviewId) {
        await interviewService.updateInterview(interviewId, {
          status: 'mock-interview-completed',
          duration: timerDuration,
          message: '面试已完成'
        });
      }

      transitionToNext('GENERATE_REPORT');
    } catch (error) {
      await logger.error(`[面试结束] 发生错误: ${error}`);
      transitionToNext('ENDING_ERROR', { error: error instanceof Error ? error.message : String(error) });
    }
  };

  /**
   * 【第十一步】面试完成
   */
  const handleInterviewCompleted = async () => {
    setCurrentLine('面试已完成！感谢您的参与。');
    setErrorMessage('');

    contextManagementService.clear();

    const interviewId = currentInterview.get();

    if (interviewId) {
      // 使用公共报告生成器
      generateReport({
        interviewId,
        jobTitle: selectedPosition?.title || '未知职位',
        resumeContent: selectedPosition?.resumeContent || '',
        durationSec: getTimerState().duration || 0,
        onError: (error) => {
          setErrorMessage(`后台生成面试报告失败: ${error}`);
          setTimestamp(Date.now());
        }
      }).catch(async (error) => {
        await logger.error(`[第十一步] 生成面试报告失败: ${error}`);
      });
    }

    setVoiceState({
      mode: 'mock-interview',
      subState: 'mock-interview-completed',
      interviewId: interviewId
    });
  };

  /**
   * 错误处理
   */
  const handleError = async (context: any) => {
    const errorMsg = context.errorMessage || '面试过程中发生错误';
    setErrorMessage(errorMsg);
    setCurrentLine('');

    const interviewId = currentInterview.get();

    if (interviewId) {
      try {
        await interviewService.updateInterview(interviewId, {
          status: 'mock-interview-error',
          message: `错误: ${errorMsg}`
        });
      } catch (error) {
        await logger.error(`[错误处理] 更新面试错误状态失败: ${error}`);
      }
    }

    // 同步更新 voiceState 到错误状态，让控制栏等其他窗口能感知到错误
    setVoiceState({
      mode: 'mock-interview',
      subState: 'mock-interview-error',
      interviewId: interviewId
    });
  };

  // ===========================================================================
  // 暂停/继续/停止
  // ===========================================================================

  const handlePauseInterview = async () => {
    const machine = getMockInterviewStateMachine();
    if (!machine) return;

    const interviewId = currentInterview.get();
    if (!interviewId) return;

    try {
      machine.updateContextPartial({ isPaused: true });

      await interviewService.updateInterview(interviewId, {
        status: 'mock-interview-paused',
        message: '面试已暂停'
      });

      setVoiceState({
        mode: 'mock-interview',
        subState: 'mock-interview-paused',
        interviewId: interviewId
      });
      setCurrentLine('面试已暂停');

    } catch (error) {
      await logger.error(`[暂停] 暂停面试失败: ${error}`);
      setErrorMessage(`暂停面试失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleResumeInterview = async () => {
    const machine = getMockInterviewStateMachine();
    if (!machine) return;

    const interviewId = currentInterview.get();
    if (!interviewId) return;

    try {
      // 状态机还在内存中，直接使用当前 context
      const currentState = machine.getState();
      machine.updateContextPartial({ isPaused: false });

      await interviewService.updateInterview(interviewId, {
        status: 'mock-interview-recording',
        message: '面试已恢复'
      });

      setVoiceState({
        mode: 'mock-interview',
        subState: 'mock-interview-playing',
        interviewId: interviewId
      });
      setCurrentLine('面试已恢复');

      continueFromState(currentState);

    } catch (error) {
      await logger.error(`[继续] 恢复面试失败: ${error}`);
      setErrorMessage(`恢复面试失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleStopInterview = async () => {
    try {
      const interviewId = currentInterview.get();
      if (!interviewId) {
        return;
      }

      const timerDuration = getTimerState().duration || 0;

      setCurrentLine('正在结束面试...');

      await interviewService.updateInterview(interviewId, {
        status: 'mock-interview-completed',
        duration: timerDuration,
        message: '用户主动停止面试'
      });

      // 构造模型配置，使用组件状态中的 selectedModel
      const modelConfig = selectedModel ? {
        provider: selectedModel.provider,
        model_name: selectedModel.model_name,
        credentials: selectedModel.credentials || '{}',
      } : undefined;

      // 获取当前选中模型的参数
      const modelParams = selectedModel ? await modelService.getModelParams(selectedModel.id) : [];

      // 使用公共批量分析函数，传入模型配置
      const analyzeResult = await batchAnalyzeReviews({
        interviewId,
        modelConfig,
        modelParams,
        onProgress: (msg) => setCurrentLine(msg),
        onError: (error) => {
          setErrorMessage(error);
          setTimestamp(Date.now());
        }
      });

      if (analyzeResult.analyzed > 0 || analyzeResult.skipped > 0) {
        setCurrentLine('正在生成面试报告...');

        await generateReport({
          interviewId,
          jobTitle: selectedPosition?.title || '未知职位',
          resumeContent: selectedPosition?.resumeContent || '',
          durationSec: timerDuration,
          onError: (error) => {
            setErrorMessage(error);
            setTimestamp(Date.now());
          }
        });
      }

      setCurrentLine('面试已结束');
      setVoiceState({
        mode: 'mock-interview',
        subState: 'mock-interview-completed',
        interviewId: interviewId
      });

      // 先将状态机状态设置为 COMPLETED，触发 persistCurrentState 更新 localStorage
      const machine = getMockInterviewStateMachine();
      if (machine) {
        machine.setState(InterviewState.COMPLETED);
      }

      stopMockInterview();

    } catch (error) {
      await logger.error(`[停止] 结束面试失败: ${error}`);
      setErrorMessage(`结束面试失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setCurrentLine('');
      const interviewId = currentInterview.get();
      setVoiceState({
        mode: 'mock-interview',
        subState: 'mock-interview-completed',
        interviewId: interviewId
      });

      // 先将状态机状态设置为 COMPLETED，触发 persistCurrentState 更新 localStorage
      const machine = getMockInterviewStateMachine();
      if (machine) {
        machine.setState(InterviewState.COMPLETED);
      }

      stopMockInterview();
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
        disabled={(voiceState.subState === 'mock-interview-recording' ||
                   voiceState.subState === 'mock-interview-paused' ||
                   voiceState.subState === 'mock-interview-playing')}
      />

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
                  const name = selected?.label || '默认麦克风';
                  await saveMicrophoneDevice(value, name);
                }}
                disabled={loading || (voiceState.subState === 'mock-interview-recording' ||
                         voiceState.subState === 'mock-interview-paused' ||
                         voiceState.subState === 'mock-interview-playing')}
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
                  const name = selected?.label || '默认扬声器';
                  await saveSpeakerDevice(value, name);
                }}
                disabled={loading || (voiceState.subState === 'mock-interview-recording' ||
                         voiceState.subState === 'mock-interview-paused' ||
                         voiceState.subState === 'mock-interview-playing')}
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

          {onStart && (voiceState.subState !== 'mock-interview-recording' &&
            voiceState.subState !== 'mock-interview-paused' &&
            voiceState.subState !== 'mock-interview-playing') && (
            <button
              className="test-button"
              onClick={handleStartInterview}
              disabled={loading || !piperAvailable || isInitializing}
            >
              {isInitializing ? '正在初始化...' : '开始模拟面试'}
            </button>
          )}

          {(voiceState.subState === 'mock-interview-recording' ||
            voiceState.subState === 'mock-interview-paused' ||
            voiceState.subState === 'mock-interview-playing') && (
            <div className="interview-segmented">
              {voiceState.subState === 'mock-interview-paused' ? (
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
