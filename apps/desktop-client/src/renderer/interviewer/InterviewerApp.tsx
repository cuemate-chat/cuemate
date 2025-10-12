import { useEffect, useState } from 'react';
import { currentInterview } from '../utils/currentInterview';
import { clearVoiceState, getVoiceState, setVoiceState } from '../../utils/voiceState';
import { InterviewerWindowBody } from './components/InterviewerWindowBody';
import { InterviewerWindowFooter } from './components/InterviewerWindowFooter';
import { InterviewerWindowHeader } from './components/InterviewerWindowHeader';

export function InterviewerApp() {
  const [currentSectionTitle, setCurrentSectionTitle] = useState<string | null>(null);

  const [selectedJobId, setSelectedJobId] = useState<string | undefined>(undefined);

  // 监听模式切换事件
  useEffect(() => {
    try {
      const api: any = (window as any).electronAPI;
      if (!api?.on || !api?.off) {
        console.warn('electronAPI.on/off 不可用');
        return;
      }

      const handleModeChange = (mode: 'voice-qa' | 'mock-interview' | 'interview-training', jobId?: string) => {
        if (mode === 'mock-interview') {
          setCurrentSectionTitle('模拟面试');
        } else if (mode === 'interview-training') {
          setCurrentSectionTitle('面试训练');
        } else if (mode === 'voice-qa') {
          setCurrentSectionTitle('语音提问');
        }

        // 设置选中的岗位ID
        if (jobId) {
          setSelectedJobId(jobId);
        }
      };

      api.on('mode-change', handleModeChange);
      return () => {
        api.off('mode-change', handleModeChange);
      };
    } catch (error) {
      console.error('监听模式切换事件失败:', error);
    }
  }, []);

  // 监听点击穿透状态变化并应用到全局
  useEffect(() => {
    try {
      const api: any = (window as any).electronAPI;
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

  const handleClose = async () => {
    try {
      await (window as any).electronAPI?.hideInterviewer?.();
    } catch {}

    // 只有在没有进行中的面试时才清除状态
    const voiceState = getVoiceState();
    if (voiceState.subState !== 'mock-interview-recording' &&
        voiceState.subState !== 'mock-interview-paused' &&
        voiceState.subState !== 'interview-training-recording' &&
        voiceState.subState !== 'interview-training-paused') {
      clearVoiceState();
    }
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
          await (window as any).electronAPI.showAIQuestionHistory();
        } else if (title === '面试训练') {
          await (window as any).electronAPI.switchToMode('interview-training');
          await (window as any).electronAPI.showAIQuestion();
          await (window as any).electronAPI.showAIQuestionHistory();
        }
      }
    } catch (error) {
      console.error('进入模式失败:', error);
    }
  };

  const handleBack = async () => {
    // 返回上一页时不关闭右侧窗口，只是重置当前选择的section
    setCurrentSectionTitle(null);

    // 只有在没有进行中的面试时才清除状态
    const voiceState = getVoiceState();
    if (voiceState.subState !== 'mock-interview-recording' &&
        voiceState.subState !== 'mock-interview-paused' &&
        voiceState.subState !== 'interview-training-recording' &&
        voiceState.subState !== 'interview-training-paused') {
      // 清除状态并清除 interviewId
      setVoiceState({
        mode: 'none',
        subState: 'idle',
        interviewId: undefined
      });
      currentInterview.clear(); // 清理localStorage中的interviewId
    }
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
          selectedJobId={selectedJobId}
        />
        <InterviewerWindowFooter />
      </div>
    </div>
  );
}
