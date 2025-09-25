import * as Tooltip from '@radix-ui/react-tooltip';
import { Mic, Square } from 'lucide-react';
import { useEffect } from 'react';
import { setVoiceState, useVoiceState } from '../../../utils/voiceState';
import { startVoiceQA, stopVoiceQA, useVoiceQAState, clearVoiceQAState } from '../../utils/voiceQA';

interface VoiceQAEntryBodyProps {}

export function VoiceQAEntryBody({}: VoiceQAEntryBodyProps) {
  const qa = useVoiceQAState();
  const vState = useVoiceState();
  const isRecording = vState.mode === 'voice-qa' && vState.subState === 'voice-speaking';

  useEffect(() => {
    // 组件初始化时清除缓存的语音文本，保持与 VoiceQAFooter 一致
    clearVoiceQAState();
  }, []);

  return (
    <div className="interviewer-mode-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="interviewer-mode-content" style={{ flex: 1, padding: '16px' }}>
        {(qa.confirmedText || qa.tempText) && (
          <div className="recognition-result">
            <div className="recognized-text">
              {/* audioRecognition.ts 已经处理了文本叠加，直接显示确认的文本和临时文本 */}
              {qa.confirmedText}
              {qa.tempText && (qa.confirmedText ? ' ' : '')}
              {qa.tempText}
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
                onClick={async () => {
                  if (!isRecording) {
                    let micDeviceId: string | undefined = undefined;
                    try {
                      const electronAPI: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
                      const res = await electronAPI?.asrConfig?.get?.();
                      micDeviceId = res?.config?.microphone_device_id || undefined;
                    } catch {}
                    await startVoiceQA(micDeviceId, qa.confirmedText);
                    setVoiceState({ mode: 'voice-qa', subState: 'voice-speaking' });
                  } else {
                    await stopVoiceQA();
                    setVoiceState({ mode: 'voice-qa', subState: 'voice-end' });
                  }
                }}
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


