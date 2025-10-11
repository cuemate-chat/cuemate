
import { ChevronDown, Pause, Play, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { setVoiceState, useVoiceState } from '../../../utils/voiceState';
import { interviewDataService } from '../../ai-question/components/mock-interview/data/InterviewDataService';
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

interface InterviewTrainingEntryBodyProps {
  onStart?: () => void;
  onStateChange?: (state: InterviewState) => void;
  onInterviewerSpeaking?: (text: string) => void;
  onUserAnswer?: (answer: string) => void;
}

export function InterviewTrainingEntryBody({
  onStart,
  onStateChange,
  onInterviewerSpeaking,
  onUserAnswer
}: InterviewTrainingEntryBodyProps) {
  const [currentLine, setCurrentLine] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [timestamp, setTimestamp] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState<JobPosition | null>(null);
  const [, setSelectedModel] = useState<Model | null>(null);

  // 使用VoiceState来控制下拉列表状态
  const voiceState = useVoiceState();

  // 音频设备状态
  const [micDevices, setMicDevices] = useState<AudioDevice[]>([]);
  const [speakerDevices, setSpeakerDevices] = useState<AudioDevice[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('');

  // 面试状态管理
  const stateMachine = useRef<InterviewStateMachine | null>(null);
  const voiceCoordinator = useRef<VoiceCoordinator | null>(null);
  const [, setInterviewState] = useState<InterviewState>(InterviewState.IDLE);
  const [, setIsInitializing] = useState(false);

  // 系统音频监听状态
  const [isListeningToInterviewer, setIsListeningToInterviewer] = useState(false);
  const [interviewerAudioLevel, setInterviewerAudioLevel] = useState(0);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
        voiceCoordinator.current.addEventListener('userStartedSpeaking', (() => {
        }) as EventListener);

        voiceCoordinator.current.addEventListener('userFinishedSpeaking', ((_event: CustomEvent) => {
          handleUserFinishedSpeaking();
        }) as EventListener);

        console.debug('Interview training system initialized successfully');
      } catch (error) {
        console.error('Failed to initialize interview training system:', error);
        setErrorMessage('面试训练系统初始化失败，请刷新页面重试');
      }
    };

    const loadAudioSettings = async () => {
      try {
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

  const handleStartTraining = async () => {
    if (!selectedPosition) {
      setErrorMessage('请先选择面试岗位');
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
        interviewType: 'training' as const // 面试训练类型
      };

      const response = await interviewService.createInterview(interviewData);

      // 设置voiceState的interviewId
      setVoiceState({ interviewId: response.id });

      // 初始化状态机（简化版，用于训练模式）
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
        },
      });

      // 设置VoiceState
      setVoiceState({
        mode: 'interview-training',
        subState: 'training-listening',
        interviewId: response.id
      });

      // 开始监听面试官音频
      await startInterviewerAudioListening();

      setCurrentLine('面试训练已开始，正在监听面试官讲话...');

      // 调用原始的开始函数
      if (onStart) {
        onStart();
      }
    } catch (error) {
      console.error('开始面试训练失败:', error);
      setErrorMessage(`开始面试训练失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setIsInitializing(false);
    }
  };

  // 开始监听面试官音频（系统音频）
  const startInterviewerAudioListening = async () => {
    try {
      setIsListeningToInterviewer(true);

      // 这里应该调用系统音频捕获API
      // 目前先模拟实现
      console.debug('开始监听面试官音频...');

      // 模拟音频级别变化
      audioLevelIntervalRef.current = setInterval(() => {
        if (isListeningToInterviewer) {
          setInterviewerAudioLevel(Math.random() * 0.8);
        }
      }, 100);

      // 模拟检测到面试官说话
      setTimeout(() => {
        if (isListeningToInterviewer) {
          handleInterviewerSpeaking("这是一个技术面试问题：请介绍一下你的项目经验。");
        }
      }, 3000);

    } catch (error) {
      console.error('启动面试官音频监听失败:', error);
      setErrorMessage('启动音频监听失败');
      setIsListeningToInterviewer(false);
    }
  };

  // 停止监听面试官音频
  const stopInterviewerAudioListening = () => {
    setIsListeningToInterviewer(false);
    setInterviewerAudioLevel(0);
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }
  };

  // 处理检测到面试官说话
  const handleInterviewerSpeaking = (text: string) => {
    setCurrentLine(`面试官：${text}`);
    setTimestamp(Date.now());

    // 通知上层组件
    onInterviewerSpeaking?.(text);

    // 记录面试官问题
    if (stateMachine.current) {
      const context = stateMachine.current.getContext();
      interviewDataService.createQuestionRecord(
        context.currentQuestionIndex || 0,
        text
      );
    }

    // 启动用户回答监听
    setTimeout(() => {
      startUserAnswerListening();
    }, 1000);
  };

  // 开始监听用户回答
  const startUserAnswerListening = () => {
    setCurrentLine('请开始回答问题...');

    // 启动ASR监听
    if (voiceCoordinator.current?.canStartASR()) {
      voiceCoordinator.current.startASRListening();
    }
  };

  // 用户说话结束处理
  const handleUserFinishedSpeaking = async () => {
    try {
      // 这里需要获取ASR识别的文本结果
      const rawTranscription = '这是用户的回答内容'; // 临时模拟数据

      setCurrentLine(`您的回答：${rawTranscription}`);

      // 通知上层组件
      onUserAnswer?.(rawTranscription);

      // TODO: 面试训练模式的数据记录待实现
      // 记录用户回答
      // if (stateMachine.current) {
      //   const context = stateMachine.current.getContext();
      //   await interviewDataService.updateUserAnswer(
      //     context.currentQuestionIndex || 0,
      //     rawTranscription
      //   );
      // }

      // 继续监听下一个问题
      setTimeout(() => {
        setCurrentLine('继续监听面试官讲话...');
      }, 2000);

    } catch (error) {
      console.error('处理用户回答失败:', error);
      setErrorMessage('处理回答失败');
    }
  };

  const handlePauseTraining = () => {
    setVoiceState({ mode: 'interview-training', subState: 'training-paused' });
    stopInterviewerAudioListening();
  };

  const handleResumeTraining = async () => {
    setVoiceState({ mode: 'interview-training', subState: 'training-listening' });
    await startInterviewerAudioListening();
  };

  const handleStopTraining = async () => {
    try {
      // 停止音频监听
      stopInterviewerAudioListening();

      // 如果有当前面试ID，调用结束面试API
      if (voiceState.interviewId) {
        await interviewService.endInterview(voiceState.interviewId);
      }

      setVoiceState({
        mode: 'interview-training',
        subState: 'training-completed',
        interviewId: undefined
      });

      setCurrentLine('面试训练已结束');
    } catch (error) {
      console.error('结束面试训练失败:', error);
      setErrorMessage(`结束面试训练失败: ${error instanceof Error ? error.message : '未知错误'}`);
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
    console.debug('Interview training state changed:', state, context);
    setIsInitializing(false);
  };

  return (
    <div className="interviewer-mode-panel">
      {/* 岗位选择卡片 */}
      <JobPositionCard
        onPositionSelect={handlePositionSelect}
        onModelSelect={handleModelSelect}
        disabled={(voiceState.subState === 'training-listening' ||
                   voiceState.subState === 'training-paused')}
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

          {/* 音频级别指示器 */}
          {isListeningToInterviewer && (
            <div className="audio-level-indicator" style={{
              width: `${interviewerAudioLevel * 100}%`,
              height: '3px',
              backgroundColor: '#4ade80',
              marginTop: '4px',
              borderRadius: '2px',
              transition: 'width 0.1s ease'
            }} />
          )}
        </div>
        <div className="interviewer-right interviewer-controls-column">
          {/* 麦克风选择 */}
          <div className="device-select-group">
            <div className="voice-select">
              <select
                className="device-select"
                value={selectedMic}
                onChange={(e) => setSelectedMic(e.target.value)}
                disabled={loading || (voiceState.subState === 'training-listening' ||
                         voiceState.subState === 'training-paused')}
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
                disabled={loading || (voiceState.subState === 'training-listening' ||
                         voiceState.subState === 'training-paused')}
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
          {onStart && (voiceState.subState !== 'training-listening' &&
            voiceState.subState !== 'training-paused') && (
            <button
              className="test-button"
              onClick={handleStartTraining}
              disabled={loading || !selectedPosition}
            >
              开始面试训练
            </button>
          )}

          {/* 控制按钮 */}
          {(voiceState.subState === 'training-listening' ||
            voiceState.subState === 'training-paused') && (
            <div className="interview-segmented">
              {voiceState.subState === 'training-paused' ? (
                <button
                  className="interview-segmented-btn interview-segmented-btn-left continue"
                  onClick={handleResumeTraining}
                >
                  <Play size={14} />
                  继续
                </button>
              ) : (
                <button
                  className="interview-segmented-btn interview-segmented-btn-left"
                  onClick={handlePauseTraining}
                >
                  <Pause size={14} />
                  暂停
                </button>
              )}
              <div className="interview-separator" />
              <button
                className="interview-segmented-btn interview-segmented-btn-right"
                onClick={handleStopTraining}
              >
                <Square size={14} />
                停止
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 状态显示 */}
      {(currentLine || errorMessage) && (
        <div className="">
          {currentLine && (
            <div className="ai-utterance recognized-text">
              <h5>当前状态：</h5>
              {currentLine}
              {timestamp > 0 && <div className="timestamp" style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{new Date(timestamp).toLocaleTimeString()}</div>}
            </div>
          )}
          {errorMessage && (
            <div className="ai-utterance error-text" style={{ color: '#ff6b6b' }}>
              <h5>错误信息：</h5>
              {errorMessage}
              {timestamp > 0 && <div className="timestamp" style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{new Date(timestamp).toLocaleTimeString()}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}



