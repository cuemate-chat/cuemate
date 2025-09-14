import { useState } from 'react';
import { InterviewerWindowBody } from './components/InterviewerWindowBody';
import { InterviewerWindowFooter } from './components/InterviewerWindowFooter';
import { InterviewerWindowHeader } from './components/InterviewerWindowHeader';

export function InterviewerApp() {
  const [isRecording, setIsRecording] = useState(false);
  const [selectedModel, setSelectedModel] = useState('Default');
  const [isRecognizing, setIsRecognizing] = useState(false); // 新增状态

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

  // 新增：处理语音识别测试
  const handleStartTesting = () => {
    setIsRecognizing(true);
    console.log('开始语音识别测试');
  };

  const handleStopTesting = () => {
    setIsRecognizing(false);
    console.log('停止语音识别测试');
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
          isRecognizing={isRecognizing}
        />
        <InterviewerWindowBody 
          onStartTesting={handleStartTesting}
          onStopTesting={handleStopTesting}
        />
        <InterviewerWindowFooter
          isRecording={isRecording}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          isRecognizing={isRecognizing}
        />
      </div>
    </div>
  );
}
