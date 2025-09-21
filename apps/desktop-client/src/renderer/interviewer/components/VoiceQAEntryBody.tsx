
interface VoiceQAEntryBodyProps {}

export function VoiceQAEntryBody({}: VoiceQAEntryBodyProps) {
  return (
    <div className="interviewer-mode-panel">
      <h4 className="test-section-title">语音提问</h4>
      <div className="interviewer-mode-content">
        <p className="interviewer-mode-desc">请点击右侧提问 AI 窗口里的按住说话按钮，通过语音与 AI 进行问答交互，实时获得回答。</p>
      </div>
    </div>
  );
}


