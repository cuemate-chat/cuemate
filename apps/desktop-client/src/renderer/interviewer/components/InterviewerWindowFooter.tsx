import { Mic, MicOff } from 'lucide-react';

interface InterviewerWindowFooterProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export function InterviewerWindowFooter({ 
  isRecording, 
  onStartRecording, 
  onStopRecording 
}: InterviewerWindowFooterProps) {
  return (
    <div className="interviewer-window-footer">
      <div className="interviewer-controls">
        {!isRecording ? (
          <button 
            className="interviewer-control-btn"
            onClick={onStartRecording}
          >
            <Mic size={16} />
            <span className="interviewer-control-btn-text">开始识别</span>
          </button>
        ) : (
          <button 
            className="interviewer-control-btn"
            onClick={onStopRecording}
          >
            <MicOff size={16} />
            <span className="interviewer-control-btn-text">停止识别</span>
          </button>
        )}
      </div>
    </div>
  );
}
