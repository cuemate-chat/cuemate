import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';
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
  return (
    <div className="interviewer-window-footer">
      <div className="interviewer-controls">
        {isRecognizing ? (
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
        ) : (
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
                    <Mic size={16} />
                    <span>暂未开始</span>
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content className="radix-tooltip-content">
                    点击按钮开始语音识别
                    <Tooltip.Arrow className="radix-tooltip-arrow" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          </div>
        )}
      </div>
    </div>
  );
}
