import * as Tooltip from '@radix-ui/react-tooltip';
import { CornerDownLeft, Mic, MicOff, Square, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { InterviewState } from './state/InterviewStateMachine';
import { VoiceCoordinator, VoiceState, AudioLevelData } from './voice/VoiceCoordinator';

interface MockInterviewFooterProps {
  interviewState: InterviewState;
  voiceCoordinator?: VoiceCoordinator;
  speechText?: string;
  audioLevel?: number;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onResponseComplete?: () => void;
  onToggleMode?: (autoMode: boolean) => void;
  disabled?: boolean;
  className?: string;
}

// 音频可视化组件
function AudioVisualizer({
  level,
  isActive,
  size = 60
}: {
  level: number;
  isActive: boolean;
  size?: number;
}) {
  const bars = 8;
  const maxHeight = size * 0.6;

  const getBarHeight = (index: number): number => {
    if (!isActive) return 4;

    // 模拟音频频谱效果
    const normalizedLevel = Math.max(0, Math.min(1, level));
    const baseHeight = normalizedLevel * maxHeight;
    const variation = Math.sin(Date.now() * 0.01 + index) * 0.3 + 0.7;
    return Math.max(4, baseHeight * variation);
  };

  return (
    <div
      className="audio-visualizer"
      style={{ width: size, height: size }}
    >
      {Array.from({ length: bars }, (_, i) => (
        <div
          key={i}
          className="audio-bar"
          style={{
            height: `${getBarHeight(i)}px`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

// 语音状态指示器
function VoiceStatusIndicator({
  voiceState,
  audioLevel
}: {
  voiceState: VoiceState;
  audioLevel: number;
}) {
  const getStatusInfo = () => {
    switch (voiceState) {
      case VoiceState.IDLE:
        return { icon: MicOff, text: '未激活', color: '#666' };
      case VoiceState.TTS_PLAYING:
        return { icon: Volume2, text: 'AI说话中', color: '#3b82f6' };
      case VoiceState.ASR_LISTENING:
        return { icon: Mic, text: '等待说话', color: '#10b981' };
      case VoiceState.USER_SPEAKING:
        return { icon: Mic, text: '正在录制', color: '#ef4444' };
      case VoiceState.PROCESSING:
        return { icon: Mic, text: '处理中', color: '#f59e0b' };
      default:
        return { icon: MicOff, text: '未知状态', color: '#666' };
    }
  };

  const { icon: Icon, text, color } = getStatusInfo();

  return (
    <div className="voice-status-indicator">
      <div
        className="status-icon"
        style={{ color }}
      >
        <Icon size={16} />
      </div>
      <span className="status-text" style={{ color }}>
        {text}
      </span>
      {voiceState === VoiceState.USER_SPEAKING && (
        <AudioVisualizer
          level={audioLevel}
          isActive={true}
          size={24}
        />
      )}
    </div>
  );
}

export function MockInterviewFooter({
  interviewState,
  voiceCoordinator,
  speechText = '',
  audioLevel = 0,
  onStartRecording,
  onStopRecording,
  onResponseComplete,
  onToggleMode,
  disabled = false,
  className
}: MockInterviewFooterProps) {
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [voiceState, setVoiceState] = useState<VoiceState>(VoiceState.IDLE);
  const [currentAudioLevel, setCurrentAudioLevel] = useState(0);
  const speechRef = useRef<HTMLSpanElement>(null);

  // 监听语音协调器状态变化
  useEffect(() => {
    if (!voiceCoordinator) return;

    const handleStateChange = (event: CustomEvent) => {
      setVoiceState(event.detail as VoiceState);
    };

    const handleAudioLevel = (event: CustomEvent) => {
      const data = event.detail as AudioLevelData;
      setCurrentAudioLevel(data.volume);
    };

    voiceCoordinator.addEventListener('stateChanged', handleStateChange as EventListener);
    voiceCoordinator.addEventListener('audioLevel', handleAudioLevel as EventListener);

    return () => {
      voiceCoordinator.removeEventListener('stateChanged', handleStateChange as EventListener);
      voiceCoordinator.removeEventListener('audioLevel', handleAudioLevel as EventListener);
    };
  }, [voiceCoordinator]);

  // 自动滚动到最新内容
  useEffect(() => {
    if (speechRef.current) {
      speechRef.current.scrollLeft = speechRef.current.scrollWidth;
    }
  }, [speechText]);

  const handleToggleMode = () => {
    const newMode = !isAutoMode;
    setIsAutoMode(newMode);
    onToggleMode?.(newMode);
  };

  const handleManualRecord = () => {
    if (voiceState === VoiceState.USER_SPEAKING) {
      // 停止录音
      onStopRecording?.();
      voiceCoordinator?.manualEndSpeaking();
    } else if (voiceState === VoiceState.ASR_LISTENING) {
      // 开始录音
      onStartRecording?.();
    }
  };

  const handleResponseComplete = () => {
    if (!isAutoMode && voiceState === VoiceState.USER_SPEAKING) {
      voiceCoordinator?.manualEndSpeaking();
    }
    onResponseComplete?.();
  };

  // 判断是否可以录音
  const canRecord = () => {
    return !disabled &&
           (interviewState === InterviewState.USER_LISTENING ||
            interviewState === InterviewState.USER_SPEAKING) &&
           (voiceState === VoiceState.ASR_LISTENING ||
            voiceState === VoiceState.USER_SPEAKING);
  };

  // 判断是否显示回答完毕按钮
  const showCompleteButton = () => {
    return !isAutoMode &&
           voiceState === VoiceState.USER_SPEAKING &&
           interviewState === InterviewState.USER_SPEAKING;
  };

  // 获取录音按钮状态
  const getRecordButtonState = () => {
    if (disabled) return { icon: MicOff, text: '已禁用', className: 'disabled' };

    switch (voiceState) {
      case VoiceState.USER_SPEAKING:
        return { icon: Square, text: '停止录音', className: 'recording' };
      case VoiceState.ASR_LISTENING:
        return { icon: Mic, text: '开始录音', className: 'ready' };
      case VoiceState.TTS_PLAYING:
        return { icon: Volume2, text: 'AI说话中', className: 'disabled' };
      default:
        return { icon: MicOff, text: '未激活', className: 'inactive' };
    }
  };

  const recordButtonState = getRecordButtonState();

  return (
    <div className={`ai-window-footer mock-interview-footer${className ? ` ${className}` : ''}`}>
      {/* 语音识别内容显示区域 */}
      <div className="speech-display-container">
        {/* 音频可视化 */}
        <div className="audio-visualizer-container">
          <AudioVisualizer
            level={audioLevel || currentAudioLevel}
            isActive={voiceState === VoiceState.USER_SPEAKING}
            size={48}
          />
        </div>

        {/* 语音文本显示 */}
        <div className="speech-text-container">
          <span
            ref={speechRef}
            className="speech-text"
          >
            {speechText || '等待语音输入...'}
          </span>

          {/* 语音状态指示器 */}
          <VoiceStatusIndicator
            voiceState={voiceState}
            audioLevel={currentAudioLevel}
          />
        </div>
      </div>

      {/* 右侧控制按钮区域 */}
      <div className="control-actions">
        {/* 自动/手动模式切换 */}
        <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                className={`mode-toggle ${isAutoMode ? 'auto' : 'manual'}`}
                onClick={handleToggleMode}
                disabled={disabled}
              >
                <span className="toggle-text">{isAutoMode ? '自动' : '手动'}</span>
                <div className="toggle-switch">
                  <div className="toggle-handle" />
                </div>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
              <div className="tooltip-content">
                <div className="tooltip-title">
                  {isAutoMode ? '自动模式' : '手动模式'}
                </div>
                <div className="tooltip-description">
                  {isAutoMode
                    ? '自动检测语音结束（3秒静音）'
                    : '手动控制录音开始和结束'}
                </div>
              </div>
              <Tooltip.Arrow className="radix-tooltip-arrow" />
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>

        {/* 手动录音控制按钮 */}
        {!isAutoMode && (
          <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  className={`record-control-btn ${recordButtonState.className}`}
                  onClick={handleManualRecord}
                  disabled={!canRecord()}
                >
                  <recordButtonState.icon size={16} />
                  <span className="record-text">{recordButtonState.text}</span>
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
                <div className="tooltip-content">
                  <div className="tooltip-title">手动录音控制</div>
                  <div className="tooltip-description">
                    {voiceState === VoiceState.USER_SPEAKING
                      ? '点击停止录音'
                      : '点击开始录音'}
                  </div>
                </div>
                <Tooltip.Arrow className="radix-tooltip-arrow" />
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
        )}

        {/* 回答完毕按钮 */}
        {showCompleteButton() && (
          <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  onClick={handleResponseComplete}
                  className="response-complete-btn"
                  disabled={disabled}
                >
                  <span className="response-text">回答完毕</span>
                  <CornerDownLeft size={16} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
                <div className="tooltip-content">
                  <div className="tooltip-title">完成回答</div>
                  <div className="tooltip-description">
                    标记当前问题回答完毕，进入下一个问题
                  </div>
                </div>
                <Tooltip.Arrow className="radix-tooltip-arrow" />
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
        )}
      </div>

      {/* 面试进度信息 */}
      <div className="interview-progress-info">
        {interviewState !== InterviewState.IDLE && interviewState !== InterviewState.COMPLETED && (
          <div className="progress-status">
            <span className="status-dot" />
            <span className="status-text">
              {interviewState === InterviewState.AI_THINKING && '面试官思考中...'}
              {interviewState === InterviewState.AI_SPEAKING && 'AI正在提问'}
              {interviewState === InterviewState.USER_LISTENING && '等待您回答'}
              {interviewState === InterviewState.USER_SPEAKING && '正在录制回答'}
              {interviewState === InterviewState.AI_ANALYZING && '分析回答中...'}
              {interviewState === InterviewState.GENERATING_ANSWER && '生成参考答案...'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}