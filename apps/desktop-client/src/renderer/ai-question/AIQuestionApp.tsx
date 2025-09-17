import React, { useState } from 'react';
import { InterviewTrainingApp } from './components/interview-training/InterviewTrainingApp.tsx';
import { MockInterviewApp } from './components/mock-interview/MockInterviewApp.tsx';
import { VoiceQAApp } from './components/voice-qa/VoiceQAApp.tsx';

export function AIQuestionApp() {
  const [currentMode, setCurrentMode] = useState<'voice-qa' | 'mock-interview' | 'interview-training'>('voice-qa');

  // 监听模式切换事件
  React.useEffect(() => {
    const handleModeChange = (mode: 'voice-qa' | 'mock-interview' | 'interview-training') => {
      setCurrentMode(mode);
    };

    if ((window as any).electronAPI?.onModeChange) {
      (window as any).electronAPI.onModeChange(handleModeChange);
    }

    return () => {
      if ((window as any).electronAPI?.removeModeChangeListener) {
        (window as any).electronAPI.removeModeChangeListener();
      }
    };
  }, []);

  // 根据模式渲染不同的组件
  switch (currentMode) {
    case 'voice-qa':
      return <VoiceQAApp />;
    case 'mock-interview':
      return <MockInterviewApp />;
    case 'interview-training':
      return <InterviewTrainingApp />;
    default:
      return <VoiceQAApp />;
  }
}