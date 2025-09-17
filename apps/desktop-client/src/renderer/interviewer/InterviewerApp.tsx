import { useState } from 'react';
import { InterviewerWindowBody } from './components/InterviewerWindowBody';
import { InterviewerWindowFooter } from './components/InterviewerWindowFooter';
import { InterviewerWindowHeader } from './components/InterviewerWindowHeader';

export function InterviewerApp() {
  const [isRecording, setIsRecording] = useState(false);
  const [selectedModel, setSelectedModel] = useState('Default');
  const [isRecognizing] = useState(false);

  const handleStartRecording = () => {
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
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
        <InterviewerWindowBody />
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
