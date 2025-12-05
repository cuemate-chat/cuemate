import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { createLogger } from '../../../../utils/rendererLogger.js';
import { useVoiceState } from '../../../../utils/voiceState';

const log = createLogger('MockInterviewApp');
import { subscribeMockInterview } from '../../../utils/mockInterviewManager';
import { setMockInterviewState, useMockInterviewState } from '../../../utils/mockInterviewState';
import { MockInterviewBody } from './MockInterviewBody.tsx';
import { MockInterviewFooter } from './MockInterviewFooter.tsx';
import { MockInterviewHeader } from './MockInterviewHeader.tsx';

export function MockInterviewApp() {
  const [heightPercentage, setHeightPercentage] = useState(75);
  const previousInterviewId = useRef<string | undefined>(undefined);

  // 使用跨窗口状态管理
  const mockInterviewState = useMockInterviewState();

  // 从 voiceState 获取当前面试 ID
  const voiceState = useVoiceState();
  const interviewId = voiceState.interviewId;

  // 订阅全局状态机变化
  useEffect(() => {
    const unsubscribe = subscribeMockInterview((state) => {
      // 更新 UI 状态
      setMockInterviewState({ interviewState: state });
    });

    return unsubscribe;
  }, []);

  // 监听 interviewId 变化，记录日志但不清理状态
  // 关键原则：永远不主动清理数据，数据只在用户开始新面试时才清理
  useEffect(() => {
    if (interviewId && interviewId !== previousInterviewId.current) {
      log.debug('useEffect', 'interviewId 变化', { from: previousInterviewId.current, to: interviewId });
      // 不清理任何状态，保持当前数据
      // 数据清理只在 startMockInterview() 中进行
      previousInterviewId.current = interviewId;
    }
  }, [interviewId]);

  // 始终显示内存中的数据，不因 interviewId 为空而隐藏
  // 这样即使发生错误，用户也能看到之前的数据
  const aiMessage = mockInterviewState.aiMessage;

  const speechText = mockInterviewState.speechText;
  const candidateAnswer = mockInterviewState.candidateAnswer;
  const isLoading = mockInterviewState.isLoading;
  const interviewState = mockInterviewState.interviewState;

  // 组件初始化时加载高度设置和监听外部事件
  useEffect(() => {
    loadHeightSetting();
    setupEventListeners();
  }, []);

  // 设置事件监听器接收外部数据
  const setupEventListeners = () => {
    // 监听自动模式触发的回答完成
    const handleTriggerResponseComplete = () => {
      handleResponseComplete();
    };

    // 添加事件监听器
    window.addEventListener('mockInterview:triggerResponseComplete', handleTriggerResponseComplete);

    // 清理函数
    return () => {
      window.removeEventListener('mockInterview:triggerResponseComplete', handleTriggerResponseComplete);
    };
  };

  // 加载高度设置
  const loadHeightSetting = async () => {
    try {
      const savedHeight = localStorage.getItem('ai-window-height-percentage');
      if (savedHeight) {
        const percentage = parseInt(savedHeight, 10);
        setHeightPercentage(percentage);
        // 同步到主进程
        if ((window as any).electronAPI?.setAIQuestionHeight) {
          await (window as any).electronAPI.setAIQuestionHeight(percentage);
        }
      }
    } catch (error) {
      log.error('loadHeightSetting', '加载窗口高度设置失败', undefined, error);
    }
  };

  const handleClose = async () => {
    try {
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.hideAIQuestion();
      }
    } catch (error) {
      log.error('handleClose', '关闭 AI 问题窗口失败', undefined, error);
    }
  };

  // 处理高度变化
  const handleHeightChange = async (percentage: number) => {
    try {
      setHeightPercentage(percentage);
      localStorage.setItem('ai-window-height-percentage', percentage.toString());

      if ((window as any).electronAPI?.setAIQuestionHeight) {
        await (window as any).electronAPI.setAIQuestionHeight(percentage);
      }
    } catch (error) {
      log.error('handleHeightChange', '设置窗口高度失败', undefined, error);
    }
  };

  // 处理用户回答完成（手动点击或自动检测）
  const handleResponseComplete = async () => {
    // 检查文本长度，至少需要 5 个字符才触发
    if (speechText.length <= 5) {
      return;
    }

    // 通过 BroadcastChannel + localStorage 跨窗口传递用户回答
    // 左侧窗口会监听 candidateAnswer 变化并触发 AI 分析
    setMockInterviewState({ candidateAnswer: speechText });
  };

  return (
    <div className="ai-question-app">
      <motion.div
        className="ai-question-window"
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header - 标题栏 */}
        <MockInterviewHeader
          onClose={handleClose}
          heightPercentage={heightPercentage}
          onHeightChange={handleHeightChange}
          isLoading={isLoading}
          interviewState={interviewState}
        />

        {/* Body - AI 答案展示区域 */}
        <MockInterviewBody
          aiMessage={aiMessage}
          candidateAnswer={candidateAnswer}
          isLoading={isLoading}
        />

        {/* Footer - 语音识别区域 */}
        <MockInterviewFooter
          interviewId={interviewId}
          onResponseComplete={handleResponseComplete}
        />
      </motion.div>
    </div>
  );
}