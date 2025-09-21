import { useState } from 'react';
import { InterviewerWindowBody } from './components/InterviewerWindowBody';
import { InterviewerWindowFooter } from './components/InterviewerWindowFooter';
import { InterviewerWindowHeader } from './components/InterviewerWindowHeader';

export function InterviewerApp() {
  const [isRecording, setIsRecording] = useState(false);
  const [isRecognizing] = useState(false);
  const [currentSectionTitle, setCurrentSectionTitle] = useState<string | null>(null);

  const handleStartRecording = () => {
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  const handleClose = async () => {
    try {
      await (window as any).electronAPI?.hideInterviewer?.();
    } catch {}
  };

  const handleSelectCard = async (title: string) => {
    setCurrentSectionTitle(title);
    try {
      if ((window as any).electronAPI) {
        if (title === '语音提问') {
          await (window as any).electronAPI.switchToMode('voice-qa');
          await (window as any).electronAPI.showAIQuestion();
        } else if (title === '模拟面试') {
          await (window as any).electronAPI.switchToMode('mock-interview');
          await (window as any).electronAPI.showAIQuestion();
        } else if (title === '面试训练') {
          await (window as any).electronAPI.switchToMode('interview-training');
          await (window as any).electronAPI.showAIQuestion();
        }
      }
    } catch (error) {
      console.error('进入模式失败:', error);
    }
  };

  const handleBack = async () => {
    try {
      if ((window as any).electronAPI) {
        if (currentSectionTitle === '语音提问' || currentSectionTitle === '模拟面试' || currentSectionTitle === '面试训练') {
          await (window as any).electronAPI.hideAIQuestion();
        }
      }
    } catch (error) {
      console.error('返回上一页时隐藏AI问题窗口失败:', error);
    }
    setCurrentSectionTitle(null);
  };

  return (
    <div className="interviewer-app">
      <div className="interviewer-window" key={currentSectionTitle || 'home'}>
        <InterviewerWindowHeader 
          isRecognizing={isRecognizing}
          currentSectionTitle={currentSectionTitle}
          onClose={handleClose}
          onBack={currentSectionTitle ? handleBack : undefined}
        />
        <InterviewerWindowBody 
          selectedCard={currentSectionTitle}
          onSelectCard={handleSelectCard}
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
