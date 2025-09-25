import { motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
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
  
  // 创建 ref 用于 VoiceQABody 实现复制AI回答的功能
  const copyLastAIResponseRef = useRef<(() => Promise<void>) | null>(null);

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
        if ((window as any).electronAPI?.setAIWindowHeight) {
          await (window as any).electronAPI.setAIWindowHeight(percentage);
        }
      } else {
        // 默认75%，同步到主进程
        if ((window as any).electronAPI?.setAIWindowHeight) {
          await (window as any).electronAPI.setAIWindowHeight(75);
        }
      }
    } catch (error) {
      console.error('加载高度设置失败:', error);
    }
  };

  // 监听历史对话加载事件
  useEffect(() => {
    const handleLoadConversation = (conversationData: any) => {
      
      if (conversationData && conversationData.messages) {
        // 清空当前消息
        setMessages([]);
        
        // 加载历史消息
        const loadedMessages = conversationData.messages.map((msg: any) => ({
          id: msg.id,
          type: msg.type,
          content: msg.content
        }));
        
        setMessages(loadedMessages);
        setCurrentConversationId(conversationData.conversationId);
        setCurrentConversationStatus(conversationData.status || 'active');
        setSequenceNumber(loadedMessages.length + 1);
        
      }
    };

    // 注册事件监听器
    if ((window as any).electronAPI?.onLoadConversation) {
      (window as any).electronAPI.onLoadConversation(handleLoadConversation);
    }

    // 清理函数
    return () => {
      if ((window as any).electronAPI?.removeLoadConversationListener) {
        (window as any).electronAPI.removeLoadConversationListener();
      }
    };
  }, []);

  // 监听窗口高度变化事件
  useEffect(() => {
    const handleWindowHeightChanged = (data: { heightPercentage: number }) => {
      setHeightPercentage(data.heightPercentage);
    };

    // 注册事件监听器
    if ((window as any).electronAPI?.onWindowHeightChanged) {
      (window as any).electronAPI.onWindowHeightChanged(handleWindowHeightChanged);
    }

    // 清理函数
    return () => {
      if ((window as any).electronAPI?.removeWindowHeightChangedListener) {
        (window as any).electronAPI.removeWindowHeightChangedListener();
      }
    };
  }, []);

  const initializeConversation = async () => {
    try {
      setIsInitializing(true);
      
      // 尝试获取最新的活跃对话
      const latestConversation = await conversationService.getLatestActiveConversation();
      
      if (latestConversation) {
        setCurrentConversationId(latestConversation.conversation.id);
        setCurrentConversationStatus(latestConversation.conversation.status);
        
        // 恢复消息
        const restoredMessages = latestConversation.messages.map(msg => ({
          id: msg.id.toString(),
          type: msg.message_type === 'user' ? 'user' as const : 'ai' as const,
          content: msg.content
        }));
        setMessages(restoredMessages);
        
        // 设置下一个消息的序列号
        setSequenceNumber(latestConversation.messages.length + 1);
      } else {
        setCurrentConversationId(null);
        setCurrentConversationStatus(null);
        setSequenceNumber(1);
        setMessages([]);
      }
    } catch (error) {
      console.error('初始化对话失败:', error);
      setCurrentConversationId(null);
      setCurrentConversationStatus(null);
      setSequenceNumber(1);
      setMessages([]);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSubmit = async () => {
    if (!question.trim() || isLoading) return;
    
    // 检查当前对话状态，如果已完成则阻止提交
    if (currentConversationStatus === 'completed') {
      alert('当前对话已完成，无法继续提问。请点击"新建提问"开始新的对话。');
      return;
    }
    
    setIsLoading(true);
    const currentQuestion = question;
    setQuestion('');
    
    let conversationId = currentConversationId;
    let currentSeq = sequenceNumber;
    
    // 如果没有当前对话，创建新对话
    if (!conversationId) {
      const title = currentQuestion.length > 50 ? currentQuestion.substring(0, 50) + '...' : currentQuestion;
      conversationId = await conversationService.createConversation(title);
      
      if (!conversationId) {
        console.error('创建对话失败');
        setIsLoading(false);
        setQuestion(currentQuestion); // 恢复输入
        return;
      }
      
      setCurrentConversationId(conversationId);
      setCurrentConversationStatus('active');
    }
    
    // 添加用户消息到UI
    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: currentQuestion
    };
    setMessages(prev => [...prev, userMessage]);
    
    // 保存用户消息到数据库
    await conversationService.saveMessage(conversationId, 'user', currentQuestion, currentSeq);
    currentSeq++;
    
    // 创建AI消息占位符
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage = {
      id: aiMessageId,
      type: 'ai' as const,
      content: ''
    };
    setMessages(prev => [...prev, aiMessage]);
    
    let aiResponseContent = '';
    const startTime = Date.now();
    
    try {
      // 使用 AI 服务进行流式调用
      await aiService.callAIStream(
        [{ role: 'user', content: currentQuestion }],
        (chunk) => {
          if (chunk.error) {
            console.error('AI调用出错:', chunk.error);
            const errorMessage = `抱歉，AI调用出错了：${chunk.error}`;
            setMessages(prev => prev.map(msg => 
              msg.id === aiMessageId 
                ? { ...msg, content: errorMessage }
                : msg
            ));
            
            // 保存错误消息到数据库
            conversationService.saveMessage(
              conversationId!,
              'assistant',
              errorMessage,
              currentSeq,
              0,
              Date.now() - startTime,
              chunk.error
            );
            
            setSequenceNumber(currentSeq + 1);
            setIsLoading(false);
            return;
          }

          if (chunk.finished) {
            
            // 保存完整AI回答到数据库
            if (aiResponseContent && conversationId) {
              conversationService.saveMessage(
                conversationId,
                'assistant',
                aiResponseContent,
                currentSeq,
                0, // token数量暂时为0，后续可以计算
                Date.now() - startTime
              );
              setSequenceNumber(currentSeq + 1);
            }
            
            setIsLoading(false);
            return;
          }

          // 流式更新AI消息内容
          if (chunk.content) {
            aiResponseContent += chunk.content;
            setMessages(prev => prev.map(msg => 
              msg.id === aiMessageId 
                ? { ...msg, content: aiResponseContent }
                : msg
            ));
          }
        }
      );
    } catch (error) {
      console.error('AI调用失败:', error);
      const errorMessage = `AI调用失败：${(error as Error).message}`;
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: errorMessage }
          : msg
      ));
      
      // 保存错误消息到数据库
      if (conversationId) {
        await conversationService.saveMessage(
          conversationId,
          'assistant',
          errorMessage,
          currentSeq,
          0,
          Date.now() - startTime,
          (error as Error).message
        );
        setSequenceNumber(currentSeq + 1);
      }
      
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
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
      // 保存到 localStorage
      localStorage.setItem('ai-window-height-percentage', percentage.toString());
      // 同步到主进程
      if ((window as any).electronAPI?.setAIWindowHeight) {
        await (window as any).electronAPI.setAIWindowHeight(percentage);
      }
    } catch (error) {
      console.error('设置窗口高度失败:', error);
    }
  };

  // 新建提问：开始新对话
  const handleNewChat = async () => {
    if (isLoading) return;
    
    setCurrentConversationId(null);
    setCurrentConversationStatus(null);
    setSequenceNumber(1);
    setMessages([]);
  };

  const handleAskMore = (questionText: string) => {
    // 先设置问题，然后立即提交
    setQuestion(questionText);
    // 使用 setTimeout 确保状态更新后再提交
    setTimeout(() => {
      if (questionText.trim() && !isLoading) {
        handleSubmit();
      }
    }, 0);
  };

  return (
    <div className="ai-question-app">
      <motion.div
        className="ai-question-window"
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <InterviewTrainingHeader 
          isLoading={isLoading} 
          onClose={handleClose} 
          heightPercentage={heightPercentage}
          onHeightChange={handleHeightChange}
        />

        {/* Body - 对话区域 */}
        <InterviewTrainingBody 
          messages={messages} 
          isLoading={isLoading || isInitializing} 
          onNewChat={handleNewChat}
          onAskMore={handleAskMore}
          onCopyLastAIResponse={copyLastAIResponseRef}
        />

        {/* Footer - 输入区域 */}
        <InterviewTrainingFooter
          question={question}
          isLoading={isLoading || isInitializing}
          onQuestionChange={setQuestion}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          onNewChat={handleNewChat}
          onCopyLastAIResponse={() => copyLastAIResponseRef.current?.()}
          currentConversationStatus={currentConversationStatus}
        />
      </motion.div>
    </div>
  );
}