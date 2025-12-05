import { useEffect, useState } from 'react';
import { createLogger } from '../../utils/rendererLogger.js';
import { clearInterviewTrainingState } from '../utils/interviewTrainingState';
import { clearMockInterviewState } from '../utils/mockInterviewState';
import { setVoiceState } from '../../utils/voiceState';

const log = createLogger('InterviewerApp');
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
        log.warn('useEffect', 'electronAPI.on/off 不可用');
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

        // 设置选中的岗位 ID
        if (jobId) {
          setSelectedJobId(jobId);
        }
      };

      api.on('mode-change', handleModeChange);
      return () => {
        api.off('mode-change', handleModeChange);
      };
    } catch (error) {
      log.error('useEffect', '监听模式切换事件失败', undefined, error);
    }
  }, []);

  // 监听点击穿透状态变化并应用到全局
  useEffect(() => {
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
          await (window as any).electronAPI.showAIQuestionHistory();
        } else if (title === '面试训练') {
          await (window as any).electronAPI.switchToMode('interview-training');
          await (window as any).electronAPI.showAIQuestion();
          await (window as any).electronAPI.showAIQuestionHistory();
        }
      }
    } catch (error) {
      log.error('handleSelectCard', '进入模式失败', undefined, error);
    }
  };

  const handleBack = async () => {
    // 返回上一页时重置 UI 导航状态
    setCurrentSectionTitle(null);

    // 清空 voiceState（运行时状态）
    // 恢复用的 ID 在持久化文件 resuming_interviews/interviewId.json 里
    // 包含 mockInterviewId 和 trainingInterviewId 两个字段
    setVoiceState({
      mode: 'none',
      subState: 'idle',
      interviewId: undefined,
    });

    // 清理跨窗口状态，避免中间窗口显示旧的面试状态
    clearMockInterviewState();
    clearInterviewTrainingState();
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
