import * as Tooltip from '@radix-ui/react-tooltip';
import { ChevronDown, CornerDownLeft, Pause, Play, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { startSpeakerRecognition, type SpeakerRecognitionController } from '../../../utils/audioRecognition';
import { setVoiceState, useVoiceState } from '../../../utils/voiceState';
import { interviewDataService } from '../../ai-question/components/shared/data/InterviewDataService';
import { mockInterviewService } from '../../ai-question/components/shared/services/InterviewService';
import { contextManagementService } from '../../ai-question/components/shared/services/ContextManagementService';
import { TrainingState, TrainingStateMachine } from '../../ai-question/components/shared/state/TrainingStateMachine';
import { promptService } from '../../prompts/promptService';
import type { ModelConfig, ModelParam } from '../../utils/ai/aiService';
import { aiService } from '../../utils/ai/aiService';
import { currentInterview } from '../../utils/currentInterview';
import { setInterviewTrainingState, useInterviewTrainingState } from '../../utils/interviewTrainingState';
import { interviewService } from '../api/interviewService';
import { JobPosition } from '../api/jobPositionService';
import { Model } from '../api/modelService';
import { JobPositionCard } from './JobPositionCard';

interface AudioDevice {
  deviceId: string;
  label: string;
}

interface InterviewTrainingEntryBodyProps {
  selectedJobId?: string;
  onStart?: () => void;
}

export function InterviewTrainingEntryBody({ selectedJobId, onStart }: InterviewTrainingEntryBodyProps) {
  const [currentLine, setCurrentLine] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [timestamp, setTimestamp] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState<JobPosition | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'zh-CN' | 'zh-TW' | 'en-US'>('zh-CN');

  const voiceState = useVoiceState();

  const [micDevices, setMicDevices] = useState<AudioDevice[]>([]);
  const [speakerDevices, setSpeakerDevices] = useState<AudioDevice[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('');

  const stateMachine = useRef<TrainingStateMachine | null>(null);
  const [_interviewState, setInterviewState] = useState<TrainingState>(TrainingState.IDLE);
  const [isInitializing, setIsInitializing] = useState(false);

  const currentQuestionData = useRef<{
    sequence: number;
    questionId?: string;
    question?: string;
    answer?: string;
    referenceAnswer?: string;
    candidateAnswer?: string;
    otherId?: string;
    otherContent?: string;
  } | null>(null);

  // 扬声器识别控制器
  const speakerController = useRef<SpeakerRecognitionController | null>(null);

  const trainingState = useInterviewTrainingState();

  // 监听用户回答提交
  useEffect(() => {
    const candidateAnswer = trainingState.candidateAnswer;

    if (candidateAnswer && stateMachine.current) {
      const currentState = stateMachine.current.getState();

      if (currentState === TrainingState.USER_LISTENING ||
          currentState === TrainingState.USER_SPEAKING) {

        if (currentQuestionData.current) {
          currentQuestionData.current.candidateAnswer = candidateAnswer;
        }

        stateMachine.current.send({
          type: 'USER_FINISHED_SPEAKING',
          payload: { response: candidateAnswer }
        });
      } else {
        console.warn(`用户在非法状态 ${currentState} 下提交了答案，已忽略`);
        setInterviewTrainingState({ candidateAnswer: '' });
      }
    }
  }, [trainingState.candidateAnswer]);

  // 自动模式：检测面试官问题完成（5 秒静音 + >=5 字）
  useEffect(() => {
    if (!trainingState.isAutoMode) return;
    if (voiceState.subState !== 'interview-training-recording') return;
    if (trainingState.currentPhase !== 'listening-interviewer') return;

    const timer = setInterval(() => {
      const now = Date.now();
      const silenceDuration = now - trainingState.lastInterviewerSpeechTime;
      const question = trainingState.interviewerQuestion.trim();

      // 检查: 5 秒静音 + 至少 5 个字符
      if (silenceDuration >= 5000 && question.length >= 5 && trainingState.lastInterviewerSpeechTime > 0) {
        handleAutoQuestionDetected(question);
      }
    }, 1000); // 每秒检查一次

    return () => clearInterval(timer);
  }, [
    trainingState.isAutoMode,
    trainingState.lastInterviewerSpeechTime,
    trainingState.interviewerQuestion,
    trainingState.currentPhase,
    voiceState.subState
  ]);

  // 初始化
  useEffect(() => {

    const loadAudioSettings = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();

        const mics = devices
          .filter(device => device.kind === 'audioinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `麦克风 ${device.deviceId.slice(0, 4)}`
          }));

        const speakers = devices
          .filter(device => device.kind === 'audiooutput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `扬声器 ${device.deviceId.slice(0, 4)}`
          }));

        setMicDevices(mics);
        setSpeakerDevices(speakers);

        // 读取全局 ASR 配置,尝试回填默认设备
        const api: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
        let defaultMic: string | undefined;
        let defaultSpeaker: string | undefined;
        try {
          const res = await api?.asrConfig?.get?.();
          const cfg = res?.config;
          if (cfg) {
            defaultMic = cfg.microphone_device_id;
            defaultSpeaker = cfg.speaker_device_id;
          }
        } catch {}

        // 优先使用配置中的设备,如果不存在则使用第一个
        if (mics.length > 0) {
          const exists = defaultMic && mics.some(d => d.deviceId === defaultMic);
          setSelectedMic(exists && defaultMic ? defaultMic : mics[0].deviceId);
        }
        if (speakers.length > 0) {
          const exists = defaultSpeaker && speakers.some(d => d.deviceId === defaultSpeaker);
          setSelectedSpeaker(exists && defaultSpeaker ? defaultSpeaker : speakers[0].deviceId);
        }

      } catch (error) {
        console.error('Failed to load audio settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAudioSettings();

    return () => {
      if (stateMachine.current) {
        stateMachine.current.reset();
      }
      if (speakerController.current) {
        speakerController.current.stop().catch(console.error);
      }
    };
  }, []);


  // 开始监听扬声器(面试官提问)
  const startListeningInterviewer = async () => {
    try {
      const controller = await startSpeakerRecognition({
        deviceId: selectedSpeaker || undefined,
        sessionId: 'interviewer-training',
        onText: (text) => {
          setInterviewTrainingState({
            interviewerQuestion: text,
            lastInterviewerSpeechTime: Date.now() // 更新最后说话时间
          });
        },
        onError: (errorMessage) => {
          console.error('扬声器识别错误:', errorMessage);
          setErrorMessage(`扬声器识别错误: ${errorMessage}`);
          setInterviewTrainingState({
            currentPhase: undefined,
            interviewerQuestion: ''
          });
        },
        onOpen: () => {
          // 扬声器识别已启动
        },
        onClose: () => {
          // 扬声器识别已关闭
        },
      });

      speakerController.current = controller;

      setInterviewTrainingState({
        currentPhase: 'listening-interviewer',
        interviewerQuestion: '',
      });
    } catch (error) {
      console.error('启动扬声器监听失败:', error);
      throw error;
    }
  };

  // 停止监听扬声器
  const stopListeningInterviewer = async () => {
    try {
      if (speakerController.current) {
        await speakerController.current.stop();
        speakerController.current = null;
      }
    } catch (error) {
      console.error('停止扬声器监听失败:', error);
    }
  };

  // 处理提问完毕（手动模式）
  const handleQuestionComplete = async () => {
    try {
      await stopListeningInterviewer();

      const interviewerQuestion = trainingState.interviewerQuestion;

      if (!interviewerQuestion || interviewerQuestion.length < 5) {
        setErrorMessage('面试官问题太短，请重新提问');
        await startListeningInterviewer();
        return;
      }

      setCurrentLine(interviewerQuestion);

      setInterviewTrainingState({
        currentPhase: 'ai-generating',
        isLoading: true,
      });

      // 如果状态机未初始化,创建并送入 AI_THINKING 以外的起点
      if (!stateMachine.current) {
        const interviewId = currentInterview.get();
        if (!interviewId) {
          throw new Error('面试 ID 不存在');
        }

        const initialContext = {
          interviewId: interviewId,
          jobPosition: selectedPosition,
          resume: {
            resumeTitle: selectedPosition?.resumeTitle,
            resumeContent: selectedPosition?.resumeContent,
          },
          questionsBank: [],
          currentQuestionIndex: 0,
          totalQuestions: selectedPosition?.question_count || 10,
          currentQuestion: interviewerQuestion,
        };

        stateMachine.current = new TrainingStateMachine(initialContext);

        stateMachine.current.onStateChange(async (state, context) => {
          setInterviewState(state);
          await handleStateChange(state, context);
        });

        // 直接进入 GENERATING_ANSWER 阶段
        stateMachine.current.send({
          type: 'QUESTION_RECEIVED',
          payload: { question: interviewerQuestion }
        });
      } else {
        // 已经初始化过,更新问题并继续
        stateMachine.current.updateContextPartial({
          currentQuestion: interviewerQuestion,
        });

        // 进入下一轮循环
        stateMachine.current.send({
          type: 'QUESTION_RECEIVED',
          payload: { question: interviewerQuestion }
        });
      }

    } catch (error) {
      console.error('处理提问完毕失败:', error);
      setErrorMessage(`处理提问完毕失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 处理自动模式下的问题检测
  const handleAutoQuestionDetected = async (question: string) => {
    try {
      // 1. 如果有上一轮的 review ID,先保存并分析上一轮
      if (trainingState.currentRoundReviewId) {
        await saveAndAnalyzePreviousRound(trainingState.currentRoundReviewId);
      }

      // 2. 清空扬声器文本，准备接收新问题
      setInterviewTrainingState({
        interviewerQuestion: '',
        lastInterviewerSpeechTime: 0, // 重置时间戳
      });

      // 3. 设置为 AI 生成阶段
      setCurrentLine(question);
      setInterviewTrainingState({
        currentPhase: 'ai-generating',
        isLoading: true,
      });

      // 4. 创建新的 review 记录
      const interviewId = currentInterview.get();
      if (!interviewId) {
        throw new Error('面试 ID 不存在');
      }

      // 如果状态机未初始化,创建状态机
      if (!stateMachine.current) {
        const initialContext = {
          interviewId: interviewId,
          jobPosition: selectedPosition,
          resume: {
            resumeTitle: selectedPosition?.resumeTitle,
            resumeContent: selectedPosition?.resumeContent,
          },
          questionsBank: [],
          currentQuestionIndex: 0,
          totalQuestions: selectedPosition?.question_count || 10,
          currentQuestion: question,
        };

        stateMachine.current = new TrainingStateMachine(initialContext);

        stateMachine.current.onStateChange(async (state, context) => {
          setInterviewState(state);
          await handleStateChange(state, context);
        });
      } else {
        // 状态机已存在，更新当前问题索引
        const context = stateMachine.current.getContext();
        stateMachine.current.updateContextPartial({
          currentQuestion: question,
          currentQuestionIndex: context.currentQuestionIndex + 1,
        });
      }

      // 5. 创建新的 review 记录
      const newReview = await mockInterviewService.createReview({
        interview_id: interviewId,
        content: question, // 使用 content 字段存储问题
        asked_question: question,
      });

      // 6. 更新 currentRoundReviewId
      setInterviewTrainingState({
        currentRoundReviewId: newReview.id,
      });

      // 7. 生成 AI 答案
      await generateAnswerInBackground(stateMachine.current.getContext());

      // 8. 发送答案生成完成事件
      stateMachine.current.send({ type: 'ANSWER_GENERATED' });

    } catch (error) {
      console.error('自动问题检测处理失败:', error);
      setErrorMessage(`自动问题检测处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 保存并分析上一轮回答
  const saveAndAnalyzePreviousRound = async (reviewId: string) => {
    try {
      const candidateAnswer = trainingState.candidateAnswer;

      // 如果用户没有回答，跳过
      if (!candidateAnswer || candidateAnswer.trim().length === 0) {
        return;
      }

      // 更新 review 记录中的 candidate_answer
      await mockInterviewService.updateReview(reviewId, {
        candidate_answer: candidateAnswer,
      });

      // 获取完整的 review 记录用于分析
      const reviews = await mockInterviewService.getInterviewReviews(currentInterview.get() || '');
      const review = reviews.find(r => r.id === reviewId);

      if (!review) {
        console.warn('未找到 review 记录:', reviewId);
        return;
      }

      // 调用 LLM 分析用户回答
      await analyzeReview(review);
    } catch (error) {
      console.error('保存并分析上一轮失败:', error);
      throw error;
    }
  };

  const handleStartInterview = async () => {
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

      const api: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
      const userDataResult = await api?.getUserData?.();
      const userData = userDataResult?.success ? userDataResult.userData?.user : null;

      const interviewData = {
        jobId: selectedPosition.id,
        jobTitle: selectedPosition.title,
        jobContent: selectedPosition.description,
        questionCount: selectedPosition.question_count || 10,
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

      const response = await interviewService.createInterview(interviewData);

      currentInterview.clear();
      currentInterview.set(response.id);

      setInterviewTrainingState({
        aiMessage: '',
        speechText: '',
        candidateAnswer: '',
        interviewerQuestion: '',
        isLoading: false,
        isListening: false,
        currentPhase: 'listening-interviewer',
      });

      setVoiceState({
        interviewId: response.id,
        mode: 'interview-training',
        subState: 'interview-training-recording',
      });

      interviewDataService.initializeInterview(response.id, interviewData.questionCount);

      // 初始化上下文管理服务
      await contextManagementService.initialize({
        interviewId: response.id,
        resume: interviewData.resumesContent || '',
        jd: interviewData.jobContent || '',
      });

      console.log('[InterviewTraining] 上下文管理服务初始化完成');

      // 开始监听扬声器
      await startListeningInterviewer();

      setCurrentLine('正在监听面试官提问...');
      setErrorMessage('');
      setIsInitializing(false);

      if (onStart) {
        onStart();
      }
    } catch (error) {
      console.error('开始面试训练失败:', error);
      const errorMsg = `开始面试训练失败: ${error instanceof Error ? error.message : '未知错误'}`;
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
          console.error('更新面试错误状态失败:', updateError);
        }
      }
    }
  };

  const checkAndHandlePause = (): boolean => {
    if (!stateMachine.current) return false;
    const context = stateMachine.current.getContext();
    return !!context.isPaused;
  };

  const transitionToNext = (eventType: string, payload?: any): boolean => {
    if (!stateMachine.current) return false;

    if (checkAndHandlePause()) {
      return false;
    }

    return stateMachine.current.send({ type: eventType, payload });
  };

  const continueFromState = (state: TrainingState): void => {
    if (!stateMachine.current) return;

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
      stateMachine.current.send({ type: eventType });
    }
  };

  const handlePauseInterview = async () => {
    if (!stateMachine.current) return;

    const interviewId = currentInterview.get();
    if (!interviewId) return;

    try {
      stateMachine.current.updateContextPartial({ isPaused: true });

      const currentState = stateMachine.current.getState();
      const currentContext = stateMachine.current.getContext();

      localStorage.setItem('training-paused-state', JSON.stringify({
        interviewId: interviewId,
        state: currentState,
        context: currentContext,
        timestamp: Date.now()
      }));

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
      console.error('暂停面试失败:', error);
      setErrorMessage(`暂停面试失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleResumeInterview = async () => {
    if (!stateMachine.current) return;

    const interviewId = currentInterview.get();
    if (!interviewId) return;

    try {
      const savedStateStr = localStorage.getItem('training-paused-state');
      if (!savedStateStr) {
        throw new Error('未找到暂停的训练状态');
      }

      const savedState = JSON.parse(savedStateStr);

      if (savedState.interviewId !== interviewId) {
        throw new Error('暂停状态与当前训练不匹配');
      }

      stateMachine.current.restoreContext(savedState.context);

      stateMachine.current.updateContextPartial({ isPaused: false });

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

      continueFromState(savedState.state);

      localStorage.removeItem('training-paused-state');

    } catch (error) {
      console.error('恢复面试失败:', error);
      setErrorMessage(`恢复面试失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleStopInterview = async () => {
    try {
      const interviewId = currentInterview.get();
      if (!interviewId) {
        return;
      }

      // 停止扬声器监听
      await stopListeningInterviewer();

      const timerDuration = voiceState.timerDuration || 0;

      setCurrentLine('正在结束面试训练...');

      await interviewService.updateInterview(interviewId, {
        status: 'interview-training-completed',
        duration: timerDuration,
        message: '用户主动停止面试训练'
      });

      const reviews = await mockInterviewService.getInterviewReviews(interviewId);

      if (!reviews || reviews.length === 0) {
        setCurrentLine('面试训练已结束');
        setVoiceState({
          mode: 'interview-training',
          subState: 'interview-training-completed',
          interviewId: interviewId
        });
        return;
      }

      const needsAnalysis: any[] = [];
      const readyForReport: any[] = [];

      for (const review of reviews) {
        if (!review.candidate_answer) {
          continue;
        }

        const hasAnalysis = review.pros && review.cons && review.suggestions &&
                           review.key_points && review.assessment;

        if (hasAnalysis) {
          readyForReport.push(review);
        } else {
          needsAnalysis.push(review);
        }
      }

      if (needsAnalysis.length > 0) {
        setCurrentLine(`正在分析 ${needsAnalysis.length} 个回答...`);

        for (const review of needsAnalysis) {
          await analyzeReview(review);
        }
      }

      const totalValidReviews = readyForReport.length + needsAnalysis.length;
      if (totalValidReviews > 0) {
        setCurrentLine('正在生成面试报告...');
        await generateInterviewReportOnStop(interviewId);
      }

      setCurrentLine('面试训练已结束');
      setVoiceState({
        mode: 'interview-training',
        subState: 'interview-training-completed',
        interviewId: interviewId
      });

    } catch (error) {
      console.error('结束面试训练失败:', error);
      setErrorMessage(`结束面试训练失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setCurrentLine('');
      const interviewId = currentInterview.get();
      setVoiceState({
        mode: 'interview-training',
        subState: 'interview-training-completed',
        interviewId: interviewId
      });
    }
  };

  const analyzeReview = async (review: any) => {
    try {
      const askedQuestion = review.asked_question || review.question || '';
      const candidateAnswer = review.candidate_answer || '';
      const referenceAnswer = review.reference_answer || '';

      if (!askedQuestion || !candidateAnswer) {
        return;
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

      const api: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
      const userDataResult = await api?.getUserData?.();
      const selectedModel = userDataResult?.success ? userDataResult.userData?.selected_model : null;

      if (!selectedModel) {
        throw new Error('未选择模型');
      }

      const modelConfig: ModelConfig = {
        provider: selectedModel.provider,
        model_name: selectedModel.model_name,
        credentials: selectedModel.credentials || '{}',
      };

      const modelParams: ModelParam[] = userDataResult?.success ? (userDataResult.userData?.model_params || []) : [];

      let analysisResult = '';

      await aiService.callAIStreamWithCustomModel(messages, modelConfig, modelParams, (chunk: any) => {
        if (chunk.error) {
          throw new Error(chunk.error);
        }

        if (chunk.finished) {
          // 分析完成
        } else {
          analysisResult += chunk.content;
        }
      });

      const analysis = JSON.parse(analysisResult.trim());

      await mockInterviewService.updateReview(review.id, {
        pros: analysis.pros || '',
        cons: analysis.cons || '',
        suggestions: analysis.suggestions || '',
        key_points: analysis.key_points || '',
        assessment: analysis.assessment || '',
        other_id: review.other_id,
        other_content: review.other_content,
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '分析回答失败';
      console.error('分析回答失败:', error);
      setErrorMessage(`分析回答失败: ${errorMsg}`);
      setTimestamp(Date.now());
      throw error;
    }
  };

  const generateInterviewReportOnStop = async (interviewId: string) => {
    try {
      const timerDuration = voiceState.timerDuration || 0;

      const reviews = await mockInterviewService.getInterviewReviews(interviewId);

      if (!reviews || reviews.length === 0) {
        return;
      }

      const jobTitle = selectedPosition?.title || '未知职位';
      const resumeContent = selectedPosition?.resumeContent || '';

      const summaryData = {
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
      const reviewsData = JSON.stringify(summaryData, null, 2);

      let scoreData;
      try {
        const scorePrompt = await promptService.buildScorePrompt(jobTitle, resumeContent, reviewsData);
        scoreData = await aiService.callAIForJson([
          { role: 'user', content: scorePrompt }
        ]);
      } catch (error: any) {
        if (error?.message?.includes('maximum context length') || error?.message?.includes('tokens')) {
          const batchSize = 1;
          const batches = [];
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

          scoreData = {
            total_score: Math.round(batchResults.reduce((sum, r) => sum + (r.total_score || 0), 0) / batchResults.length),
            num_questions: reviews.length,
            radar: {
              interactivity: Math.round(batchResults.reduce((sum, r) => sum + (r.radar?.interactivity || 0), 0) / batchResults.length),
              confidence: Math.round(batchResults.reduce((sum, r) => sum + (r.radar?.confidence || 0), 0) / batchResults.length),
              professionalism: Math.round(batchResults.reduce((sum, r) => sum + (r.radar?.professionalism || 0), 0) / batchResults.length),
              relevance: Math.round(batchResults.reduce((sum, r) => sum + (r.radar?.relevance || 0), 0) / batchResults.length),
              clarity: Math.round(batchResults.reduce((sum, r) => sum + (r.radar?.clarity || 0), 0) / batchResults.length),
            },
            overall_summary: batchResults.map(r => r.overall_summary).join(' '),
            pros: batchResults.map(r => r.pros).join('\n'),
            cons: batchResults.map(r => r.cons).join('\n'),
            suggestions: batchResults.map(r => r.suggestions).join('\n'),
          };
        } else {
          throw error;
        }
      }

      let insightData;
      try {
        const insightPrompt = await promptService.buildInsightPrompt(jobTitle, resumeContent, reviewsData);
        insightData = await aiService.callAIForJson([
          { role: 'user', content: insightPrompt }
        ]);
      } catch (error: any) {
        if (error?.message?.includes('maximum context length') || error?.message?.includes('tokens')) {
          insightData = {
            interviewer: { score: 0, summary: '', role: '', mbti: '', personality: '', preference: '' },
            candidate: { summary: '', mbti: '', personality: '', job_preference: '' },
            strategy: { prepare_details: '', business_understanding: '', keep_logical: '' }
          };
        } else {
          throw error;
        }
      }

      await interviewService.saveInterviewScore({
        interviewId,
        totalScore: scoreData.total_score || 0,
        durationSec: timerDuration,
        numQuestions: scoreData.num_questions || 0,
        overallSummary: scoreData.overall_summary || '',
        pros: scoreData.pros || '',
        cons: scoreData.cons || '',
        suggestions: scoreData.suggestions || '',
        radarInteractivity: scoreData.radar?.interactivity || 0,
        radarConfidence: scoreData.radar?.confidence || 0,
        radarProfessionalism: scoreData.radar?.professionalism || 0,
        radarRelevance: scoreData.radar?.relevance || 0,
        radarClarity: scoreData.radar?.clarity || 0,
      });

      await interviewService.saveInterviewInsight({
        interviewId,
        interviewerScore: insightData.interviewer?.score || 0,
        interviewerSummary: insightData.interviewer?.summary || '',
        interviewerRole: insightData.interviewer?.role || '',
        interviewerMbti: insightData.interviewer?.mbti || '',
        interviewerPersonality: insightData.interviewer?.personality || '',
        interviewerPreference: insightData.interviewer?.preference || '',
        candidateSummary: insightData.candidate?.summary || '',
        candidateMbti: insightData.candidate?.mbti || '',
        candidatePersonality: insightData.candidate?.personality || '',
        candidateJobPreference: insightData.candidate?.job_preference || '',
        strategyPrepareDetails: insightData.strategy?.prepare_details || '',
        strategyBusinessUnderstanding: insightData.strategy?.business_understanding || '',
        strategyKeepLogical: insightData.strategy?.keep_logical || '',
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '生成面试报告失败';
      console.error('生成面试报告失败:', error);
      setErrorMessage(`生成面试报告失败: ${errorMsg}`);
      setTimestamp(Date.now());
      throw error;
    }
  };

  const handlePositionSelect = (position: JobPosition | null) => {
    setSelectedPosition(position);
  };

  const handleModelSelect = (model: Model | null) => {
    setSelectedModel(model);
  };

  // 处理状态机状态变化
  const handleStateChange = async (state: TrainingState, context: any) => {
    setInterviewTrainingState({ interviewState: state });

    try {
      switch (state) {
        case TrainingState.LISTENING_INTERVIEWER:
          // 已在 startListeningInterviewer 中处理
          break;
        case TrainingState.GENERATING_ANSWER:
          await handleGeneratingAnswer(context);
          break;
        case TrainingState.USER_LISTENING:
          handleUserListening();
          break;
        case TrainingState.USER_SPEAKING:
          handleUserSpeaking();
          break;
        case TrainingState.AI_ANALYZING:
          await handleAIAnalyzing(context);
          break;
        case TrainingState.ROUND_COMPLETE:
          handleRoundComplete(context);
          break;
        case TrainingState.INTERVIEW_ENDING:
          await handleInterviewEnding();
          break;
        case TrainingState.GENERATING_REPORT:
          transitionToNext('REPORT_COMPLETE');
          break;
        case TrainingState.COMPLETED:
          handleInterviewCompleted();
          break;
        case TrainingState.ERROR:
          handleError(context);
          break;
      }
    } catch (error) {
      console.error('Error handling state change:', error);
      setErrorMessage(`状态处理错误: ${error instanceof Error ? error.message : '未知错误'}`);
      setCurrentLine('');
    } finally {
      setIsInitializing(false);
    }
  };

  // 生成答案阶段
  const handleGeneratingAnswer = async (context: any) => {
    try {
      const question = context.currentQuestion;
      if (!question) throw new Error('No question available');

      setCurrentLine(question);

      const existingQuestion = interviewDataService.getQuestionState(context.currentQuestionIndex);
      if (!existingQuestion || !existingQuestion.reviewId) {
        await interviewDataService.createQuestionRecord(context.currentQuestionIndex, question);
      }

      // 生成答案
      await generateAnswerInBackground(context);

      // 发送答案生成完成事件
      stateMachine.current?.send({ type: 'ANSWER_GENERATED' });
    } catch (error) {
      stateMachine.current?.send({ type: 'GENERATION_ERROR', payload: { error: error instanceof Error ? error.message : String(error) } });
    }
  };

  // 用户监听阶段
  const handleUserListening = () => {
    setErrorMessage('');
    setInterviewTrainingState({
      isListening: true,
      speechText: '',
      currentPhase: 'listening-candidate'
    });
  };

  // 用户说话阶段
  const handleUserSpeaking = () => {
    setErrorMessage('');
  };

  // AI 分析阶段
  const handleAIAnalyzing = async (context: any) => {
    setErrorMessage('');

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

      const api: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
      const userDataResult = await api?.getUserData?.();
      const modelParams: ModelParam[] = userDataResult?.success ? (userDataResult.userData?.model_params || []) : [];

      let analysisResult = '';

      await aiService.callAIStreamWithCustomModel(messages, modelConfig, modelParams, async (chunk) => {
        if (chunk.error) {
          stateMachine.current?.send({ type: 'ANALYSIS_ERROR', payload: { error: chunk.error } });
          return;
        }

        if (chunk.finished) {
          analysisResult = analysisResult.trim();

          try {
            const analysis = JSON.parse(analysisResult);

            const questionState = interviewDataService.getQuestionState(context.currentQuestionIndex);
            if (!questionState?.reviewId) {
              throw new Error('Review ID not found');
            }

            await mockInterviewService.updateReview(questionState.reviewId, {
              question_id: questionData.questionId,
              question: questionData.question,
              answer: questionData.answer,
              reference_answer: questionData.referenceAnswer || '',
              candidate_answer: candidateAnswer,
              pros: analysis.pros || '',
              cons: analysis.cons || '',
              suggestions: analysis.suggestions || '',
              key_points: analysis.key_points || '',
              assessment: analysis.assessment || '',
              other_id: questionData.otherId,
              other_content: questionData.otherContent,
            });

            // 如果使用了押题或其他文件，同时保存到 ChromaDB（AI 向量记录）
            if (questionData.questionId || questionData.otherId) {
              await mockInterviewService.saveAIVectorRecord({
                id: questionState.reviewId,
                interview_id: interviewDataService.getInterviewDataState()?.interviewId || '',
                note_type: 'training',
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

            stateMachine.current?.send({ type: 'ANALYSIS_COMPLETE' });
          } catch (parseError) {
            console.error('Failed to parse analysis result:', parseError);
            stateMachine.current?.send({ type: 'ANALYSIS_ERROR', payload: { error: '分析结果解析失败' } });
          }
        } else {
          analysisResult += chunk.content;
        }
      });
    } catch (error) {
      stateMachine.current?.send({ type: 'ANALYSIS_ERROR', payload: { error: error instanceof Error ? error.message : String(error) } });
    }
  };

  // 后台生成答案
  const generateAnswerInBackground = async (context: any) => {
    setErrorMessage('');

    try {
      if (!selectedModel) {
        throw new Error('未选择模型');
      }

      // 从向量知识库中搜索相似问题（押题答案、岗位信息、简历信息、其他文件）
      const similarQuestion = await mockInterviewService.findSimilarQuestion(
        context.currentQuestion,
        context.jobPosition.id,
        0.8
      );

      // 提取各类内容（可能为空字符串）
      const referenceAnswerFromBank = similarQuestion?.answer || '';
      const jobContent = similarQuestion?.jobContent || '';
      const resumeContent = similarQuestion?.resumeContent || '';
      const otherFileContent = similarQuestion?.otherContent || '';

      // 构建答案生成的问题提示
      let answerQuestionPrompt = `请为以下面试问题提供一个专业的参考答案：\n\n问题：${context.currentQuestion}`;

      if (referenceAnswerFromBank) {
        answerQuestionPrompt += `\n\n题库参考答案：${referenceAnswerFromBank}`;
      }

      if (jobContent) {
        answerQuestionPrompt += `\n\n岗位信息：${jobContent}`;
      }

      if (resumeContent) {
        answerQuestionPrompt += `\n\n简历信息：${resumeContent}`;
      }

      if (otherFileContent) {
        answerQuestionPrompt += `\n\n相关项目资料：${otherFileContent}`;
      }

      // 使用优化后的上下文（包含简历/JD摘要和对话历史）
      const optimizedMessages = await contextManagementService.getOptimizedContext(answerQuestionPrompt);

      console.log('[InterviewTraining] 使用优化后的上下文生成答案', {
        round: context.currentQuestionIndex + 1,
        totalMessages: optimizedMessages.length,
        hasQuestionAnswer: !!referenceAnswerFromBank,
        hasOtherFile: !!otherFileContent,
        stats: contextManagementService.getStats(),
      });

      const modelConfig: ModelConfig = {
        provider: selectedModel.provider,
        model_name: selectedModel.model_name,
        credentials: selectedModel.credentials || '{}',
      };

      const api: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
      const userDataResult = await api?.getUserData?.();
      const modelParams: ModelParam[] = userDataResult?.success ? (userDataResult.userData?.model_params || []) : [];

      let referenceAnswer = '';

      await aiService.callAIStreamWithCustomModel(optimizedMessages, modelConfig, modelParams, async (chunk) => {
        if (chunk.error) {
          stateMachine.current?.send({ type: 'GENERATION_ERROR', payload: { error: chunk.error } });
          return;
        }

        if (chunk.finished) {
          referenceAnswer = referenceAnswer.trim();

          // 暂存押题信息、其他文件信息和参考答案到本地状态
          currentQuestionData.current = {
            sequence: context.currentQuestionIndex,
            questionId: similarQuestion?.questionId,
            question: similarQuestion?.question,
            answer: similarQuestion?.answer,
            referenceAnswer: referenceAnswer,
            otherId: similarQuestion?.otherId,
            otherContent: similarQuestion?.otherContent,
          };

          // 流式输出到右侧窗口
          setInterviewTrainingState({
            aiMessage: referenceAnswer,
          });

        } else {
          referenceAnswer += chunk.content;
          setInterviewTrainingState({
            aiMessage: referenceAnswer,
          });
        }
      });
    } catch (error) {
      stateMachine.current?.send({ type: 'GENERATION_ERROR', payload: { error: error instanceof Error ? error.message : String(error) } });
    }
  };

  // 轮次完成
  const handleRoundComplete = async (context: any) => {
    setCurrentLine(`第${context.currentQuestionIndex + 1}个问题已完成`);
    setErrorMessage('');

    try {
      // 记录对话到上下文管理服务
      const question = context.currentQuestion || '';
      const candidateAnswer = currentQuestionData.current?.candidateAnswer || context.userResponse || '';

      if (question && candidateAnswer) {
        await contextManagementService.recordConversation(question, candidateAnswer);
        console.log('[InterviewTraining] 对话已记录到上下文管理服务', {
          round: context.currentQuestionIndex + 1,
          questionLength: question.length,
          answerLength: candidateAnswer.length,
        });
      }
    } catch (error) {
      console.error('[InterviewTraining] 记录对话失败:', error);
      // 不影响主流程，继续执行
    }

    interviewDataService.markQuestionComplete(context.currentQuestionIndex);

    const shouldEnd = stateMachine.current?.shouldEndInterview();

    if (shouldEnd) {
      stateMachine.current?.send({ type: 'END_TRAINING' });
    } else {
      // 手动模式:重新开始监听扬声器
      // 自动模式:扬声器一直在监听,只需清理状态
      if (!trainingState.isAutoMode) {
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
            console.error('重新启动扬声器监听失败:', error);
            setErrorMessage('重新启动扬声器监听失败');
          }
        }, 2000);
      } else {
        // 自动模式:清理状态,扬声器持续监听
        setInterviewTrainingState({
          currentPhase: 'listening-interviewer',
          aiMessage: '',
          speechText: '',
          candidateAnswer: '',
          lastInterviewerSpeechTime: 0 // 重置静音检测时间
        });
        setCurrentLine('正在监听面试官下一个问题...');
      }
    }
  };

  // 训练结束阶段
  const handleInterviewEnding = async () => {
    setCurrentLine('面试训练即将结束，正在生成报告...');
    setErrorMessage('');

    try {
      const timerDuration = voiceState.timerDuration || 0;

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
      console.error('面试训练结束阶段发生错误:', error);
      transitionToNext('ENDING_ERROR', { error: error instanceof Error ? error.message : String(error) });
    }
  };

  // 训练完成
  const handleInterviewCompleted = async () => {
    setCurrentLine('面试训练已完成！感谢您的参与。');
    setErrorMessage('');

    // 清理上下文管理服务
    contextManagementService.clear();
    console.log('[InterviewTraining] 上下文管理服务已清理');

    const interviewId = currentInterview.get();

    if (interviewId && stateMachine.current) {
      generateInterviewReport(interviewId, stateMachine.current.getContext()).catch(error => {
        const errorMsg = error instanceof Error ? error.message : '生成面试训练报告失败';
        console.error('生成面试训练报告失败:', error);
        setErrorMessage(`后台生成面试训练报告失败: ${errorMsg}`);
        setTimestamp(Date.now());
      });
    }

    setVoiceState({
      mode: 'interview-training',
      subState: 'interview-training-completed',
      interviewId: interviewId
    });
  };

  // 错误处理
  const handleError = async (context: any) => {
    const errorMsg = context.errorMessage || '面试训练过程中发生错误';
    setErrorMessage(errorMsg);
    setCurrentLine('');

    const interviewId = currentInterview.get();

    if (interviewId) {
      try {
        await interviewService.updateInterview(interviewId, {
          status: 'idle',
          message: `错误: ${errorMsg}`
        });
      } catch (error) {
        console.error('更新面试训练错误状态失败:', error);
      }
    }
  };

  // 生成面试报告(异步)
  const generateInterviewReport = async (interviewId: string, context: any) => {
    try {
      const durationSec = voiceState.timerDuration || 0;

      const jobTitle = context.jobPosition?.title || '未知职位';
      const resumeContent = context.resume?.resumeContent || '';

      const reviews = await mockInterviewService.getInterviewReviews(interviewId);

      if (!reviews || reviews.length === 0) {
        console.error('无面试问答记录');
        setErrorMessage('无法生成面试报告: 没有面试问答记录');
        setTimestamp(Date.now());
        return;
      }

      const summaryData = {
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

      let reviewsData = JSON.stringify(summaryData, null, 2);

      let scoreData;
      try {
        const scorePrompt = await promptService.buildScorePrompt(jobTitle, resumeContent, reviewsData);
        scoreData = await aiService.callAIForJson([
          { role: 'user', content: scorePrompt }
        ]);
      } catch (error: any) {
        if (error?.message?.includes('maximum context length') || error?.message?.includes('tokens')) {
          const batchSize = 1;
          const batches = [];
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

          scoreData = {
            total_score: Math.round(batchResults.reduce((sum, r) => sum + (r.total_score || 0), 0) / batchResults.length),
            num_questions: reviews.length,
            radar: {
              interactivity: Math.round(batchResults.reduce((sum, r) => sum + (r.radar?.interactivity || 0), 0) / batchResults.length),
              confidence: Math.round(batchResults.reduce((sum, r) => sum + (r.radar?.confidence || 0), 0) / batchResults.length),
              professionalism: Math.round(batchResults.reduce((sum, r) => sum + (r.radar?.professionalism || 0), 0) / batchResults.length),
              relevance: Math.round(batchResults.reduce((sum, r) => sum + (r.radar?.relevance || 0), 0) / batchResults.length),
              clarity: Math.round(batchResults.reduce((sum, r) => sum + (r.radar?.clarity || 0), 0) / batchResults.length),
            },
            overall_summary: batchResults.map(r => r.overall_summary).join(' '),
            pros: batchResults.map(r => r.pros).join('\n'),
            cons: batchResults.map(r => r.cons).join('\n'),
            suggestions: batchResults.map(r => r.suggestions).join('\n'),
          };
        } else {
          throw error;
        }
      }

      let insightData;
      try {
        const insightPrompt = await promptService.buildInsightPrompt(jobTitle, resumeContent, reviewsData);
        insightData = await aiService.callAIForJson([
          { role: 'user', content: insightPrompt }
        ]);
      } catch (error: any) {
        if (error?.message?.includes('maximum context length') || error?.message?.includes('tokens')) {
          insightData = {
            interviewer: { score: 0, summary: '', role: '', mbti: '', personality: '', preference: '' },
            candidate: { summary: '', mbti: '', personality: '', job_preference: '' },
            strategy: { prepare_details: '', business_understanding: '', keep_logical: '' }
          };
        } else {
          throw error;
        }
      }

      await interviewService.saveInterviewScore({
        interviewId,
        totalScore: scoreData.total_score || 0,
        durationSec,
        numQuestions: scoreData.num_questions || 0,
        overallSummary: scoreData.overall_summary || '',
        pros: scoreData.pros || '',
        cons: scoreData.cons || '',
        suggestions: scoreData.suggestions || '',
        radarInteractivity: scoreData.radar?.interactivity || 0,
        radarConfidence: scoreData.radar?.confidence || 0,
        radarProfessionalism: scoreData.radar?.professionalism || 0,
        radarRelevance: scoreData.radar?.relevance || 0,
        radarClarity: scoreData.radar?.clarity || 0,
      });

      await interviewService.saveInterviewInsight({
        interviewId,
        interviewerScore: insightData.interviewer?.score || 0,
        interviewerSummary: insightData.interviewer?.summary || '',
        interviewerRole: insightData.interviewer?.role || '',
        interviewerMbti: insightData.interviewer?.mbti || '',
        interviewerPersonality: insightData.interviewer?.personality || '',
        interviewerPreference: insightData.interviewer?.preference || '',
        candidateSummary: insightData.candidate?.summary || '',
        candidateMbti: insightData.candidate?.mbti || '',
        candidatePersonality: insightData.candidate?.personality || '',
        candidateJobPreference: insightData.candidate?.job_preference || '',
        strategyPrepareDetails: insightData.strategy?.prepare_details || '',
        strategyBusinessUnderstanding: insightData.strategy?.business_understanding || '',
        strategyKeepLogical: insightData.strategy?.keep_logical || '',
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '生成面试报告失败';
      console.error('生成面试报告失败:', error);
      setErrorMessage(`生成面试报告失败: ${errorMsg}`);
      setTimestamp(Date.now());
      throw error;
    }
  };


  return (
    <div className="interviewer-mode-panel">
      <JobPositionCard
        selectedJobId={selectedJobId}
        onPositionSelect={handlePositionSelect}
        onModelSelect={handleModelSelect}
        onLanguageSelect={(lang) => setSelectedLanguage(lang)}
        disabled={(voiceState.subState === 'interview-training-recording' ||
                   voiceState.subState === 'interview-training-paused' ||
                   voiceState.subState === 'interview-training-playing')}
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
          <div className="device-select-group">
            <div className="voice-select">
              <select
                className="device-select"
                value={selectedMic}
                onChange={async (e) => {
                  const value = e.target.value;
                  setSelectedMic(value);
                  try {
                    const selected = micDevices.find(d => d.deviceId === value);
                    const name = selected?.label || '默认麦克风';
                    const api: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
                    await api?.asrConfig?.updateDevices?.({
                      microphone_device_id: value,
                      microphone_device_name: name,
                    });
                  } catch {}
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

          <div className="device-select-group">
            <div className="voice-select">
              <select
                className="device-select"
                value={selectedSpeaker}
                onChange={async (e) => {
                  const value = e.target.value;
                  setSelectedSpeaker(value);
                  try {
                    const selected = speakerDevices.find(d => d.deviceId === value);
                    const name = selected?.label || '默认扬声器';
                    const api: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
                    await api?.asrConfig?.updateDevices?.({
                      speaker_device_id: value,
                      speaker_device_name: name,
                    });
                  } catch {}
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
            {/* 自动/手动模式显示（面试进行中禁止切换） */}
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
