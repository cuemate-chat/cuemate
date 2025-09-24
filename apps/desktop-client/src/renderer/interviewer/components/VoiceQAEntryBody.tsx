import * as Tooltip from '@radix-ui/react-tooltip';
import { Mic, Square } from 'lucide-react';
import { useEffect } from 'react';
import { setVoiceState, useVoiceState } from '../../../utils/voiceState';
import { startVoiceQA, stopVoiceQA, useVoiceQAState } from '../../utils/voiceQA';

interface VoiceQAEntryBodyProps {}

export function VoiceQAEntryBody({}: VoiceQAEntryBodyProps) {
  const qa = useVoiceQAState();
  const vState = useVoiceState();
  const isRecording = vState.mode === 'voice-qa' && vState.subState === 'voice-speaking';

  useEffect(() => {
  }, []);

  return (
    <div className="interviewer-mode-panel">
      <div className="interviewer-mode-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  className={`ai-voice-btn ${isRecording ? 'recording' : ''}`}
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
                      <Square size={16} />
                      <span>停止说话</span>
                    </>
                  ) : (
                    <>
                      <Mic size={16} />
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

        {(qa.confirmedText || qa.tempText) && (
          <div className="recognition-result" style={{ marginTop: 10 }}>
            <div className="recognized-text">
              {qa.confirmedText}
              {qa.tempText && (qa.confirmedText ? ' ' : '')}
              {qa.tempText}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


