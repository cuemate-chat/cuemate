import { useState } from 'react';
import { InterviewerWindowBody } from './components/InterviewerWindowBody';
import { InterviewerWindowFooter } from './components/InterviewerWindowFooter';
import { InterviewerWindowHeader } from './components/InterviewerWindowHeader';

export function InterviewerApp() {
  const [isRecording, setIsRecording] = useState(false);
  const [selectedModel, setSelectedModel] = useState('Default');

  const handleStartRecording = () => {
    setIsRecording(true);
    // TODO: 实现语音识别功能
    console.log('开始语音识别');
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    // TODO: 停止语音识别
    console.log('停止语音识别');
  };


  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    console.log('Model changed to:', model);
  };

  const handleTranscriptToggle = () => {
    console.log('Toggle transcript');
  };

  return (
    <div className="interviewer-app">
      <div className="interviewer-window">
        <InterviewerWindowHeader 
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
          onTranscriptToggle={handleTranscriptToggle}
        />
        <InterviewerWindowBody />
        <InterviewerWindowFooter
          isRecording={isRecording}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
        />
      </div>
    </div>
  );
}
