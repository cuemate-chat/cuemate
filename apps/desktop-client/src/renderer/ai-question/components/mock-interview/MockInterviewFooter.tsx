import * as Tooltip from '@radix-ui/react-tooltip';
import { CornerDownLeft } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createLogger } from '../../../../utils/rendererLogger.js';
import { startMicrophoneRecognition } from '../../../../utils/audioRecognition';

const log = createLogger('MockInterviewFooter');
import {
  destroyMicrophone,
  getMicrophoneController,
  getVoiceCoordinator,
  initVoiceCoordinator,
  startMicrophone,
} from '../../../utils/audioManager';
import { setMockInterviewState, useMockInterviewState } from '../../../utils/mockInterviewState';
import { VoiceCoordinator } from '../shared/voice/VoiceCoordinator';

interface WindowFooterProps {
  interviewId?: string; // 当前面试 ID
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

  // 使用跨窗口状态
  const mockInterviewState = useMockInterviewState();

  // 使用 ref 保存最新的回调和状态，避免闭包陷阱
  const isAutoModeRef = useRef(mockInterviewState.isAutoMode);
  const onResponseCompleteRef = useRef(onResponseComplete);

  // 保持 ref 与最新值同步
  useEffect(() => {
    isAutoModeRef.current = mockInterviewState.isAutoMode;
  }, [mockInterviewState.isAutoMode]);

  useEffect(() => {
    onResponseCompleteRef.current = onResponseComplete;
  }, [onResponseComplete]);

  // 只有存在 interviewId 才显示数据,否则显示空白
  const speechText = interviewId ? mockInterviewState.speechText : '';
  const isLoading = interviewId ? mockInterviewState.isLoading : false;
  // isAutoMode 是用户偏好设置,始终显示真实值,不依赖 interviewId
  const isAutoMode = mockInterviewState.isAutoMode;
  // 面试状态
  const interviewState = mockInterviewState.interviewState;
  // 是否正在提交/分析中
  const isSubmitting = interviewState === 'ai_analyzing';

  // 【关键修复】只有当状态机真正进入 USER_LISTENING 或 USER_SPEAKING 状态时，才启动录音
  // 这样可以避免状态更新的时序竞争导致在 AI_SPEAKING 阶段就开始录音
  const isListening = interviewId
    ? mockInterviewState.isListening &&
      (interviewState === 'user_listening' || interviewState === 'user_speaking')
    : false;

  // 初始化 VoiceCoordinator（只初始化一次，使用全局管理器）
  useEffect(() => {
    const initCoordinator = async () => {
      // 检查是否已经初始化
      if (getVoiceCoordinator('mock-interview')) {
        log.debug('initCoordinator', 'VoiceCoordinator 已存在，跳过初始化');
        return;
      }

      try {
        const coordinator = new VoiceCoordinator({
          silenceThreshold: 5000,
          volumeThreshold: 0.01,
          ttsDelay: 500,
          autoEndTimeout: 5000,
        });

        await coordinator.initialize();

        // 监听用户开始说话
        coordinator.addEventListener('userStartedSpeaking', (() => {
          // 用户开始说话,无需额外处理,已经在 isListening 状态中
        }) as EventListener);

        // 监听用户说话结束(自动模式)
        coordinator.addEventListener('userFinishedSpeaking', ((_event: CustomEvent) => {
          // 使用 ref 获取最新值，避免闭包陷阱
          if (isAutoModeRef.current) {
            // 自动模式下,静音 5 秒后自动触发回答完成
            log.debug('userFinishedSpeaking', '自动模式检测到用户说话结束，触发回答完成');
            onResponseCompleteRef.current();
            // 停止监听,保留 speechText 供状态机使用
            setMockInterviewState({ isListening: false });
          }
        }) as EventListener);

        // 初始化到全局管理器
        initVoiceCoordinator('mock-interview', coordinator);

      } catch (error) {
        log.error('initCoordinator', 'VoiceCoordinator 初始化失败', undefined, error);
      }
    };

    initCoordinator();

    return () => {
      // 不清理 VoiceCoordinator，让 audioManager 管理
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
      if (isListening && !getMicrophoneController('mock-interview')) {
        try {
          // 获取麦克风设备 ID
          const api: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
          const res = await api?.asrConfig?.get?.();
          const micDeviceId = res?.config?.microphone_device_id;

          // 启动 VoiceCoordinator 音量检测
          const coordinator = getVoiceCoordinator('mock-interview');
          if (coordinator?.canStartASR()) {
            coordinator.startASRListening();
          }

          // 启动语音识别（每次从空开始，不继承旧文本）
          const controller = await startMicrophoneRecognition({
            deviceId: micDeviceId,
            initialText: '',
            onText: (text) => {
              // 更新跨窗口状态
              setMockInterviewState({ speechText: text });
            },
            onError: () => {
              setMockInterviewState({ speechText: '', isListening: false });
            },
          });

          // 设置到全局管理器
          await startMicrophone('mock-interview', controller);

        } catch (error) {
          log.error('startRecognition', '启动语音识别失败', undefined, error);
          setMockInterviewState({ isListening: false });
        }
      } else if (!isListening && getMicrophoneController('mock-interview')) {
        // 停止 VoiceCoordinator
        const coordinator = getVoiceCoordinator('mock-interview');
        if (coordinator) {
          coordinator.stopASRListening();
        }

        // 销毁麦克风控制器（从 Map 中删除，以便下次 isListening 变为 true 时重新创建）
        await destroyMicrophone('mock-interview');
      }
    };

    startRecognition();

    // 清理函数
    return () => {
      // 不清理任何东西，让 audioManager 管理
    };
  }, [isListening, isAutoMode]);

  return (
    <div className={`ai-window-footer${className ? ` ${className}` : ''}`}>
      {/* 语音识别内容显示区域 */}
      <div className="speech-display-container">
        <FlashingCircle isActive={isListening} />
        <span
          ref={speechRef}
          className={`speech-text${isSubmitting ? ' submitting' : ''}`}
        >
          {isSubmitting ? '已提交本次回答，面试官分析中...' : (speechText || '等待语音输入...')}
        </span>
      </div>

      {/* 右侧控制按钮 */}
      <div className="control-actions">
        {/* 当前模式显示（只读，面试进行中不可切换） */}
        <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <div className={`mode-toggle ${isAutoMode ? 'auto' : 'manual'} disabled`}>
                <span className="toggle-text">{isAutoMode ? '自动' : '手动'}</span>
                <div className="toggle-switch">
                  <div className="toggle-handle" />
                </div>
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
              面试进行中无法切换模式
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
                disabled={isAutoMode || isLoading || !speechText || isSubmitting}
                className={`response-complete-btn${isSubmitting ? ' submitting' : ''}`}
              >
                <span className="response-text">{isSubmitting ? '提交中...' : '回答完毕'}</span>
                <CornerDownLeft size={16} />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
              {isSubmitting ? '正在分析您的回答...' : (isAutoMode ? '自动模式下不可用' : '标记当前回答完毕')}
              <Tooltip.Arrow className="radix-tooltip-arrow" />
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
    </div>
  );
}