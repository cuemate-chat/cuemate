import { useState } from 'react';
import { clearVoiceState } from '../../utils/voiceState';
import { InterviewerWindowBody } from './components/InterviewerWindowBody';
import { InterviewerWindowFooter } from './components/InterviewerWindowFooter';
import { InterviewerWindowHeader } from './components/InterviewerWindowHeader';

export function InterviewerApp() {
  const [currentSectionTitle, setCurrentSectionTitle] = useState<string | null>(null);

  const handleClose = async () => {
    try {
      await (window as any).electronAPI?.hideInterviewer?.();
    } catch {}
    clearVoiceState();
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
    // 返回上一页时不关闭右侧窗口，只是重置当前选择的section
    setCurrentSectionTitle(null);
    clearVoiceState();
  };

  return (
    <div className="interviewer-app">
      <div className="interviewer-window" key={currentSectionTitle || 'home'}>
        <InterviewerWindowHeader
          currentSectionTitle={currentSectionTitle}
          onClose={handleClose}
          onBack={currentSectionTitle ? handleBack : undefined}
        />
        <InterviewerWindowBody 
          selectedCard={currentSectionTitle}
          onSelectCard={handleSelectCard}
        />
        <InterviewerWindowFooter />
      </div>
    </div>
  );
}
