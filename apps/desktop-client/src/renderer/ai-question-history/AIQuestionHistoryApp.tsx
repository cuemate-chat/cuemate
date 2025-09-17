import React, { useState } from 'react';
import { VoiceQAHistoryApp } from './components/voice-qa/VoiceQAHistoryApp.tsx';
import { MockInterviewHistoryApp } from './components/mock-interview/MockInterviewHistoryApp.tsx';
import { InterviewTrainingHistoryApp } from './components/interview-training/InterviewTrainingHistoryApp.tsx';

export function AIQuestionHistoryApp() {
  const [currentMode, setCurrentMode] = useState<'voice-qa' | 'mock-interview' | 'interview-training'>('voice-qa');

  // 监听模式切换事件
  React.useEffect(() => {
    const handleModeChange = (mode: 'voice-qa' | 'mock-interview' | 'interview-training') => {
      setCurrentMode(mode);
    };

    if ((window as any).electronHistoryAPI?.onModeChange) {
      (window as any).electronHistoryAPI.onModeChange(handleModeChange);
    }

    return () => {
      if ((window as any).electronHistoryAPI?.removeModeChangeListener) {
        (window as any).electronHistoryAPI.removeModeChangeListener();
      }
    };
  }, []);

  // 根据模式渲染不同的组件
  switch (currentMode) {
    case 'voice-qa':
      return <VoiceQAHistoryApp />;
    case 'mock-interview':
      return <MockInterviewHistoryApp />;
    case 'interview-training':
      return <InterviewTrainingHistoryApp />;
    default:
      return <VoiceQAHistoryApp />;
  }
}