import React, { useState } from 'react';
import { InterviewTrainingHistoryApp } from './components/interview-training/InterviewTrainingHistoryApp.tsx';
import { MockInterviewHistoryApp } from './components/mock-interview/MockInterviewHistoryApp.tsx';
import { VoiceQAHistoryApp } from './components/voice-qa/VoiceQAHistoryApp.tsx';

export function AIQuestionHistoryApp() {
  const [currentMode, setCurrentMode] = useState<'voice-qa' | 'mock-interview' | 'interview-training'>('voice-qa');

  // 监听点击穿透状态变化并应用到全局
  React.useEffect(() => {
    try {
      const api: any = (window as any).electronHistoryAPI;
      const off = api?.clickThrough?.onChanged?.((enabled: boolean) => {
        // 直接在body上添加/移除class，这样所有元素都能感知到穿透状态
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