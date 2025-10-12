import { ChevronDown, Pause, Play, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { setVoiceState, useVoiceState } from '../../../utils/voiceState';
import { interviewDataService } from '../../ai-question/components/shared/data/InterviewDataService';
import { mockInterviewService } from '../../ai-question/components/shared/services/InterviewService';
import { InterviewState, InterviewStateMachine } from '../../ai-question/components/shared/state/InterviewStateMachine';
import { promptService } from '../../prompts/promptService';
import type { ModelConfig, ModelParam } from '../../utils/ai/aiService';
import { aiService } from '../../utils/ai/aiService';
import { currentInterview } from '../../utils/currentInterview';
import { setMockInterviewState, useMockInterviewState } from '../../utils/mockInterviewState';
import { interviewService } from '../api/interviewService';
import { JobPosition } from '../api/jobPositionService';
import { Model } from '../api/modelService';
import { JobPositionCard } from './JobPositionCard';

interface AudioDevice {
  deviceId: string;
  label: string;
}

interface MockInterviewEntryBodyProps {
  onStart?: () => void;
  onStateChange?: (state: InterviewState) => void;
  onQuestionGenerated?: (question: string) => void;
  onAnswerGenerated?: (answer: string) => void;
}

export function MockInterviewEntryBody({ onStart, onStateChange, onQuestionGenerated, onAnswerGenerated }: MockInterviewEntryBodyProps) {
  const [currentLine, setCurrentLine] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [timestamp, setTimestamp] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState<JobPosition | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'zh-CN' | 'zh-TW' | 'en-US'>('zh-CN');

  // 使用VoiceState来控制下拉列表状态
  const voiceState = useVoiceState();

  // 音频设备状态
  const [micDevices, setMicDevices] = useState<AudioDevice[]>([]);
  const [speakerDevices, setSpeakerDevices] = useState<AudioDevice[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('');
  const [piperAvailable, setPiperAvailable] = useState(false);

  // 面试状态管理
  const stateMachine = useRef<InterviewStateMachine | null>(null);
  const [_interviewState, setInterviewState] = useState<InterviewState>(InterviewState.IDLE);
  const [isInitializing, setIsInitializing] = useState(false);

  // 当前问题的暂存数据（等待所有数据齐全后一次性UPDATE）
  const currentQuestionData = useRef<{
    sequence: number;
    questionId?: string;
    question?: string;
    answer?: string;
    referenceAnswer?: string;
    candidateAnswer?: string;
  } | null>(null);

  // 使用跨窗口状态管理
  const mockInterviewState = useMockInterviewState();

  // 监听用户回答提交（通过跨窗口状态变化）
  useEffect(() => {
    const candidateAnswer = mockInterviewState.candidateAnswer;

    // 只有当 candidateAnswer 有值且状态机已初始化时才处理
    if (candidateAnswer && stateMachine.current) {
      const currentState = stateMachine.current.getState();

      // 只有在 USER_LISTENING 或 USER_SPEAKING 状态时才接受用户回答
      if (currentState === InterviewState.USER_LISTENING ||
          currentState === InterviewState.USER_SPEAKING) {

        // 暂存用户回答
        if (currentQuestionData.current) {
          currentQuestionData.current.candidateAnswer = candidateAnswer;
        }

        // 触发状态机进入AI分析阶段
        stateMachine.current.send({
          type: 'USER_FINISHED_SPEAKING',
          payload: { response: candidateAnswer }
        });

        // 不立即清空 candidateAnswer,让右侧窗口有时间显示
        // candidateAnswer 会在下一轮问题开始时清空
      } else {
        // 非法状态下提交答案，直接清空避免重复触发
        console.warn(`用户在非法状态 ${currentState} 下提交了答案，已忽略`);
        setMockInterviewState({ candidateAnswer: '' });
      }
    }
  }, [mockInterviewState.candidateAnswer]);

  // 初始化面试系统
  useEffect(() => {

    const loadAudioSettings = async () => {
      try {
        // 检查 Piper TTS 可用性
        const piperAvailableResult = await (window as any).electronInterviewerAPI?.piperTTS?.isAvailable?.();
        setPiperAvailable(piperAvailableResult?.success && piperAvailableResult?.available);

        // 获取音频设备列表
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
        setPiperAvailable(false);
      } finally {
        setLoading(false);
      }
    };

    loadAudioSettings();

    // 清理函数
    return () => {
      if (stateMachine.current) {
        stateMachine.current.reset();
      }
    };
  }, []);

  const speak = async (text: string) => {
    try {
      if (!piperAvailable) {
        throw new Error('Piper TTS 不可用');
      }

      // 使用混合语言TTS，无需指定语音模型
      const options = { outputDevice: selectedSpeaker };
      await (window as any).electronInterviewerAPI?.piperTTS?.speak?.(text, options);

      setCurrentLine(`${text}`);
      setErrorMessage('');
      setTimestamp(Date.now());
    } catch (error) {
      console.error('语音播放失败:', error);
      setCurrentLine('');
      setErrorMessage(`语音播放失败: ${text}`);
      setTimestamp(Date.now());

      // 发送错误事件到状态机（只在 AI_SPEAKING 状态时发送）
      if (stateMachine.current) {
        const currentState = stateMachine.current.getState();
        if (currentState === InterviewState.AI_SPEAKING) {
          // 错误事件直接发送，不使用 transitionToNext（错误不应该被暂停阻塞）
          stateMachine.current.send({ type: 'SPEAKING_ERROR', payload: { error: error instanceof Error ? error.message : String(error) } });
        } else {
          console.warn(`语音播放失败，但当前状态为 ${currentState}，无法发送 SPEAKING_ERROR`);
        }
      }
    }
  };

  const handleStartInterview = async () => {
    if (!selectedPosition) {
      setErrorMessage('请先选择面试岗位');
      setCurrentLine('');
      return;
    }

    if (!selectedModel) {
      setErrorMessage('请先选择AI模型');
      setCurrentLine('');
      return;
    }

    try {
      setIsInitializing(true);

      // 从全局缓存获取用户数据
      const api: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
      const userDataResult = await api?.getUserData?.();
      const userData = userDataResult?.success ? userDataResult.userData?.user : null;

      // 创建面试记录
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

      const response = await interviewService.createInterview(interviewData);

      // 先清理旧的interviewId，再设置新的
      currentInterview.clear();
      currentInterview.set(response.id);

      // 清空上一次面试的mockInterviewState
      setMockInterviewState({
        aiMessage: '',
        speechText: '',
        candidateAnswer: '',
        isLoading: false,
        isListening: false,
      });

      // 设置voiceState的interviewId供右侧窗口和本窗口共同使用
      setVoiceState({ interviewId: response.id });

      // 获取押题题库
      const questionBank = await mockInterviewService.getQuestionBank(selectedPosition.id);

      // 初始化状态机(totalQuestions 将在 handleInitializing 中从 prompt 配置获取)
      stateMachine.current = new InterviewStateMachine({
        interviewId: response.id,
        totalQuestions: 10, // 临时默认值,实际值从 InitPrompt 的 extra 配置读取
      });

      // 监听状态机变化
      stateMachine.current.onStateChange(async (state, context) => {
        setInterviewState(state);
        onStateChange?.(state);
        await handleStateChange(state, context);
      });

      // 初始化数据服务
      interviewDataService.initializeInterview(response.id, interviewData.questionCount);

      // 发送开始事件
      stateMachine.current.send({
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

      // 设置VoiceState
      setVoiceState({
        mode: 'mock-interview',
        subState: 'mock-interview-recording',
        interviewId: response.id
      });

      // 调用原始的开始函数
      if (onStart) {
        onStart();
      }
    } catch (error) {
      console.error('开始面试失败:', error);
      const errorMsg = `开始面试失败: ${error instanceof Error ? error.message : '未知错误'}`;
      setErrorMessage(errorMsg);
      setCurrentLine('');
      setIsInitializing(false);

      // 如果面试已创建，更新状态为idle（错误）
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

  // 通用暂停检查方法
  const checkAndHandlePause = (): boolean => {
    if (!stateMachine.current) return false;
    const context = stateMachine.current.getContext();
    return !!context.isPaused;
  };

  // 状态转换包装方法（检查暂停后再发送下一个事件）
  const transitionToNext = (eventType: string, payload?: any): boolean => {
    if (!stateMachine.current) return false;

    // 如果已暂停，不发送事件
    if (checkAndHandlePause()) {
      return false;
    }

    // 发送事件
    return stateMachine.current.send({ type: eventType, payload });
  };

  // 从暂停状态恢复，发送当前状态的完成事件
  const continueFromState = (state: InterviewState): void => {
    if (!stateMachine.current) return;

    // 根据暂停时的状态，发送对应的完成事件
    const completionEvents: Record<InterviewState, string | null> = {
      [InterviewState.IDLE]: null,
      [InterviewState.INITIALIZING]: 'INIT_SUCCESS',
      [InterviewState.AI_THINKING]: 'QUESTION_GENERATED',
      [InterviewState.AI_SPEAKING]: 'SPEAKING_COMPLETE',
      [InterviewState.GENERATING_ANSWER]: 'ANSWER_GENERATED',
      [InterviewState.USER_LISTENING]: null, // 监听状态不需要自动完成
      [InterviewState.USER_SPEAKING]: null, // 用户说话状态不需要自动完成
      [InterviewState.AI_ANALYZING]: 'ANALYSIS_COMPLETE',
      [InterviewState.ROUND_COMPLETE]: 'CONTINUE_INTERVIEW',
      [InterviewState.INTERVIEW_ENDING]: 'GENERATE_REPORT',
      [InterviewState.GENERATING_REPORT]: 'REPORT_COMPLETE',
      [InterviewState.COMPLETED]: null,
      [InterviewState.ERROR]: null,
    };

    const eventType = completionEvents[state];
    if (eventType) {
      stateMachine.current.send({ type: eventType });
    }
  };

  const handlePauseInterview = async () => {
    if (!stateMachine.current) return;

    // 从localStorage获取当前面试ID
    const interviewId = currentInterview.get();
    if (!interviewId) return;

    try {
      // 1. 设置暂停标志
      stateMachine.current.updateContextPartial({ isPaused: true });

      // 2. 保存当前状态到 localStorage
      const currentState = stateMachine.current.getState();
      const currentContext = stateMachine.current.getContext();

      localStorage.setItem('mock-interview-paused-state', JSON.stringify({
        interviewId: interviewId,
        state: currentState,
        context: currentContext,
        timestamp: Date.now()
      }));

      // 3. 更新 interviews 表状态
      await interviewService.updateInterview(interviewId, {
        status: 'mock-interview-paused',
        message: '面试已暂停'
      });

      // 4. 更新 UI 状态
      setVoiceState({
        mode: 'mock-interview',
        subState: 'mock-interview-paused',
        interviewId: interviewId
      });
      setCurrentLine('面试已暂停');

    } catch (error) {
      console.error('暂停面试失败:', error);
      setErrorMessage(`暂停面试失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleResumeInterview = async () => {
    if (!stateMachine.current) return;

    // 从localStorage获取当前面试ID
    const interviewId = currentInterview.get();
    if (!interviewId) return;

    try {
      // 1. 从 localStorage 恢复状态
      const savedStateStr = localStorage.getItem('mock-interview-paused-state');
      if (!savedStateStr) {
        throw new Error('未找到暂停的面试状态');
      }

      const savedState = JSON.parse(savedStateStr);

      // 验证是否是同一场面试
      if (savedState.interviewId !== interviewId) {
        throw new Error('暂停状态与当前面试不匹配');
      }

      // 2. 恢复状态机上下文
      stateMachine.current.restoreContext(savedState.context);

      // 3. 清除暂停标志
      stateMachine.current.updateContextPartial({ isPaused: false });

      // 4. 更新 interviews 表状态
      await interviewService.updateInterview(interviewId, {
        status: 'mock-interview-recording',
        message: '面试已恢复'
      });

      // 5. 更新 UI 状态
      setVoiceState({
        mode: 'mock-interview',
        subState: 'mock-interview-playing',
        interviewId: interviewId
      });
      setCurrentLine('面试已恢复');

      // 6. 根据暂停时的状态继续执行
      continueFromState(savedState.state);

      // 7. 清除 localStorage 中的暂停状态
      localStorage.removeItem('mock-interview-paused-state');

    } catch (error) {
      console.error('恢复面试失败:', error);
      setErrorMessage(`恢复面试失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleStopInterview = async () => {
    try {
      // 从localStorage获取当前面试ID
      const interviewId = currentInterview.get();
      if (!interviewId) {
        return;
      }

      // 先保存当前的计时器时长,避免异步过程中状态变化
      const timerDuration = voiceState.timerDuration || 0;

      setCurrentLine('正在结束面试...');

      // 1. 更新 interviews 状态为 mock-interview-completed
      await interviewService.updateInterview(interviewId, {
        status: 'mock-interview-completed',
        duration: timerDuration,
        message: '用户主动停止面试'
      });

      // 2. 获取 interview_reviews 记录
      const reviews = await mockInterviewService.getInterviewReviews(interviewId);

      // 3. 判断是否有记录（至少有1条数据）
      if (!reviews || reviews.length === 0) {
        // 没有任何回答记录，直接完成
        setCurrentLine('面试已结束');
        setVoiceState({
          mode: 'mock-interview',
          subState: 'mock-interview-completed',
          interviewId: interviewId
        });
        return;
      }

      // 4. 检查每条 review
      const needsAnalysis: any[] = [];
      const readyForReport: any[] = [];

      for (const review of reviews) {
        // 如果 candidate_answer 没值，跳过
        if (!review.candidate_answer) {
          continue;
        }

        // 检查分析字段是否都有值
        const hasAnalysis = review.pros && review.cons && review.suggestions &&
                           review.key_points && review.assessment;

        if (hasAnalysis) {
          readyForReport.push(review);
        } else {
          needsAnalysis.push(review);
        }
      }

      // 5. 先处理需要分析的 review
      if (needsAnalysis.length > 0) {
        setCurrentLine(`正在分析 ${needsAnalysis.length} 个回答...`);

        for (const review of needsAnalysis) {
          await analyzeReview(review);
        }
      }

      // 6. 如果有任何有效的回答（不管是否需要分析），生成报告
      const totalValidReviews = readyForReport.length + needsAnalysis.length;
      if (totalValidReviews > 0) {
        setCurrentLine('正在生成面试报告...');
        await generateInterviewReportOnStop(interviewId);
      }

      // 7. 完成
      setCurrentLine('面试已结束');
      setVoiceState({
        mode: 'mock-interview',
        subState: 'mock-interview-completed',
        interviewId: interviewId
      });

    } catch (error) {
      console.error('结束面试失败:', error);
      setErrorMessage(`结束面试失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setCurrentLine('');
      // 即使失败，也要设置状态为完成
      const interviewId = currentInterview.get();
      setVoiceState({
        mode: 'mock-interview',
        subState: 'mock-interview-completed',
        interviewId: interviewId
      });
    }
  };

  // 分析单个 review
  const analyzeReview = async (review: any) => {
    try {
      const askedQuestion = review.asked_question || review.question || '';
      const candidateAnswer = review.candidate_answer || '';
      const referenceAnswer = review.reference_answer || '';

      if (!askedQuestion || !candidateAnswer) {
        return;
      }

      // 构建分析 prompt
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

      // 获取模型配置
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

      // 调用 AI 进行分析
      await aiService.callAIStreamWithCustomModel(messages, modelConfig, modelParams, (chunk: any) => {
        if (chunk.error) {
          throw new Error(chunk.error);
        }

        if (chunk.finished) {
          // 分析完成，什么都不做，等待下面统一处理
        } else {
          analysisResult += chunk.content;
        }
      });

      // 解析分析结果
      const analysis = JSON.parse(analysisResult.trim());

      // 更新 review 记录
      await mockInterviewService.updateReview(review.id, {
        pros: analysis.pros || '',
        cons: analysis.cons || '',
        suggestions: analysis.suggestions || '',
        key_points: analysis.key_points || '',
        assessment: analysis.assessment || '',
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '分析回答失败';
      console.error('分析回答失败:', error);
      setErrorMessage(`分析回答失败: ${errorMsg}`);
      setTimestamp(Date.now());
      throw error;
    }
  };

  // 生成面试报告（停止按钮触发）
  const generateInterviewReportOnStop = async (interviewId: string) => {
    try {
      // 先保存当前的计时器时长
      const timerDuration = voiceState.timerDuration || 0;

      // 1. 重新获取所有 reviews（包含刚才分析的）
      const reviews = await mockInterviewService.getInterviewReviews(interviewId);

      if (!reviews || reviews.length === 0) {
        return;
      }

      // 2. 获取面试基本信息
      const jobTitle = selectedPosition?.title || '未知职位';
      const resumeContent = selectedPosition?.resumeContent || '';

      // 3. 构建汇总数据(不传原始问答,只传已分析的结果)
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

      // 4. 生成评分报告(带自动分批处理)
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

          // 过滤出成功的结果
          const batchResults = batchSettledResults
            .filter(result => result.status === 'fulfilled')
            .map(result => (result as PromiseFulfilledResult<any>).value);

          // 如果全部失败,抛出错误
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

      // 5. 生成洞察报告(带自动分批处理)
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

      // 6. 保存到后端
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
  const handleStateChange = async (state: InterviewState, context: any) => {
    // 更新 mockInterviewState 中的状态机状态
    setMockInterviewState({ interviewState: state });

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
          // 答案已经在 AI_SPEAKING 阶段开始生成，这里不需要处理
          break;
        case InterviewState.ROUND_COMPLETE:
          handleRoundComplete(context);
          break;
        case InterviewState.INTERVIEW_ENDING:
          await handleInterviewEnding();
          break;
        case InterviewState.GENERATING_REPORT:
          // 报告生成是异步的,不阻塞状态机,立即进入完成状态
          transitionToNext('REPORT_COMPLETE');
          break;
        case InterviewState.COMPLETED:
          handleInterviewCompleted();
          break;
        case InterviewState.ERROR:
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

  // 初始化阶段
  const handleInitializing = async (context: any) => {
    setCurrentLine('正在初始化面试信息...');
    setErrorMessage('');

    try {
      // 构建初始化prompt（用于后续LLM调用）并获取配置
      const initPromptData = await promptService.buildInitPrompt(
        context.jobPosition,
        context.resume,
        context.questionsBank
      );

      // 发送成功事件,并在 payload 中传入 totalQuestions
      stateMachine.current?.send({
        type: 'INIT_SUCCESS',
        payload: {
          initPrompt: initPromptData.content,
          totalQuestions: initPromptData.totalQuestions
        }
      });
    } catch (error) {
      stateMachine.current?.send({ type: 'INIT_ERROR', payload: { error: error instanceof Error ? error.message : String(error) } });
    }
  };

  // AI思考阶段
  const handleAIThinking = async (context: any) => {
    setCurrentLine('面试官正在思考问题...');
    setErrorMessage('');

    try {
      if (!selectedModel) {
        throw new Error('未选择模型');
      }

      // 构建完整的系统 prompt（包含岗位和简历信息）
      let systemPrompt = context.initPrompt;
      if (!systemPrompt) {
        const initPromptData = await promptService.buildInitPrompt(
          context.jobPosition,
          context.resume,
          context.questionsBank || []
        );
        systemPrompt = initPromptData.content;
      }

      // 构建问题生成的用户消息
      const questionPrompt = await promptService.buildQuestionPrompt(context.currentQuestionIndex);

      const messages = [
        {
          role: 'system' as const,
          content: systemPrompt,
        },
        {
          role: 'user' as const,
          content: questionPrompt,
        }
      ];

      // 准备模型配置
      const modelConfig: ModelConfig = {
        provider: selectedModel.provider,
        model_name: selectedModel.model_name,
        credentials: selectedModel.credentials || '{}',
      };

      // 获取模型参数
      const api: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
      const userDataResult = await api?.getUserData?.();
      const modelParams: ModelParam[] = userDataResult?.success ? (userDataResult.userData?.model_params || []) : [];

      let generatedQuestion = '';

      await aiService.callAIStreamWithCustomModel(messages, modelConfig, modelParams, (chunk) => {
        if (chunk.error) {
          stateMachine.current?.send({ type: 'THINKING_ERROR', payload: { error: chunk.error } });
          return;
        }

        if (chunk.finished) {
          // 清理问题文本
          const cleanQuestion = generatedQuestion.trim().replace(/^(问题|Question)\s*[:：]?\s*/, '');
          stateMachine.current?.send({ type: 'QUESTION_GENERATED', payload: { question: cleanQuestion } });
        } else {
          generatedQuestion += chunk.content;
        }
      });
    } catch (error) {
      stateMachine.current?.send({ type: 'THINKING_ERROR', payload: { error: error instanceof Error ? error.message : String(error) } });
    }
  };

  // AI说话阶段
  const handleAISpeaking = async (context: any) => {
    try {
      const question = context.currentQuestion;
      if (!question) throw new Error('No question to speak');

      // 显示AI生成的问题
      setCurrentLine(question);

      // 检查是否已经创建过该问题的记录，避免重复创建
      const existingQuestion = interviewDataService.getQuestionState(context.currentQuestionIndex);
      if (!existingQuestion || !existingQuestion.reviewId) {
        // 创建问题记录
        await interviewDataService.createQuestionRecord(context.currentQuestionIndex, question);
      }

      // 立即开始生成答案（异步，不等待）
      // 答案生成会通过onAnswerGenerated流式更新aiMessage,不需要手动清空
      generateAnswerInBackground(context);

      // 播放问题
      await speak(question);

      // 通知上层组件
      onQuestionGenerated?.(question);

      // 发送说话完成事件
      stateMachine.current?.send({ type: 'SPEAKING_COMPLETE' });
    } catch (error) {
      stateMachine.current?.send({ type: 'SPEAKING_ERROR', payload: { error: error instanceof Error ? error.message : String(error) } });
    }
  };

  // 用户监听阶段
  const handleUserListening = () => {
    setErrorMessage('');
    // 通知右侧窗口开始语音识别
    setMockInterviewState({ isListening: true, speechText: '' });
  };

  // 用户说话阶段
  const handleUserSpeaking = () => {
    setErrorMessage('');
  };


  // AI分析阶段
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

      // 构建分析 prompt
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
            // 解析JSON结果
            const analysis = JSON.parse(analysisResult);

            // 获取reviewId
            const questionState = interviewDataService.getQuestionState(context.currentQuestionIndex);
            if (!questionState?.reviewId) {
              throw new Error('Review ID not found');
            }

            // 所有数据齐全，一次性UPDATE数据库
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
            });

            // 更新本地状态
            interviewDataService.markQuestionComplete(context.currentQuestionIndex);

            // 发送分析完成事件
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

  // 后台生成答案（在播放问题时并行执行）
  const generateAnswerInBackground = async (context: any) => {
    setErrorMessage('');

    try {
      if (!selectedModel) {
        throw new Error('未选择模型');
      }

      // 从向量知识库中搜索相似问题，获取押题答案（如果有）
      const similarQuestion = await mockInterviewService.findSimilarQuestion(
        context.currentQuestion,
        context.jobPosition.id,
        0.8
      );

      // 提取押题答案（可能为空字符串）
      const referenceAnswerFromBank = similarQuestion?.answer || '';

      // 使用专门的答案生成 prompt
      const answerPrompt = await promptService.buildAnswerPrompt(
        context.jobPosition,
        context.resume,
        context.currentQuestion,
        referenceAnswerFromBank || undefined
      );

      const messages = [
        {
          role: 'user' as const,
          content: answerPrompt,
        }
      ];

      // 准备模型配置
      const modelConfig: ModelConfig = {
        provider: selectedModel.provider,
        model_name: selectedModel.model_name,
        credentials: selectedModel.credentials || '{}',
      };

      const api: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
      const userDataResult = await api?.getUserData?.();
      const modelParams: ModelParam[] = userDataResult?.success ? (userDataResult.userData?.model_params || []) : [];

      let referenceAnswer = '';

      await aiService.callAIStreamWithCustomModel(messages, modelConfig, modelParams, async (chunk) => {
        if (chunk.error) {
          stateMachine.current?.send({ type: 'GENERATION_ERROR', payload: { error: chunk.error } });
          return;
        }

        if (chunk.finished) {
          referenceAnswer = referenceAnswer.trim();

          // 暂存押题信息和参考答案到本地状态（不写数据库）
          currentQuestionData.current = {
            sequence: context.currentQuestionIndex,
            questionId: similarQuestion?.questionId,
            question: similarQuestion?.question,
            answer: similarQuestion?.answer,
            referenceAnswer: referenceAnswer,
          };

          onAnswerGenerated?.(referenceAnswer);

        } else {
          // 流式输出：每个chunk都实时更新UI
          referenceAnswer += chunk.content;
          onAnswerGenerated?.(referenceAnswer);
        }
      });
    } catch (error) {
      stateMachine.current?.send({ type: 'GENERATION_ERROR', payload: { error: error instanceof Error ? error.message : String(error) } });
    }
  };

  // 轮次完成
  const handleRoundComplete = (context: any) => {
    setCurrentLine(`第${context.currentQuestionIndex + 1}个问题已完成`);
    setErrorMessage('');

    // 标记问题完成
    interviewDataService.markQuestionComplete(context.currentQuestionIndex);

    // 检查是否应该结束面试
    const shouldEnd = stateMachine.current?.shouldEndInterview();

    if (shouldEnd) {
      stateMachine.current?.send({ type: 'END_INTERVIEW' });
    } else {
      // 继续下一个问题（这里使用 transitionToNext 检查暂停）
      setTimeout(() => {
        transitionToNext('CONTINUE_INTERVIEW');
      }, 2000);
    }
  };

  // 面试结束阶段
  const handleInterviewEnding = async () => {
    setCurrentLine('面试即将结束，正在生成报告...');
    setErrorMessage('');

    try {
      // 先保存当前的计时器时长
      const timerDuration = voiceState.timerDuration || 0;

      // 标记面试完成
      interviewDataService.markInterviewComplete();

      // 从localStorage获取当前面试ID
      const interviewId = currentInterview.get();

      // 更新数据库中的面试状态为 mock-interview-completed
      if (interviewId) {
        await interviewService.updateInterview(interviewId, {
          status: 'mock-interview-completed',
          duration: timerDuration,
          message: '面试已完成'
        });
      }

      // 发送生成报告事件
      transitionToNext('GENERATE_REPORT');
    } catch (error) {
      console.error('面试结束阶段发生错误:', error);
      transitionToNext('ENDING_ERROR', { error: error instanceof Error ? error.message : String(error) });
    }
  };

  // 面试完成
  const handleInterviewCompleted = async () => {
    setCurrentLine('面试已完成！感谢您的参与。');
    setErrorMessage('');

    // 从localStorage获取当前面试ID
    const interviewId = currentInterview.get();

    // 异步生成面试报告(scores + insights),不阻塞用户
    if (interviewId && stateMachine.current) {
      generateInterviewReport(interviewId, stateMachine.current.getContext()).catch(error => {
        const errorMsg = error instanceof Error ? error.message : '生成面试报告失败';
        console.error('生成面试报告失败:', error);
        setErrorMessage(`后台生成面试报告失败: ${errorMsg}`);
        setTimestamp(Date.now());
      });
    }

    // 更新VoiceState,保留interviewId(退出窗口时再清理)
    setVoiceState({
      mode: 'mock-interview',
      subState: 'mock-interview-completed',
      interviewId: interviewId
    });
  };

  // 错误处理
  const handleError = async (context: any) => {
    const errorMsg = context.errorMessage || '面试过程中发生错误';
    setErrorMessage(errorMsg);
    setCurrentLine('');

    // 从localStorage获取当前面试ID
    const interviewId = currentInterview.get();

    // 更新面试状态为idle（错误）并记录错误信息
    if (interviewId) {
      try {
        await interviewService.updateInterview(interviewId, {
          status: 'idle',
          message: `错误: ${errorMsg}`
        });
      } catch (error) {
        console.error('更新面试错误状态失败:', error);
      }
    }
  };

  // 生成面试报告(异步,不阻塞用户)
  const generateInterviewReport = async (interviewId: string, context: any) => {
    try {
      // 先保存当前的计时器时长
      const durationSec = voiceState.timerDuration || 0;

      // 1. 获取面试数据
      const jobTitle = context.jobPosition?.title || '未知职位';
      const resumeContent = context.resume?.resumeContent || '';

      // 2. 从数据库获取所有问答记录(而不是从内存状态)
      const reviews = await mockInterviewService.getInterviewReviews(interviewId);

      if (!reviews || reviews.length === 0) {
        console.error('无面试问答记录');
        setErrorMessage('无法生成面试报告: 没有面试问答记录');
        setTimestamp(Date.now());
        return;
      }

      // 构建汇总数据(不传原始问答,只传已分析的结果)
      const summaryData = {
        totalQuestions: reviews.length,
        questions: reviews.map((r, i) => ({
          index: i + 1,
          question: r.asked_question?.substring(0, 100), // 只保留问题摘要
          pros: r.pros || '无',
          cons: r.cons || '无',
          suggestions: r.suggestions || '无',
          keyPoints: r.key_points || '无',
          assessment: r.assessment || '无'
        }))
      };

      let reviewsData = JSON.stringify(summaryData, null, 2);

      // 3. 生成评分报告(带自动分批处理)
      let scoreData;
      try {
        const scorePrompt = await promptService.buildScorePrompt(jobTitle, resumeContent, reviewsData);
        scoreData = await aiService.callAIForJson([
          { role: 'user', content: scorePrompt }
        ]);
      } catch (error: any) {
        // 如果token超限,尝试分批处理
        if (error?.message?.includes('maximum context length') || error?.message?.includes('tokens')) {
          // 分批处理:每批1个问题
          const batchSize = 1;
          const batches = [];
          for (let i = 0; i < reviews.length; i += batchSize) {
            batches.push(reviews.slice(i, i + batchSize));
          }

          // 并行处理所有批次
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

          // 过滤出成功的结果
          const batchResults = batchSettledResults
            .filter(result => result.status === 'fulfilled')
            .map(result => (result as PromiseFulfilledResult<any>).value);

          // 如果全部失败,抛出错误
          if (batchResults.length === 0) {
            throw new Error('所有批次处理都失败了');
          }

          // 汇总所有批次结果
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

      // 4. 生成洞察报告(带自动分批处理)
      let insightData;
      try {
        const insightPrompt = await promptService.buildInsightPrompt(jobTitle, resumeContent, reviewsData);
        insightData = await aiService.callAIForJson([
          { role: 'user', content: insightPrompt }
        ]);
      } catch (error: any) {
        // 如果token超限,返回默认值
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

      // 5. 保存到后端
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
      {/* 岗位选择卡片 */}
      <JobPositionCard
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



