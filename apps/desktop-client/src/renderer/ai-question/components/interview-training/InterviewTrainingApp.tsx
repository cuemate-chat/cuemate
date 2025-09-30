import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { aiService } from '../../api/aiService.ts';
import { conversationService } from '../../api/conversationService.ts';
import { InterviewTrainingBody } from './InterviewTrainingBody.tsx';
import { InterviewTrainingFooter } from './InterviewTrainingFooter.tsx';
import { InterviewTrainingHeader } from './InterviewTrainingHeader.tsx';

export function InterviewTrainingApp() {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{id: string, type: 'user' | 'ai', content: string}>>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [currentConversationStatus, setCurrentConversationStatus] = useState<'active' | 'completed' | 'error' | null>(null);
  const [sequenceNumber, setSequenceNumber] = useState(1);
  const [isInitializing, setIsInitializing] = useState(true);
  const [heightPercentage, setHeightPercentage] = useState(75); // 默认75%

  // 错误处理状态
  const [errorNotification, setErrorNotification] = useState<{
    type: 'error' | 'success' | 'warning';
    message: string;
    duration: number;
  } | null>(null);

  // 组件初始化时恢复最近对话和高度设置
  useEffect(() => {
    initializeConversation();
    loadHeightSetting();
  }, []);

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

  // 初始化对话
  const initializeConversation = async () => {
    try {
      const latestConversation = await conversationService.getLatestActiveConversation();
      if (latestConversation) {
        setCurrentConversationId(latestConversation.conversation.id);
        setCurrentConversationStatus(latestConversation.conversation.status);
        setSequenceNumber(latestConversation.messages.length + 1);

        const conversationMessages: any[] = []; // 简化处理，不加载历史消息
        const formattedMessages = conversationMessages.map((msg: any) => ({
          id: msg.id,
          type: msg.type as 'user' | 'ai',
          content: msg.content
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('初始化对话失败:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSubmit = async () => {
    if (!question.trim() || isLoading) return;

    // 检查当前对话状态，如果已完成则阻止提交
    if (currentConversationStatus === 'completed') {
      setErrorNotification({
        type: 'error',
        message: '当前对话已完成，无法继续提问。请点击"新建提问"开始新的对话。',
        duration: 3000
      });
      return;
    }

    setIsLoading(true);

    try {
      let conversationId = currentConversationId;
      let currentSequence = sequenceNumber;

      // 如果没有活跃对话，创建新对话
      if (!conversationId || currentConversationStatus !== 'active') {
        const newConversation = await conversationService.createConversation('interview-training');
        if (!newConversation) {
          throw new Error('创建对话失败');
        }
        conversationId = newConversation;
        setCurrentConversationId(conversationId);
        setCurrentConversationStatus('active');
        currentSequence = 1;
        setSequenceNumber(1);
      }

      // 确保 conversationId 不为空
      if (!conversationId) {
        throw new Error('对话ID无效');
      }

      // 添加用户消息到界面和数据库
      const userMessageId = `user-${Date.now()}`;
      const newUserMessage = { id: userMessageId, type: 'user' as const, content: question };
      setMessages(prev => [...prev, newUserMessage]);

      await conversationService.saveMessage(conversationId, 'user', question, currentSequence);

      // 清空输入框
      const currentQuestion = question;
      setQuestion('');

      // 调用AI服务
      const response = await aiService.callAI([{ role: 'user', content: currentQuestion }]);

      // 添加AI回复到界面和数据库
      const aiMessageId = `ai-${Date.now()}`;
      const newAIMessage = { id: aiMessageId, type: 'ai' as const, content: response };
      setMessages(prev => [...prev, newAIMessage]);

      await conversationService.saveMessage(conversationId, 'assistant', response, currentSequence);

      // 更新序列号
      setSequenceNumber(currentSequence + 1);
      // 更新序列号（简化处理）

    } catch (error) {
      console.error('发送消息失败:', error);
      setErrorNotification({
        type: 'error',
        message: '发送消息失败，请稍后重试',
        duration: 3000
      });
    } finally {
      setIsLoading(false);
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

  // 显示错误通知的副作用
  useEffect(() => {
    if (errorNotification) {
      const timer = setTimeout(() => {
        setErrorNotification(null);
      }, errorNotification.duration);
      return () => clearTimeout(timer);
    }
  }, [errorNotification]);

  return (
    <div className="ai-question-app">
      <motion.div
        className="ai-question-window"
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{ height: `${heightPercentage}vh` }}
      >
        {/* Header - 标题栏 */}
        <InterviewTrainingHeader
          onClose={handleClose}
          heightPercentage={heightPercentage}
          onHeightChange={handleHeightChange}
          isLoading={isLoading || isInitializing}
        />

        {/* Body - 对话区域 */}
        <InterviewTrainingBody
          aiMessage={messages.filter(m => m.type === 'ai').pop()?.content}
          isLoading={isLoading || isInitializing}
        />

        {/* Footer - 语音识别区域 */}
        <InterviewTrainingFooter
          speechText=""
          isLoading={isLoading || isInitializing}
          onResponseComplete={async () => {
            if (question.trim()) {
              await handleSubmit();
            }
          }}
        />
      </motion.div>

      {/* 错误通知 */}
      {errorNotification && (
        <motion.div
          className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            errorNotification.type === 'error'
              ? 'bg-red-500 text-white'
              : errorNotification.type === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-yellow-500 text-white'
          }`}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
        >
          {errorNotification.message}
        </motion.div>
      )}
    </div>
  );
}