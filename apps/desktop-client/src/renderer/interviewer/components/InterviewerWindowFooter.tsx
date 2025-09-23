import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { CheckCircle, Mic, Pause } from 'lucide-react';
import { LottieAudioLines } from '../../shared/components/LottieAudioLines';
import { useVoiceState } from '../../../utils/voiceState';

interface InterviewerWindowFooterProps {
  // 保留接口定义以避免破坏现有调用
  onStartRecording?: () => void;
  onStopRecording?: () => void;
}

export function InterviewerWindowFooter({}: InterviewerWindowFooterProps) {
  const globalState = useVoiceState();
  return (
    <div className="interviewer-window-footer">
      <div className="interviewer-controls">
        {(() => {
          // 分类显示逻辑：
          // idle/paused/completed 显示文字+图标
          // 其他所有状态 (recording/playing/voice-testing/voice-speaking) 显示 LottieAudioLines
          const shouldShowLottie =
            globalState.subState !== 'idle' &&
            globalState.subState !== 'paused' &&
            globalState.subState !== 'completed';

          if (shouldShowLottie) {
            return (
              <div className="interviewer-equalizer-container" style={{ color: 'white' }}>
                <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <LottieAudioLines
                          size={196}
                          src="/src/assets/MusicVisualizer.gif"
                          alt="Music Waves"
                        />
                      </motion.div>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content className="radix-tooltip-content">
                        {
                          globalState.subState === 'voice-testing' ? '语音测试中...' :
                          globalState.subState === 'voice-speaking' ? '按住说话中...' :
                          globalState.subState === 'recording' ? '录制中...' :
                          globalState.subState === 'playing' ? '播放中...' :
                          '语音处理中...'
                        }
                        <Tooltip.Arrow className="radix-tooltip-arrow" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </div>
            );
          }

          // idle/paused/completed 显示文字+图标
          let statusText = '暂未开始';
          let tooltipText = '点击按钮开始语音识别';
          let IconComponent = Mic;

          switch (globalState.subState) {
            case 'paused':
              statusText = '暂停中';
              tooltipText = '录制已暂停';
              IconComponent = Pause;
              break;
            case 'completed':
              statusText = '已完成';
              tooltipText = '录制已完成';
              IconComponent = CheckCircle;
              break;
            case 'idle':
            default:
              statusText = '暂未开始';
              tooltipText = '点击按钮开始语音识别';
              IconComponent = Mic;
              break;
          }

          return (
            <div className="interviewer-equalizer-container" style={{
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%'
            }}>
              <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: '4px',
                      color: 'white',
                      fontSize: '12px'
                    }}>
                      <IconComponent size={16} />
                      <span>{statusText}</span>
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content className="radix-tooltip-content">
                      {tooltipText}
                      <Tooltip.Arrow className="radix-tooltip-arrow" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
