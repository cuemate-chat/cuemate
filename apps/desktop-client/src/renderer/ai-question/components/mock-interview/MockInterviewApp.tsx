import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useMockInterviewState } from '../../../utils/mockInterviewState';
import { MockInterviewBody } from './MockInterviewBody.tsx';
import { MockInterviewFooter } from './MockInterviewFooter.tsx';
import { MockInterviewHeader } from './MockInterviewHeader.tsx';

export function MockInterviewApp() {
  const [heightPercentage, setHeightPercentage] = useState(75);

  // 使用跨窗口状态管理
  const mockInterviewState = useMockInterviewState();
  const { aiMessage, speechText, isLoading } = mockInterviewState;

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
      console.error('加载窗口高度设置失败:', error);
    }
  };

  const handleClose = async () => {
    try {
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.hideAIQuestion();
      }
    } catch (error) {
      console.error('关闭AI问题窗口失败:', error);
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
      console.error('设置窗口高度失败:', error);
    }
  };

  // 处理用户回答完成（手动点击或自动检测）
  const handleResponseComplete = async () => {
    // 检查文本长度，自动模式下至少需要5个字符才触发
    if (speechText.length <= 5) {
      return;
    }

    // 触发事件通知 MockInterviewEntryBody 开始AI分析
    window.dispatchEvent(new CustomEvent('mockInterview:userAnswerComplete', {
      detail: { candidateAnswer: speechText }
    }));
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
        />

        {/* Body - AI答案展示区域 */}
        <MockInterviewBody
          aiMessage={aiMessage}
          isLoading={isLoading}
        />

        {/* Footer - 语音识别区域 */}
        <MockInterviewFooter
          onResponseComplete={handleResponseComplete}
        />
      </motion.div>
    </div>
  );
}