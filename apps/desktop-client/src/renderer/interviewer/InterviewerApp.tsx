import { useEffect, useState, useRef } from 'react';
import { logger } from '../../utils/rendererLogger.js';
import { currentInterview } from '../utils/currentInterview';
import { clearVoiceState, getVoiceState, setVoiceState } from '../../utils/voiceState';
import { validateWithDatabase } from '../utils/mockInterviewManager';
import { validateTrainingWithDatabase } from '../utils/trainingManager';
import { InterviewerWindowBody } from './components/InterviewerWindowBody';
import { InterviewerWindowFooter } from './components/InterviewerWindowFooter';
import { InterviewerWindowHeader } from './components/InterviewerWindowHeader';

export function InterviewerApp() {
  const [currentSectionTitle, setCurrentSectionTitle] = useState<string | null>(null);

  const [selectedJobId, setSelectedJobId] = useState<string | undefined>(undefined);

  // 应用启动时同步本地数据与数据库（只执行一次）
  const hasSyncedRef = useRef(false);
  useEffect(() => {
    if (hasSyncedRef.current) return;
    hasSyncedRef.current = true;

    const syncLocalDataWithDatabase = async () => {
      try {
        // 并行验证模拟面试和面试训练的本地数据
        const [mockResult, trainingResult] = await Promise.all([
          validateWithDatabase(),
          validateTrainingWithDatabase()
        ]);

        // 记录同步结果
        if (mockResult.status !== 'no_local_data') {
          logger.info(`[启动同步] 模拟面试: ${mockResult.status}, 数据库状态: ${mockResult.dbStatus || '无'}`);
        }
        if (trainingResult.status !== 'no_local_data') {
          logger.info(`[启动同步] 面试训练: ${trainingResult.status}, 数据库状态: ${trainingResult.dbStatus || '无'}`);
        }
      } catch (error) {
        logger.error(`[启动同步] 同步本地数据失败: ${error}`);
      }
    };

    // 延迟 500ms 执行，确保其他初始化完成
    const timer = setTimeout(syncLocalDataWithDatabase, 500);
    return () => clearTimeout(timer);
  }, []);

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
      logger.error(`监听模式切换事件失败: ${error}`);
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
      logger.error(`进入模式失败: ${error}`);
    }
  };

  const handleBack = async () => {
    // 返回上一页时不关闭右侧窗口，只是重置当前选择的 section
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
      currentInterview.clear(); // 清理 localStorage 中的 interviewId
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
