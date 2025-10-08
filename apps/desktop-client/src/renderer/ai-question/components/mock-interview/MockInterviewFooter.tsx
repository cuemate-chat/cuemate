import * as Tooltip from '@radix-ui/react-tooltip';
import { CornerDownLeft } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { startMicrophoneRecognition, type MicrophoneRecognitionController } from '../../../../utils/audioRecognition';
import { setMockInterviewState, useMockInterviewState } from '../../../utils/mockInterviewState';
import { VoiceCoordinator } from './voice/VoiceCoordinator';

interface WindowFooterProps {
  interviewId?: string; // 当前面试ID
  onResponseComplete: () => void; // 回答完毕回调
  className?: string;
}

// 闪烁圆圈组件，类似面试官头像但无小人图标
function FlashingCircle({ isActive }: { isActive: boolean }) {
  return (
    <div className={`voice-circle ${isActive ? 'active' : ''}`}>
      <div className="circle-inner" />
      <div className="circle-wave" />
      <div className="circle-wave-2" />
    </div>
  );
}

export function MockInterviewFooter({
  interviewId,
  onResponseComplete,
  className
}: WindowFooterProps) {
  const speechRef = useRef<HTMLSpanElement>(null);
  const recognitionController = useRef<MicrophoneRecognitionController | null>(null);
  const voiceCoordinator = useRef<VoiceCoordinator | null>(null);

  // 使用跨窗口状态
  const mockInterviewState = useMockInterviewState();

  // 只有存在interviewId才显示数据,否则显示空白
  const speechText = interviewId ? mockInterviewState.speechText : '';
  const isLoading = interviewId ? mockInterviewState.isLoading : false;
  const isListening = interviewId ? mockInterviewState.isListening : false;
  // isAutoMode 是用户偏好设置,始终显示真实值,不依赖 interviewId
  const isAutoMode = mockInterviewState.isAutoMode;

  // 初始化 VoiceCoordinator
  useEffect(() => {
    const initVoiceCoordinator = async () => {
      try {
        voiceCoordinator.current = new VoiceCoordinator({
          silenceThreshold: 5000,
          volumeThreshold: 0.01,
          ttsDelay: 500,
          autoEndTimeout: 5000,
        });

        await voiceCoordinator.current.initialize();

        // 监听用户开始说话
        voiceCoordinator.current.addEventListener('userStartedSpeaking', (() => {
          // 用户开始说话,无需额外处理,已经在 isListening 状态中
        }) as EventListener);

        // 监听用户说话结束(自动模式)
        voiceCoordinator.current.addEventListener('userFinishedSpeaking', ((_event: CustomEvent) => {
          if (isAutoMode) {
            // 自动模式下,静音5秒后自动触发回答完成
            onResponseComplete();
            // 停止监听,保留 speechText 供状态机使用
            setMockInterviewState({ isListening: false });
          }
        }) as EventListener);

      } catch (error) {
        console.error('Failed to initialize VoiceCoordinator:', error);
      }
    };

    initVoiceCoordinator();

    return () => {
      if (voiceCoordinator.current) {
        voiceCoordinator.current.destroy();
      }
    };
  }, []);

  // 自动滚动到最新内容
  useEffect(() => {
    if (speechRef.current) {
      speechRef.current.scrollLeft = speechRef.current.scrollWidth;
    }
  }, [speechText]);

  // 监听 isListening 状态,启动/停止语音识别和音量检测
  useEffect(() => {
    const startRecognition = async () => {
      if (isListening && !recognitionController.current) {
        try {
          // 获取麦克风设备ID
          const api: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
          const res = await api?.asrConfig?.get?.();
          const micDeviceId = res?.config?.microphone_device_id;

          // 启动 VoiceCoordinator 音量检测
          if (voiceCoordinator.current?.canStartASR()) {
            voiceCoordinator.current.startASRListening();
          }

          // 启动语音识别
          const controller = await startMicrophoneRecognition({
            deviceId: micDeviceId,
            initialText: speechText || '',
            onText: (text) => {
              // 更新跨窗口状态
              setMockInterviewState({ speechText: text });
            },
            onError: () => {
              setMockInterviewState({ speechText: '', isListening: false });
            },
          });
          recognitionController.current = controller;
        } catch (error) {
          console.error('启动语音识别失败:', error);
          setMockInterviewState({ isListening: false });
        }
      } else if (!isListening && recognitionController.current) {
        // 停止 VoiceCoordinator
        if (voiceCoordinator.current) {
          voiceCoordinator.current.stopASRListening();
        }

        // 停止语音识别
        try {
          await recognitionController.current.stop();
        } catch (error) {
          console.error('停止语音识别失败:', error);
        }
        recognitionController.current = null;
      }
    };

    startRecognition();

    // 清理函数
    return () => {
      if (recognitionController.current) {
        recognitionController.current.stop().catch(console.error);
        recognitionController.current = null;
      }
    };
  }, [isListening, isAutoMode]);

  return (
    <div className={`ai-window-footer${className ? ` ${className}` : ''}`}>
      {/* 语音识别内容显示区域 */}
      <div className="speech-display-container">
        <FlashingCircle isActive={isListening} />
        <span
          ref={speechRef}
          className="speech-text"
        >
          {speechText || '等待语音输入...'}
        </span>
      </div>

      {/* 右侧控制按钮 */}
      <div className="control-actions">
        {/* 自动/手动切换开关 */}
        <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                className={`mode-toggle ${isAutoMode ? 'auto' : 'manual'}`}
                onClick={() => setMockInterviewState({ isAutoMode: !isAutoMode })}
              >
                <span className="toggle-text">{isAutoMode ? '自动' : '手动'}</span>
                <div className="toggle-switch">
                  <div className="toggle-handle" />
                </div>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
              {isAutoMode ? '切换到手动模式' : '切换到自动模式'}
              <Tooltip.Arrow className="radix-tooltip-arrow" />
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>

        {/* 回答完毕按钮 */}
        <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                onClick={() => {
                  // 手动模式下点击"回答完毕"
                  onResponseComplete();
                  // 停止监听,保留 speechText 供状态机使用
                  setMockInterviewState({ isListening: false });
                }}
                disabled={isAutoMode || isLoading}
                className="response-complete-btn"
              >
                <span className="response-text">回答完毕</span>
                <CornerDownLeft size={16} />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
              {isAutoMode ? '自动模式下不可用' : '标记当前回答完毕'}
              <Tooltip.Arrow className="radix-tooltip-arrow" />
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
    </div>
  );
}