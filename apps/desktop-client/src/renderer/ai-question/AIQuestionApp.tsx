import { motion } from 'framer-motion';
import React, { useState } from 'react';
import { WindowBody } from './WindowBody.tsx';
import { WindowFooter } from './WindowFooter.tsx';
import { WindowHeader } from './WindowHeader.tsx';
import { aiService } from './api/aiService.ts';


// 加载动画组件移动至 WindowHeader

export function AIQuestionApp() {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{id: string, type: 'user' | 'ai', content: string}>>([]);


  const handleSubmit = async () => {
    if (!question.trim()) return;
    
    // 添加用户消息
    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: question
    };
    setMessages(prev => [...prev, userMessage]);
    
    setIsLoading(true);
    const currentQuestion = question;
    setQuestion('');
    
    // 创建AI消息占位符
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage = {
      id: aiMessageId,
      type: 'ai' as const,
      content: ''
    };
    setMessages(prev => [...prev, aiMessage]);
    
    try {
      // 使用 AI 服务进行流式调用
      await aiService.callAIStream(
        [{ role: 'user', content: currentQuestion }],
        (chunk) => {
          if (chunk.error) {
            console.error('AI调用出错:', chunk.error);
            setMessages(prev => prev.map(msg => 
              msg.id === aiMessageId 
                ? { ...msg, content: `抱歉，AI调用出错了：${chunk.error}` }
                : msg
            ));
            setIsLoading(false);
            return;
          }

          if (chunk.finished) {
            console.log('AI流式输出完成');
            setIsLoading(false);
            return;
          }

          // 流式更新AI消息内容
          if (chunk.content) {
            setMessages(prev => prev.map(msg => 
              msg.id === aiMessageId 
                ? { ...msg, content: msg.content + chunk.content }
                : msg
            ));
          }
        }
      );
    } catch (error) {
      console.error('AI调用失败:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: `AI调用失败：${(error as Error).message}` }
          : msg
      ));
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

  const handleClearMessages = () => {
    setMessages([]);
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
        <WindowBody messages={messages} isLoading={isLoading} />

        {/* Footer - 输入区域 */}
        <WindowFooter
          question={question}
          isLoading={isLoading}
          onQuestionChange={setQuestion}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          onClearMessages={handleClearMessages}
        />
      </motion.div>
    </div>
  );
}
