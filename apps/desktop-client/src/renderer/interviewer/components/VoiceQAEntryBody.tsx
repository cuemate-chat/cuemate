
interface VoiceQAEntryBodyProps {
  onStart?: () => void;
}

export function VoiceQAEntryBody({ onStart }: VoiceQAEntryBodyProps) {
  return (
    <div className="interviewer-mode-panel">
      <h4 className="test-section-title">语音提问</h4>
      <div className="interviewer-mode-content">
        <p className="interviewer-mode-desc">通过语音与 AI 进行问答交互，实时获得回答。</p>
        <div className="interviewer-mode-actions">
          <button className="test-button" onClick={onStart}>开始语音提问</button>
        </div>
      </div>
    </div>
  );
}


