
interface MockInterviewEntryBodyProps {
  onStart?: () => void;
}

export function MockInterviewEntryBody({ onStart }: MockInterviewEntryBodyProps) {
  return (
    <div className="interviewer-mode-panel">
      <h4 className="test-section-title">模拟面试</h4>
      <div className="interviewer-mode-content">
        <p className="interviewer-mode-desc">进入模拟面试场景，AI 扮演面试官进行问答。</p>
        <div className="interviewer-mode-actions">
          <button className="test-button" onClick={onStart}>开始模拟面试</button>
        </div>
      </div>
    </div>
  );
}


