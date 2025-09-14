import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { LottieAudioLines } from '../../shared/components/LottieAudioLines';

interface InterviewerWindowFooterProps {
  // 保留接口定义以避免破坏现有调用
  isRecording?: boolean;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  isRecognizing?: boolean; // 新增状态字段
}

export function InterviewerWindowFooter({ 
  isRecognizing = false 
}: InterviewerWindowFooterProps) {
  // 只有在语音识别时才显示
  if (!isRecognizing) {
    return null;
  }

  return (
    <div className="interviewer-window-footer">
      <div className="interviewer-controls">
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
                  语音识别中...
                  <Tooltip.Arrow className="radix-tooltip-arrow" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
      </div>
    </div>
  );
}
