import { ChevronDown, Pause, Play, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { setVoiceState, useVoiceState } from '../../../utils/voiceState';
import { setMockInterviewState, useMockInterviewState } from '../../utils/mockInterviewState';
import { buildAnalysisPrompt, buildAnswerPrompt, buildInitPrompt } from '../../prompts/prompts';
import { interviewDataService } from '../../ai-question/components/mock-interview/data/InterviewDataService';
import { mockInterviewService } from '../../ai-question/components/mock-interview/services/MockInterviewService';
import { InterviewState, InterviewStateMachine } from '../../ai-question/components/mock-interview/state/InterviewStateMachine';
import type { ModelConfig, ModelParam } from '../../utils/ai/aiService';
import { aiService } from '../../utils/ai/aiService';
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
  const [currentInterviewId, setCurrentInterviewId] = useState<string | null>(null);

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
      console.log('Received user answer via state:', candidateAnswer);

      // 暂存用户回答
      if (currentQuestionData.current) {
        currentQuestionData.current.candidateAnswer = candidateAnswer;
      }

      // 触发状态机进入AI分析阶段
      stateMachine.current.send({
        type: 'USER_FINISHED_SPEAKING',
        payload: { response: candidateAnswer }
      });

      // 清空 candidateAnswer 避免重复触发
      setMockInterviewState({ candidateAnswer: '' });
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

        // 设置默认设备
        if (mics.length > 0) setSelectedMic(mics[0].deviceId);
        if (speakers.length > 0) setSelectedSpeaker(speakers[0].deviceId);

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

      // 发送错误事件到状态机
      if (stateMachine.current) {
        stateMachine.current.send({ type: 'SPEAKING_ERROR', payload: { error: error instanceof Error ? error.message : String(error) } });
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
        status: 'active' as const,
        message: '面试进行中',
        locale: selectedLanguage,
        timezone: userData?.timezone || 'Asia/Shanghai',
        theme: userData?.theme || 'system',
        selectedModelId: selectedModel?.id
      };

      const response = await interviewService.createInterview(interviewData);
      setCurrentInterviewId(response.id);

      // 获取押题题库
      const questionBank = await mockInterviewService.getQuestionBank(selectedPosition.id);

      // 初始化状态机
      stateMachine.current = new InterviewStateMachine({
        interviewId: response.id,
        totalQuestions: interviewData.questionCount,
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

      // 如果面试已创建，更新状态为错误
      if (currentInterviewId) {
        try {
          await interviewService.updateInterview(currentInterviewId, {
            status: 'deleted',
            message: errorMsg
          });
        } catch (updateError) {
          console.error('更新面试错误状态失败:', updateError);
        }
      }
    }
  };

  const handlePauseInterview = () => {
    setVoiceState({ mode: 'mock-interview', subState: 'mock-interview-paused' });
  };

  const handleResumeInterview = () => {
    setVoiceState({ mode: 'mock-interview', subState: 'mock-interview-playing' });
  };

  const handleStopInterview = async () => {
    try {
      // 如果有当前面试ID，更新状态并调用结束面试API
      if (currentInterviewId) {
        // 更新状态为已归档（用户主动停止）
        await interviewService.updateInterview(currentInterviewId, {
          status: 'archived',
          message: '用户主动停止面试'
        });
        await interviewService.endInterview(currentInterviewId);
        setCurrentInterviewId(null);
      }

      setVoiceState({
        mode: 'mock-interview',
        subState: 'mock-interview-completed',
        interviewId: undefined
      });
    } catch (error) {
      console.error('结束面试失败:', error);
      setErrorMessage(`结束面试失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setCurrentLine('');
      // 即使API调用失败，也要设置状态为完成
      setVoiceState({
        mode: 'mock-interview',
        subState: 'mock-interview-completed',
        interviewId: undefined
      });
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
      // 构建初始化prompt（用于后续LLM调用）
      buildInitPrompt(
        context.jobPosition,
        context.resume,
        context.questionsBank
      );

      // 发送成功事件
      stateMachine.current?.send({ type: 'INIT_SUCCESS' });
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
      const systemPrompt = context.initPrompt || buildInitPrompt(
        context.jobPosition,
        context.resume,
        context.questionsBank || []
      );

      // 构建问题生成的用户消息
      const questionPrompt = `现在开始第${context.currentQuestionIndex + 1}个问题。请根据之前的对话历史和岗位要求，生成一个合适的面试问题。直接输出问题内容，不要包含其他解释。`;

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
          stateMachine.current?.send({
            type: 'QUESTION_GENERATED',
            payload: { question: cleanQuestion }
          });
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

      // 创建问题记录
      await interviewDataService.createQuestionRecord(context.currentQuestionIndex, question);

      // 立即开始生成答案（异步，不等待）
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
      const analysisPrompt = buildAnalysisPrompt(askedQuestion, candidateAnswer, referenceAnswer);

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
          stateMachine.current?.send({
            type: 'ANALYSIS_ERROR',
            payload: { error: chunk.error }
          });
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

            console.log('Complete review updated for sequence', context.currentQuestionIndex);

            // 发送分析完成事件
            stateMachine.current?.send({ type: 'ANALYSIS_COMPLETE' });
          } catch (parseError) {
            console.error('Failed to parse analysis result:', parseError);
            stateMachine.current?.send({
              type: 'ANALYSIS_ERROR',
              payload: { error: '分析结果解析失败' }
            });
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
      const answerPrompt = buildAnswerPrompt(
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
          stateMachine.current?.send({
            type: 'GENERATION_ERROR',
            payload: { error: chunk.error }
          });
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

          // 发送答案生成完成事件
          stateMachine.current?.send({
            type: 'ANSWER_GENERATED',
            payload: { answer: referenceAnswer }
          });
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
    if (stateMachine.current?.shouldEndInterview()) {
      stateMachine.current.send({ type: 'END_INTERVIEW' });
    } else {
      // 继续下一个问题
      setTimeout(() => {
        stateMachine.current?.send({ type: 'CONTINUE_INTERVIEW' });
      }, 2000);
    }
  };

  // 面试结束阶段
  const handleInterviewEnding = async () => {
    setCurrentLine('面试即将结束，正在生成报告...');
    setErrorMessage('');

    try {
      // 标记面试完成
      interviewDataService.markInterviewComplete();

      // 发送生成报告事件
      stateMachine.current?.send({ type: 'GENERATE_REPORT' });
    } catch (error) {
      stateMachine.current?.send({ type: 'ENDING_ERROR', payload: { error: error instanceof Error ? error.message : String(error) } });
    }
  };

  // 面试完成
  const handleInterviewCompleted = async () => {
    setCurrentLine('面试已完成！感谢您的参与。');
    setErrorMessage('');

    // 更新面试状态为已完成
    if (currentInterviewId) {
      try {
        await interviewService.updateInterview(currentInterviewId, {
          status: 'completed',
          message: '面试已完成'
        });
      } catch (error) {
        console.error('更新面试完成状态失败:', error);
      }
    }

    // 更新VoiceState
    setVoiceState({
      mode: 'mock-interview',
      subState: 'mock-interview-completed',
      interviewId: undefined
    });
  };

  // 错误处理
  const handleError = async (context: any) => {
    const errorMsg = context.errorMessage || '面试过程中发生错误';
    setErrorMessage(errorMsg);
    setCurrentLine('');

    // 更新面试状态为错误并记录错误信息
    if (currentInterviewId) {
      try {
        await interviewService.updateInterview(currentInterviewId, {
          status: 'deleted',
          message: `错误: ${errorMsg}`
        });
      } catch (error) {
        console.error('更新面试错误状态失败:', error);
      }
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
                onChange={(e) => setSelectedMic(e.target.value)}
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
                onChange={(e) => setSelectedSpeaker(e.target.value)}
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



