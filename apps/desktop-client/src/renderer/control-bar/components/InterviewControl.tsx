/**
 * 控制栏面试控制组件
 * 在控制栏窗口中显示面试状态和快速控制按钮
 */

import { Mic, MicOff, Square, Play, SkipForward, X, Clock, BarChart3 } from 'lucide-react';
import { useEffect, useState } from 'react';
// 导入接口定义（控制栏需要自己的服务实例）
export enum InterviewState {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  AI_THINKING = 'ai_thinking',
  AI_SPEAKING = 'ai_speaking',
  USER_LISTENING = 'user_listening',
  USER_SPEAKING = 'user_speaking',
  AI_ANALYZING = 'ai_analyzing',
  GENERATING_ANSWER = 'generating_answer',
  ROUND_COMPLETE = 'round_complete',
  INTERVIEW_ENDING = 'interview_ending',
  GENERATING_REPORT = 'generating_report',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export enum VoiceState {
  IDLE = 'idle',
  TTS_PLAYING = 'tts_playing',
  ASR_LISTENING = 'asr_listening',
  USER_SPEAKING = 'user_speaking',
  PROCESSING = 'processing'
}

export enum InterviewIPCEvents {
  INTERVIEW_STATE_CHANGED = 'interview:state-changed',
  INTERVIEW_STARTED = 'interview:started',
  INTERVIEW_ENDED = 'interview:ended',
  INTERVIEW_PROGRESS_UPDATED = 'interview:progress-updated',
  VOICE_STATE_CHANGED = 'interview:voice-state-changed',
  AUDIO_LEVEL_UPDATED = 'interview:audio-level-updated',
  START_RECORDING = 'interview:start-recording',
  STOP_RECORDING = 'interview:stop-recording',
  TOGGLE_AUTO_MODE = 'interview:toggle-auto-mode',
  SKIP_QUESTION = 'interview:skip-question',
  END_INTERVIEW = 'interview:end-interview',
  PROVIDE_CURRENT_STATE = 'interview:provide-current-state'
}

interface InterviewStateData {
  state: InterviewState;
  currentQuestion?: string;
  progress: { current: number; total: number; percentage: number };
}

interface VoiceStateData {
  state: VoiceState;
  audioLevel: number;
  isAutoMode: boolean;
}

// 控制栏专用的IPC服务类
class ControlBarInterviewIPCService {
  private electronAPI: any;

  constructor() {
    this.electronAPI = (window as any).electronAPI?.interview;
    if (this.electronAPI) {
      this.electronAPI.registerWindow?.();
    }
  }

  on(event: InterviewIPCEvents, listener: (data: any) => void): void {
    this.electronAPI?.onInterviewEvent?.(event, listener);
  }

  off(_event: InterviewIPCEvents, _listener: (data: any) => void): void {
    // EventListener移除需要在具体实现中处理
  }

  requestStartRecording(): void {
    this.electronAPI?.sendInterviewEvent?.(InterviewIPCEvents.START_RECORDING);
  }

  requestStopRecording(): void {
    this.electronAPI?.sendInterviewEvent?.(InterviewIPCEvents.STOP_RECORDING);
  }

  requestToggleAutoMode(autoMode: boolean): void {
    this.electronAPI?.sendInterviewEvent?.(InterviewIPCEvents.TOGGLE_AUTO_MODE, { autoMode });
  }

  requestSkipQuestion(): void {
    this.electronAPI?.sendInterviewEvent?.(InterviewIPCEvents.SKIP_QUESTION);
  }

  requestEndInterview(): void {
    this.electronAPI?.sendInterviewEvent?.(InterviewIPCEvents.END_INTERVIEW);
  }

