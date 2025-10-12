import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useVoiceState } from '../../../../utils/voiceState';
import { setInterviewTrainingState, useInterviewTrainingState } from '../../../utils/interviewTrainingState';
import { InterviewTrainingBody } from './InterviewTrainingBody';
import { InterviewTrainingFooter } from './InterviewTrainingFooter';
import { InterviewTrainingHeader } from './InterviewTrainingHeader';

export function InterviewTrainingApp() {
  const [heightPercentage, setHeightPercentage] = useState(75);
  const previousInterviewId = useRef<string | undefined>(undefined);

  // 使用跨窗口状态管理
  const trainingState = useInterviewTrainingState();

  // 从voiceState获取当前面试ID
  const voiceState = useVoiceState();
  const interviewId = voiceState.interviewId;

  // 组件初始化时清理状态
  useEffect(() => {
    // 如果没有interviewId,清理所有状态(应用重启场景)
    if (!interviewId) {
      setInterviewTrainingState({
        aiMessage: '',
        speechText: '',
        candidateAnswer: '',
        isLoading: false,
        isListening: false,
        interviewState: undefined,
      });
    }
  }, []);

  // 监听 interviewId 变化，如果是新面试则清空状态
  useEffect(() => {
    if (interviewId !== previousInterviewId.current) {
      // interviewId 发生变化，清空旧数据
      setInterviewTrainingState({
        aiMessage: '',
        speechText: '',
        candidateAnswer: '',
        isLoading: false,
        isListening: false,
        interviewState: undefined,
      });
      previousInterviewId.current = interviewId;
    }
  }, [interviewId]);

  // 只有存在interviewId才显示数据,否则显示空白
  const aiMessage = interviewId ? trainingState.aiMessage : '';
  const speechText = interviewId ? trainingState.speechText : '';
  const candidateAnswer = interviewId ? trainingState.candidateAnswer : '';
  const isLoading = interviewId ? trainingState.isLoading : false;
  const interviewState = interviewId ? trainingState.interviewState : undefined;

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
    window.addEventListener('interviewTraining:triggerResponseComplete', handleTriggerResponseComplete);

    // 清理函数
    return () => {
      window.removeEventListener('interviewTraining:triggerResponseComplete', handleTriggerResponseComplete);
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
    // 检查文本长度，至少需要5个字符才触发
    if (speechText.length <= 5) {
      return;
    }

    // 通过 BroadcastChannel + localStorage 跨窗口传递用户回答
    // 左侧窗口会监听 candidateAnswer 变化并触发 AI 分析
    setInterviewTrainingState({ candidateAnswer: speechText });
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
        <InterviewTrainingHeader
          onClose={handleClose}
          heightPercentage={heightPercentage}
          onHeightChange={handleHeightChange}
          isLoading={isLoading}
          interviewState={interviewState}
        />

        {/* Body - AI答案展示区域 */}
        <InterviewTrainingBody
          aiMessage={aiMessage}
          candidateAnswer={candidateAnswer}
          isLoading={isLoading}
        />

        {/* Footer - 语音识别区域 */}
        <InterviewTrainingFooter
          interviewId={interviewId}
          onResponseComplete={handleResponseComplete}
        />
      </motion.div>
    </div>
  );
}