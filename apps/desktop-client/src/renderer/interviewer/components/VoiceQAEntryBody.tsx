import * as Tooltip from '@radix-ui/react-tooltip';
import { Mic, Square } from 'lucide-react';
import { useVoiceState } from '../../../utils/voiceState';

interface VoiceQAEntryBodyProps {
  question: string;
  onVoiceToggle: () => void;
}

export function VoiceQAEntryBody({ question, onVoiceToggle }: VoiceQAEntryBodyProps) {
  const vState = useVoiceState();
  const isRecording = vState.mode === 'voice-qa' && vState.subState === 'voice-speaking';

  return (
    <div className="interviewer-mode-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="interviewer-mode-content" style={{ flex: 1, padding: '16px' }}>
        {question && (
          <div className="recognition-result">
            <div className="recognized-text">
              {question}
            </div>
          </div>
        )}
      </div>

      {/* 底部语音按钮 - 类似微信样式 */}
      <div style={{ padding: '16px', position: 'relative', zIndex: 10 }}>
        <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                className={`ai-voice-btn ${isRecording ? 'recording' : ''}`}
                style={{
                  width: '100%',
                  height: '48px',
                  border: '1px solid rgba(52, 152, 219, 0.3)',
                  borderRadius: '24px',
                  backgroundColor: isRecording ? 'rgba(255, 59, 48, 0.3)' : 'rgba(52, 152, 219, 0.3)',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onClick={onVoiceToggle}
              >
                {isRecording ? (
                  <>
                    <Square size={20} />
                    <span>停止说话</span>
                  </>
                ) : (
                  <>
                    <Mic size={20} />
                    <span>按住说话</span>
                  </>
                )}
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
              {isRecording ? '点击停止说话' : '点击开始说话'}
              <Tooltip.Arrow className="radix-tooltip-arrow" />
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
    </div>
  );
}


