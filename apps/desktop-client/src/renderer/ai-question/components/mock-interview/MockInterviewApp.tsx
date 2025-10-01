import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { MockInterviewBody } from './MockInterviewBody.tsx';
import { MockInterviewFooter } from './MockInterviewFooter.tsx';
import { MockInterviewHeader } from './MockInterviewHeader.tsx';

export function MockInterviewApp() {
  const [heightPercentage, setHeightPercentage] = useState(75);
  const [speechText, setSpeechText] = useState('');
  const [aiMessage, setAiMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 组件初始化时加载高度设置和监听外部事件
  useEffect(() => {
    loadHeightSetting();
    setupEventListeners();
  }, []);

  // 设置事件监听器接收外部数据
  const setupEventListeners = () => {
    // 监听语音识别文本更新
    const handleSpeechTextUpdate = (event: any) => {
      if (event.detail?.text) {
        setSpeechText(event.detail.text);
      }
    };

    // 监听AI答案更新
    const handleAIAnswerUpdate = (event: any) => {
      if (event.detail?.answer) {
        setAiMessage(event.detail.answer);
      }
    };

    // 监听加载状态更新
    const handleLoadingStateUpdate = (event: any) => {
      setIsLoading(event.detail?.isLoading || false);
    };

    // 添加事件监听器
    window.addEventListener('mockInterview:speechTextUpdate', handleSpeechTextUpdate);
    window.addEventListener('mockInterview:aiAnswerUpdate', handleAIAnswerUpdate);
    window.addEventListener('mockInterview:loadingStateUpdate', handleLoadingStateUpdate);

    // 清理函数
    return () => {
      window.removeEventListener('mockInterview:speechTextUpdate', handleSpeechTextUpdate);
      window.removeEventListener('mockInterview:aiAnswerUpdate', handleAIAnswerUpdate);
      window.removeEventListener('mockInterview:loadingStateUpdate', handleLoadingStateUpdate);
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

  // 处理答案生成完成（从外部接收）
  const handleResponseComplete = async () => {
    // 这里可以添加答案完成后的处理逻辑
    console.log('模拟面试答案展示完成');
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
          speechText={speechText}
          isLoading={isLoading}
          onResponseComplete={handleResponseComplete}
        />
      </motion.div>
    </div>
  );
}