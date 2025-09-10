import { useState } from 'react';
import { InterviewerWindowBody } from './components/InterviewerWindowBody';
import { InterviewerWindowFooter } from './components/InterviewerWindowFooter';
import { InterviewerWindowHeader } from './components/InterviewerWindowHeader';

export function InterviewerApp() {
  const [isRecording, setIsRecording] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const handleStartRecording = () => {
    setIsRecording(true);
    // TODO: 实现语音识别功能
    console.log('开始语音识别');
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setHasResults(true);
    // TODO: 停止语音识别
    console.log('停止语音识别');
    // 添加示例结果
    setResults(['这是语音识别的示例结果文本']);
  };

  const handleClearResults = () => {
    setHasResults(false);
    setResults([]);
  };

  const handleClose = async () => {
    try {
      (window as any).electronInterviewerAPI?.closeSelf?.();
    } catch {}
  };

  return (
    <div className="interviewer-app">
      <div className="interviewer-window">
        <InterviewerWindowHeader 
          onClose={handleClose}
          onClearResults={handleClearResults}
        />
        <InterviewerWindowBody 
          hasResults={hasResults}
          results={results}
        />
        <InterviewerWindowFooter
          isRecording={isRecording}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
        />
      </div>
    </div>
  );
}
