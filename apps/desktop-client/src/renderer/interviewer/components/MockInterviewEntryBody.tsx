import { ChevronDown, Pause, Play, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { setVoiceState, useVoiceState } from '../../../utils/voiceState';
import { interviewDataService } from '../../ai-question/components/mock-interview/data/InterviewDataService';
import { streamingLLMManager } from '../../ai-question/components/mock-interview/llm/StreamingLLMManager';
import { mockInterviewService } from '../../ai-question/components/mock-interview/services/MockInterviewService';
import { InterviewState, InterviewStateMachine } from '../../ai-question/components/mock-interview/state/InterviewStateMachine';
import { VoiceCoordinator } from '../../ai-question/components/mock-interview/voice/VoiceCoordinator';
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
  const voiceCoordinator = useRef<VoiceCoordinator | null>(null);
  const [_interviewState, setInterviewState] = useState<InterviewState>(InterviewState.IDLE);
  const [isInitializing, setIsInitializing] = useState(false);
  const llmSessionId = useRef<string | null>(null);

  // 初始化面试系统
  useEffect(() => {
    const initializeInterviewSystem = async () => {
      try {
        // 初始化语音协调器
        voiceCoordinator.current = new VoiceCoordinator({
          silenceThreshold: 3000,
          volumeThreshold: 0.01,
          ttsDelay: 500,
          autoEndTimeout: 5000,
        });

        await voiceCoordinator.current.initialize();

        // 监听语音协调器事件
        voiceCoordinator.current.addEventListener('userStartedSpeaking', () => {
          console.log('User started speaking');
        });

        voiceCoordinator.current.addEventListener('userFinishedSpeaking', ((event: CustomEvent) => {
          console.log('User finished speaking:', event.detail);
          handleUserFinishedSpeaking();
        }) as EventListener);

      } catch (error) {
        console.error('Failed to initialize interview system:', error);
        setErrorMessage('面试系统初始化失败，请刷新页面重试');
      }
    };

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

    const initialize = async () => {
      await Promise.all([
        initializeInterviewSystem(),
        loadAudioSettings()
      ]);
    };

    initialize();

    // 清理函数
    return () => {
      if (voiceCoordinator.current) {
        voiceCoordinator.current.destroy();
      }
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

      // 通知语音协调器开始TTS
      if (voiceCoordinator.current) {
        voiceCoordinator.current.startTTS();
      }

      // 使用混合语言TTS，无需指定语音模型
      const options = { outputDevice: selectedSpeaker };
      await (window as any).electronInterviewerAPI?.piperTTS?.speak?.(text, options);

      // 通知语音协调器TTS完成
      if (voiceCoordinator.current) {
        voiceCoordinator.current.onTTSComplete();
      }

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
      return;
    }

    if (!selectedModel) {
      setErrorMessage('请先选择AI模型');
      return;
    }

    try {
      setIsInitializing(true);

      // 创建面试记录
      const interviewData = {
        jobId: selectedPosition.id,
        jobTitle: selectedPosition.title,
        jobContent: selectedPosition.description,
        questionCount: selectedPosition.question_count || 10,
        resumesId: selectedPosition.resumeId,
        resumesTitle: selectedPosition.resumeTitle,
        resumesContent: selectedPosition.resumeContent,
        interviewType: 'mock' as const
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
      stateMachine.current.onStateChange((state, context) => {
        setInterviewState(state);
        onStateChange?.(state);
        handleStateChange(state, context);
      });

      // 初始化数据服务
      interviewDataService.initializeInterview(response.id, interviewData.questionCount);

      // 创建LLM会话
      llmSessionId.current = streamingLLMManager.createSession();

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
      setErrorMessage(`开始面试失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setIsInitializing(false);
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
      // 如果有当前面试ID，调用结束面试API
      if (currentInterviewId) {
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
    console.log('Interview state changed:', state, context);

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
          await handleGeneratingAnswer(context);
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
    } finally {
      setIsInitializing(false);
    }
  };

  // 初始化阶段
  const handleInitializing = async (context: any) => {
    setCurrentLine('正在初始化面试信息...');

    try {
      // 构建初始化prompt（用于后续LLM调用）
      mockInterviewService.buildInitPrompt(
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

    try {
      const sessionId = llmSessionId.current;
      if (!sessionId) throw new Error('LLM session not initialized');

      // 构建问题生成的prompt
      const questionPrompt = `现在开始第${context.currentQuestionIndex + 1}个问题。请根据之前的对话历史和岗位要求，生成一个合适的面试问题。直接输出问题内容，不要包含其他解释。`;

      const messages = [{
        role: 'user' as const,
        content: questionPrompt,
      }];

      let generatedQuestion = '';

      await streamingLLMManager.sendStreamingRequest(
        sessionId,
        { messages },
        (chunk) => {
          generatedQuestion += chunk.content;
        },
        (fullResponse) => {
          // 清理问题文本
          const cleanQuestion = fullResponse.trim().replace(/^(问题|Question)\s*[:：]?\s*/, '');
          stateMachine.current?.send({
            type: 'QUESTION_GENERATED',
            payload: { question: cleanQuestion }
          });
        },
        (error) => {
          stateMachine.current?.send({ type: 'THINKING_ERROR', payload: { error: error.message } });
        }
      );
    } catch (error) {
      stateMachine.current?.send({ type: 'THINKING_ERROR', payload: { error: error instanceof Error ? error.message : String(error) } });
    }
  };

  // AI说话阶段
  const handleAISpeaking = async (context: any) => {
    try {
      const question = context.currentQuestion;
      if (!question) throw new Error('No question to speak');

      // 创建问题记录
      await interviewDataService.createQuestionRecord(context.currentQuestionIndex, question);

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
    setCurrentLine('请开始回答问题...');
    // 启动ASR监听
    if (voiceCoordinator.current?.canStartASR()) {
      voiceCoordinator.current.startASRListening();
    }
  };

  // 用户说话阶段
  const handleUserSpeaking = () => {
    setCurrentLine('正在录制您的回答...');
  };

  // 用户说话结束处理
  const handleUserFinishedSpeaking = async () => {
    try {
      // 这里需要获取ASR识别的文本结果
      // 临时使用模拟数据，实际需要集成ASR服务
      const rawTranscription = '这是用户的回答内容';

      // 优化转录文本
      const optimizedText = await mockInterviewService.optimizeTranscription(rawTranscription);

      stateMachine.current?.send({
        type: 'USER_FINISHED_SPEAKING',
        payload: { response: optimizedText }
      });
    } catch (error) {
      console.error('处理用户回答失败:', error);
      stateMachine.current?.send({ type: 'SPEAKING_ERROR', payload: { error: error instanceof Error ? error.message : String(error) } });
    }
  };

  // AI分析阶段
  const handleAIAnalyzing = async (context: any) => {
    setCurrentLine('正在分析您的回答...');

    try {
      // 更新用户回答到数据库
      await interviewDataService.updateUserAnswer(context.currentQuestionIndex, context.userResponse);

      // 发送分析完成事件，继续到答案生成阶段
      stateMachine.current?.send({ type: 'ANALYSIS_COMPLETE' });
    } catch (error) {
      stateMachine.current?.send({ type: 'ANALYSIS_ERROR', payload: { error: error instanceof Error ? error.message : String(error) } });
    }
  };

  // 生成答案阶段
  const handleGeneratingAnswer = async (context: any) => {
    setCurrentLine('正在生成参考答案...');

    try {
      const sessionId = llmSessionId.current;
      if (!sessionId) throw new Error('LLM session not initialized');

      // 检查问题相似度
      const similarQuestions = await mockInterviewService.findSimilarQuestions(
        context.currentQuestion,
        context.questionsBank || [],
        0.6
      );

      let referenceAnswer = '';

      if (similarQuestions.length > 0 && similarQuestions[0].useAsReference) {
        // 使用押题答案
        referenceAnswer = similarQuestions[0].question.answer || '无参考答案';

        // 直接完成
        await interviewDataService.updateReferenceAnswer(
          context.currentQuestionIndex,
          referenceAnswer
        );

        onAnswerGenerated?.(referenceAnswer);

        stateMachine.current?.send({
          type: 'ANSWER_GENERATED',
          payload: { answer: referenceAnswer }
        });
      } else {
        // 使用LLM生成答案
        const answerPrompt = `请为以下面试问题生成一个优秀的参考答案：\n\n问题：${context.currentQuestion}\n\n要求：\n1. 答案要专业、具体、有条理\n2. 结合实际工作经验\n3. 体现相关技能和能力\n4. 控制在200字以内`;

        const messages = [{
          role: 'user' as const,
          content: answerPrompt,
        }];

        await streamingLLMManager.sendStreamingRequest(
          sessionId,
          { messages },
          (chunk) => {
            referenceAnswer += chunk.content;
          },
          async (fullResponse) => {
            referenceAnswer = fullResponse.trim();

            // 更新参考答案到数据库
            await interviewDataService.updateReferenceAnswer(
              context.currentQuestionIndex,
              referenceAnswer
            );

            // 通知上层组件
            onAnswerGenerated?.(referenceAnswer);

            // 发送答案生成完成事件
            stateMachine.current?.send({
              type: 'ANSWER_GENERATED',
              payload: { answer: referenceAnswer }
            });
          },
          (error) => {
            stateMachine.current?.send({ type: 'GENERATION_ERROR', payload: { error: error.message } });
          }
        );
      }
    } catch (error) {
      stateMachine.current?.send({ type: 'GENERATION_ERROR', payload: { error: error instanceof Error ? error.message : String(error) } });
    }
  };

  // 轮次完成
  const handleRoundComplete = (context: any) => {
    setCurrentLine(`第${context.currentQuestionIndex + 1}个问题已完成`);

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

    try {
      // 结束面试数据记录
      interviewDataService.finishInterview();

      // 发送生成报告事件
      stateMachine.current?.send({ type: 'GENERATE_REPORT' });
    } catch (error) {
      stateMachine.current?.send({ type: 'ENDING_ERROR', payload: { error: error instanceof Error ? error.message : String(error) } });
    }
  };

  // 面试完成
  const handleInterviewCompleted = () => {
    setCurrentLine('面试已完成！感谢您的参与。');

    // 更新VoiceState
    setVoiceState({
      mode: 'mock-interview',
      subState: 'mock-interview-completed',
      interviewId: undefined
    });
  };

  // 错误处理
  const handleError = (context: any) => {
    setErrorMessage(context.errorMessage || '面试过程中发生错误');
    setCurrentLine('');
  };


  return (
    <div className="interviewer-mode-panel">
      {/* 岗位选择卡片 */}
      <JobPositionCard
        onPositionSelect={handlePositionSelect}
        onModelSelect={handleModelSelect}
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



