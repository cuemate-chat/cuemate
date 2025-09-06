import { motion } from 'framer-motion';
import { Send, X } from 'lucide-react';
import { useState } from 'react';

export function AIQuestionApp() {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!question.trim()) return;
    
    setIsLoading(true);
    // TODO: 实现AI问答功能
    console.log('AI Question:', question);
    
    // 模拟API调用
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
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

  return (
    <div className="ai-question-app">
      <motion.div
        className="ai-question-window"
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {/* 关闭按钮 */}
        <button 
          className="ai-window-close-btn"
          onClick={handleClose}
        >
          <X size={16} />
        </button>

        {/* 标题 */}
        <div className="ai-window-header">
          <h3>AI 问答</h3>
          <p>您可以询问任何问题给到 AI</p>
        </div>

        {/* 输入区域 */}
        <div className="ai-window-input-area">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="请输入您的问题..."
            className="ai-window-textarea"
            rows={3}
          />
          <button
            onClick={handleSubmit}
            disabled={!question.trim() || isLoading}
            className="ai-window-send-btn"
          >
            {isLoading ? (
              <div className="ai-loading-spinner" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>

        {/* 回答区域 */}
        <div className="ai-window-response-area">
          <div className="ai-response-placeholder">
            <p>AI 回答将显示在这里...</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
