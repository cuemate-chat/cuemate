
interface InterviewTrainingEntryBodyProps {
  onStart?: () => void;
}

export function InterviewTrainingEntryBody({ onStart }: InterviewTrainingEntryBodyProps) {

  return (
    <div className="interviewer-mode-panel">
        <div className="interviewer-top interviewer-top-card">
        <div className="interviewer-left interviewer-avatar-block">
          <div className="interviewer-avatar">
            <div className="ripple" />
            <div className="ripple ripple2" />
            <div className="avatar-circle">
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="28" cy="20" r="10" stroke="rgba(255,255,255,0.9)" strokeWidth="2" fill="rgba(255,255,255,0.15)" />
                <path d="M8 50c0-9 9-16 20-16s20 7 20 16" stroke="rgba(255,255,255,0.9)" strokeWidth="2" fill="rgba(255,255,255,0.08)" />
              </svg>
            </div>
          </div>
          <div className="avatar-label">面试官</div>
        </div>
        <div className="interviewer-right interviewer-controls-column">
          {onStart && (
            <button className="test-button" onClick={onStart}>开始面试训练</button>
          )}
        </div>
      </div>

    </div>
  );
}



