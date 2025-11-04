import React, { useState } from 'react';
import { InterviewTrainingApp } from './components/interview-training/InterviewTrainingApp.tsx';
import { MockInterviewApp } from './components/mock-interview/MockInterviewApp.tsx';
import { VoiceQAApp } from './components/voice-qa/VoiceQAApp.tsx';

export function AIQuestionApp() {
  const [currentMode, setCurrentMode] = useState<'voice-qa' | 'mock-interview' | 'interview-training'>('voice-qa');

  // 监听点击穿透状态变化并应用到全局
  React.useEffect(() => {
    try {
      const api: any = (window as any).electronAPI;
      const off = api?.clickThrough?.onChanged?.((enabled: boolean) => {
        // 直接在 body 上添加/移除 class，这样所有元素都能感知到穿透状态
        if (enabled) {
          document.body.classList.add('click-through-mode');
        } else {
          document.body.classList.remove('click-through-mode');
        }
      });
      return () => { try { off?.(); } catch {} };
    } catch {}
  }, []);

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