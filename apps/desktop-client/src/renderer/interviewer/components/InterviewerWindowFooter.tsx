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
          // idle 以及 *_end / *_completed 等结束态显示文字+图标
          // 其他进行中状态显示 LottieAudioLines
          const shouldShowLottie =
            globalState.subState !== 'idle' &&
            globalState.subState !== 'voice-mic-end' &&
            globalState.subState !== 'voice-speak-end' &&
            globalState.subState !== 'voice-end' &&
            globalState.subState !== 'mock-interview-completed' &&
            globalState.subState !== 'interview-training-completed';

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
                        {(() => {
                          switch (globalState.subState) {
                            case 'voice-mic-testing': return '麦克风测试中...';
                            case 'voice-speak-testing': return '扬声器测试中...';
                            case 'voice-speaking': return '按住说话中...';
                            case 'mock-interview-recording':
                            case 'interview-training-recording':
                              return '录制中...';
                            case 'mock-interview-playing':
                            case 'interview-training-playing':
                              return '播放中...';
                            default:
                              return '语音处理中...';
                          }
                        })()}
                        <Tooltip.Arrow className="radix-tooltip-arrow" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </div>
            );
          }

          // idle 以及 *_end / *_completed 显示文字+图标
          let statusText = '暂未开始';
          let tooltipText = '点击按钮开始语音识别';
          let IconComponent = Mic;

          switch (globalState.subState) {
            case 'voice-mic-end':
              statusText = '麦克风测试完成';
              tooltipText = '麦克风语音测试完成';
              IconComponent = CheckCircle;
              break;
            case 'voice-speak-end':
              statusText = '扬声器测试完成';
              tooltipText = '扬声器语音测试完成';
              IconComponent = CheckCircle;
              break;
            case 'voice-end':
              statusText = 'AI 语音提问完成';
              tooltipText = '语音提问已完成';
              IconComponent = CheckCircle;
              break;
            case 'mock-interview-paused':
            case 'interview-training-paused':
              statusText = '暂停中';
              tooltipText = '录制已暂停';
              IconComponent = Pause;
              break;
            case 'mock-interview-completed':
              statusText = '模拟面试录制完成';
              tooltipText = '模拟面试录制已完成';
              IconComponent = CheckCircle;
              break;
            case 'interview-training-completed':
              statusText = '面试训练录制完成';
              tooltipText = '面试训练录制已完成';
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