  requestCurrentState(): void {
    this.electronAPI?.sendInterviewEvent?.('request-current-state');
  }
}

const interviewIPCService = new ControlBarInterviewIPCService();

interface InterviewControlProps {
  className?: string;
}

export function InterviewControl({ className = '' }: InterviewControlProps) {
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [interviewState, setInterviewState] = useState<InterviewState>(InterviewState.IDLE);
  const [voiceState, setVoiceState] = useState<VoiceState>(VoiceState.IDLE);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [audioLevel, setAudioLevel] = useState(0);
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  // 计时器
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isInterviewActive && startTime) {
      timer = setInterval(() => {
        setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isInterviewActive, startTime]);

  // IPC事件监听
  useEffect(() => {
    // 面试开始事件
    const handleInterviewStarted = (data: any) => {
      setIsInterviewActive(true);
      setStartTime(data.timestamp);
      setTimeElapsed(0);
    };

    // 面试结束事件
    const handleInterviewEnded = (_data: any) => {
      setIsInterviewActive(false);
      setStartTime(null);
      setTimeElapsed(0);
      setInterviewState(InterviewState.COMPLETED);
    };

    // 面试状态变化
    const handleStateChanged = (data: InterviewStateData) => {
      setInterviewState(data.state);
      setCurrentQuestion(data.currentQuestion || '');
      setProgress(data.progress);
    };

    // 语音状态变化
    const handleVoiceStateChanged = (data: VoiceStateData) => {
      setVoiceState(data.state);
      setAudioLevel(data.audioLevel);
      setIsAutoMode(data.isAutoMode);
    };

    // 音频级别更新
    const handleAudioLevelUpdated = (data: { level: number }) => {
      setAudioLevel(data.level);
    };

    // 当前状态同步
    const handleCurrentState = (data: any) => {
      if (data.isActive) {
        setIsInterviewActive(true);
        setStartTime(data.startTime);
        setInterviewState(data.state || InterviewState.IDLE);
        setCurrentQuestion(data.currentQuestion || '');
        setProgress(data.progress || { current: 0, total: 0, percentage: 0 });

        if (data.voiceState) {
          setVoiceState(data.voiceState.state);
          setAudioLevel(data.voiceState.audioLevel);
          setIsAutoMode(data.voiceState.isAutoMode);
        }
      }
    };

    // 注册事件监听器
    interviewIPCService.on(InterviewIPCEvents.INTERVIEW_STARTED, handleInterviewStarted);
    interviewIPCService.on(InterviewIPCEvents.INTERVIEW_ENDED, handleInterviewEnded);
    interviewIPCService.on(InterviewIPCEvents.INTERVIEW_STATE_CHANGED, handleStateChanged);
    interviewIPCService.on(InterviewIPCEvents.VOICE_STATE_CHANGED, handleVoiceStateChanged);
    interviewIPCService.on(InterviewIPCEvents.AUDIO_LEVEL_UPDATED, handleAudioLevelUpdated);
    interviewIPCService.on(InterviewIPCEvents.PROVIDE_CURRENT_STATE, handleCurrentState);

    // 请求当前状态
    interviewIPCService.requestCurrentState();

    return () => {
      // 清理事件监听器
      interviewIPCService.off(InterviewIPCEvents.INTERVIEW_STARTED, handleInterviewStarted);
      interviewIPCService.off(InterviewIPCEvents.INTERVIEW_ENDED, handleInterviewEnded);
      interviewIPCService.off(InterviewIPCEvents.INTERVIEW_STATE_CHANGED, handleStateChanged);
      interviewIPCService.off(InterviewIPCEvents.VOICE_STATE_CHANGED, handleVoiceStateChanged);
      interviewIPCService.off(InterviewIPCEvents.AUDIO_LEVEL_UPDATED, handleAudioLevelUpdated);
      interviewIPCService.off(InterviewIPCEvents.PROVIDE_CURRENT_STATE, handleCurrentState);
    };
  }, []);

  // 控制操作
  const handleStartRecording = () => {
    interviewIPCService.requestStartRecording();
  };

  const handleStopRecording = () => {
    interviewIPCService.requestStopRecording();
  };

  const handleToggleAutoMode = () => {
    interviewIPCService.requestToggleAutoMode(!isAutoMode);
  };

  const handleSkipQuestion = () => {
    interviewIPCService.requestSkipQuestion();
  };

  const handleEndInterview = () => {
    if (confirm('确定要结束面试吗？')) {
      interviewIPCService.requestEndInterview();
    }
  };

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 获取状态描述
  const getStateDescription = (): string => {
    if (!isInterviewActive) return '面试未开始';

    switch (interviewState) {
      case InterviewState.AI_THINKING:
        return '面试官思考中...';
      case InterviewState.AI_SPEAKING:
        return 'AI正在提问';
      case InterviewState.USER_LISTENING:
        return '等待您回答';
      case InterviewState.USER_SPEAKING:
        return '正在录制回答';
      case InterviewState.AI_ANALYZING:
        return '分析回答中...';
      case InterviewState.GENERATING_ANSWER:
        return '生成参考答案...';
      case InterviewState.COMPLETED:
        return '面试已完成';
      default:
        return '面试进行中';
    }
  };

  // 获取语音状态图标
  const getVoiceIcon = () => {
    switch (voiceState) {
      case VoiceState.USER_SPEAKING:
        return <Square size={16} className="text-red-500" />;
      case VoiceState.ASR_LISTENING:
        return <Mic size={16} className="text-green-500" />;
      case VoiceState.TTS_PLAYING:
        return <Play size={16} className="text-blue-500" />;
      default:
        return <MicOff size={16} className="text-gray-500" />;
    }
  };

  // 获取录音按钮状态
  const getRecordingButtonProps = () => {
    const canRecord = isInterviewActive &&
                     (interviewState === InterviewState.USER_LISTENING ||
                      interviewState === InterviewState.USER_SPEAKING);

    if (voiceState === VoiceState.USER_SPEAKING) {
      return {
        onClick: handleStopRecording,
        disabled: false,
        className: 'bg-red-500 hover:bg-red-600 text-white',
        icon: <Square size={14} />,
        text: '停止'
      };
    } else {
      return {
        onClick: handleStartRecording,
        disabled: !canRecord,
        className: canRecord ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-300 text-gray-500',
        icon: <Mic size={14} />,
        text: '录音'
      };
    }
  };

  const recordingButtonProps = getRecordingButtonProps();

  if (!isInterviewActive) {
    return (
      <div className={`interview-control inactive ${className}`}>
        <div className="control-content">
          <div className="status-indicator">
            <div className="status-dot idle" />
            <span className="status-text">面试未激活</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`interview-control active ${className}`}>
      <div className="control-content">
        {/* 状态指示器 */}
        <div className="status-section">
          <div className="status-indicator">
            <div className={`status-dot ${interviewState === InterviewState.USER_SPEAKING ? 'recording' : 'active'}`} />
            <span className="status-text">{getStateDescription()}</span>
          </div>

          {/* 语音状态 */}
          <div className="voice-indicator">
            {getVoiceIcon()}
            <span className="voice-text">
              {isAutoMode ? '自动' : '手动'}
            </span>
          </div>
        </div>

        {/* 进度信息 */}
        <div className="progress-section">
          <div className="progress-info">
            <BarChart3 size={14} />
            <span className="progress-text">
              {progress.current}/{progress.total} ({progress.percentage}%)
            </span>
          </div>

          <div className="time-info">
            <Clock size={14} />
            <span className="time-text">{formatTime(timeElapsed)}</span>
          </div>
        </div>

        {/* 控制按钮 */}
        <div className="control-buttons">
          {/* 录音控制 */}
          {!isAutoMode && (
            <button
              onClick={recordingButtonProps.onClick}
              disabled={recordingButtonProps.disabled}
              className={`control-btn record-btn ${recordingButtonProps.className}`}
              title={recordingButtonProps.text}
            >
              {recordingButtonProps.icon}
            </button>
          )}

          {/* 模式切换 */}
          <button
            onClick={handleToggleAutoMode}
            className={`control-btn mode-btn ${isAutoMode ? 'auto' : 'manual'}`}
            title={`切换到${isAutoMode ? '手动' : '自动'}模式`}
          >
            {isAutoMode ? 'AUTO' : 'MANUAL'}
          </button>

          {/* 跳过问题 */}
          <button
            onClick={handleSkipQuestion}
            disabled={interviewState === InterviewState.AI_THINKING ||
                     interviewState === InterviewState.AI_SPEAKING}
            className="control-btn skip-btn"
            title="跳过当前问题"
          >
            <SkipForward size={14} />
          </button>

          {/* 结束面试 */}
          <button
            onClick={handleEndInterview}
            className="control-btn end-btn"
            title="结束面试"
          >
            <X size={14} />
          </button>
        </div>

        {/* 音频级别指示器 */}
        {voiceState === VoiceState.USER_SPEAKING && (
          <div className="audio-level-indicator">
            <div className="audio-bars">
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={i}
                  className={`audio-bar ${audioLevel > (i + 1) * 0.2 ? 'active' : ''}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 当前问题预览 */}
      {currentQuestion && (
        <div className="question-preview">
          <span className="question-label">当前问题:</span>
          <span className="question-text">
            {currentQuestion.length > 50
              ? `${currentQuestion.substring(0, 50)}...`
              : currentQuestion}
          </span>
        </div>
      )}
    </div>
  );
}