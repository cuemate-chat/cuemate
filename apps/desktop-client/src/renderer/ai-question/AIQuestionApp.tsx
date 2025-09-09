import { motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import { WindowBody } from './WindowBody.tsx';
import { WindowFooter } from './WindowFooter.tsx';
import { WindowHeader } from './WindowHeader.tsx';
import { aiService } from './api/aiService.ts';
import { conversationService } from './api/conversationService.ts';


// 加载动画组件移动至 WindowHeader

export function AIQuestionApp() {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{id: string, type: 'user' | 'ai', content: string}>>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [sequenceNumber, setSequenceNumber] = useState(1);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // 创建 ref 用于 WindowBody 实现复制AI回答的功能
  const copyLastAIResponseRef = useRef<(() => Promise<void>) | null>(null);

  // 组件初始化时恢复最近对话
  useEffect(() => {
    initializeConversation();
  }, []);

  const initializeConversation = async () => {
    try {
      setIsInitializing(true);
      
      // 尝试获取最新的活跃对话
      const latestConversation = await conversationService.getLatestActiveConversation();
      
      if (latestConversation) {
        console.log('恢复现有对话:', latestConversation.conversation.title);
        setCurrentConversationId(latestConversation.conversation.id);
        
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
        console.log('没有现有对话，准备创建新对话');
        setCurrentConversationId(null);
        setSequenceNumber(1);
        setMessages([]);
      }
    } catch (error) {
      console.error('初始化对话失败:', error);
      setCurrentConversationId(null);
      setSequenceNumber(1);
      setMessages([]);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSubmit = async () => {
    if (!question.trim() || isLoading) return;
    
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
            console.log('AI流式输出完成，内容:', aiResponseContent);
            
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

  // 新建提问：开始新对话
  const handleNewChat = async () => {
    if (isLoading) return;
    
    console.log('开始新对话');
    setCurrentConversationId(null);
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

  // 使用原生可清除输入（type="search"），无需自定义清空按钮

  return (
    <div className="ai-question-app">
      <motion.div
        className="ai-question-window"
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <WindowHeader isLoading={isLoading} onClose={handleClose} />

        {/* Body - 对话区域 */}
        <WindowBody 
          messages={messages} 
          isLoading={isLoading || isInitializing} 
          onNewChat={handleNewChat}
          onAskMore={handleAskMore}
          onCopyLastAIResponse={copyLastAIResponseRef}
        />

        {/* Footer - 输入区域 */}
        <WindowFooter
          question={question}
          isLoading={isLoading || isInitializing}
          onQuestionChange={setQuestion}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          onNewChat={handleNewChat}
          onCopyLastAIResponse={() => copyLastAIResponseRef.current?.()}
        />
      </motion.div>
    </div>
  );
}
