
interface InterviewTrainingEntryBodyProps {
  onStart?: () => void;
}

export function InterviewTrainingEntryBody({ onStart }: InterviewTrainingEntryBodyProps) {
  return (
    <div className="interviewer-mode-panel">
      <h4 className="test-section-title">面试训练</h4>
      <div className="interviewer-mode-content">
        <p className="interviewer-mode-desc">系统化训练模块，按训练计划逐步提升面试能力。</p>
        <div className="interviewer-mode-actions">
          <button className="test-button" onClick={onStart}>开始面试训练</button>
        </div>
      </div>
    </div>
  );
}


