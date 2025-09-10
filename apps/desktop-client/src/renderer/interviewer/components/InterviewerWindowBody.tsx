import { Mic } from 'lucide-react';

interface InterviewerWindowBodyProps {
  hasResults: boolean;
  results: string[];
}

export function InterviewerWindowBody({ hasResults, results }: InterviewerWindowBodyProps) {
  return (
    <div className="interviewer-window-body">
      {!hasResults ? (
        <div className="interviewer-empty-state">
          <div className="interviewer-empty-icon">
            <Mic size={48} />
          </div>
          <div className="interviewer-empty-title">
            语音识别
          </div>
          <div className="interviewer-empty-description">
            点击开始按钮开始语音识别，系统将实时转换您的语音为文字
          </div>
        </div>
      ) : (
        <div className="interviewer-results">
          {results.map((result, index) => (
            <div key={index} className="interviewer-result-item">
              <div className="interviewer-result-content">
                <div className="interviewer-result-text">
                  {result}
                </div>
                <div className="interviewer-result-timestamp">
                  {new Date().toLocaleString('zh-CN')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
