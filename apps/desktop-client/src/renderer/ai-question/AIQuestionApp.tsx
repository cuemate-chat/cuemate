import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { Copy, CornerDownLeft, Eraser } from 'lucide-react';
import React, { useState } from 'react';
import { WindowBody } from './WindowBody.tsx';
import { WindowFooter } from './WindowFooter.tsx';
import { WindowHeader } from './WindowHeader.tsx';


// 加载动画组件移动至 WindowHeader

export function AIQuestionApp() {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{id: string, type: 'user' | 'ai', content: string}>>([
    {
      id: '1',
      type: 'user',
      content: 'listen 是什么意思？'
    },
    {
      id: '2',
      type: 'ai',
      content: '日常英语里，表示"听"或"认真听"，比如"Listen to music."\n\n编程里，通常指"监听"，比如服务器监听端口等待连接（如`server.listen(8080)`）。\n\n在编程里，"listen"常见于网络编程，比如Node.js或Python，表示服务器开始等待客户端连接。比如Node.js代码：\n\n```javascript\nconst http = require(\'http\')\nconst server = http.createServer((req, res) => {\n  res.end(\'Hello\')\n})\nserver.listen(3000) // 服务器监听3000端口\n```\n\n这里`listen(3000)`让服务器在3000端口等待请求。'
    },
    {
      id: '3',
      type: 'user',
      content: '能解释一下 React Hooks 吗？'
    },
    {
      id: '4',
      type: 'ai',
      content: 'React Hooks 是 React 16.8 引入的新特性，让你在函数组件中使用状态和其他 React 特性。\n\n主要 Hooks 包括：\n\n1. **useState** - 管理组件状态\n```javascript\nconst [count, setCount] = useState(0);\n```\n\n2. **useEffect** - 处理副作用\n```javascript\nuseEffect(() => {\n  document.title = `Count: ${count}`;\n}, [count]);\n```\n\n3. **useContext** - 使用 Context\n4. **useReducer** - 复杂状态管理\n5. **useMemo** - 性能优化\n6. **useCallback** - 函数缓存\n\nHooks 让函数组件更强大，代码更简洁。'
    },
    {
      id: '5',
      type: 'user',
      content: 'TypeScript 和 JavaScript 有什么区别？'
    },
    {
      id: '6',
      type: 'ai',
      content: 'TypeScript 是 JavaScript 的超集，主要区别：\n\n**TypeScript 优势：**\n- 静态类型检查，编译时发现错误\n- 更好的 IDE 支持和代码提示\n- 重构更安全\n- 大型项目维护性更好\n\n**JavaScript 优势：**\n- 更灵活，无需类型定义\n- 学习曲线更平缓\n- 浏览器原生支持\n- 生态更成熟\n\n**示例对比：**\n\nJavaScript:\n```javascript\nfunction greet(name) {\n  return "Hello " + name;\n}\n```\n\nTypeScript:\n```typescript\nfunction greet(name: string): string {\n  return "Hello " + name;\n}\n```\n\n选择建议：大型项目用 TypeScript，小型项目或原型用 JavaScript。'
    },
    {
      id: '7',
      type: 'user',
      content: '如何优化网页性能？对于你屏幕里，聊天的内容样式，怎么做到越接近顶部，字体颜色越深，离远了才是纯白色字体的？？？？这个是 css 设计的嘛？还是有现成的组件？？？'
    },
    {
      id: '8',
      type: 'ai',
      content: '网页性能优化可以从多个方面入手：\n\n**1. 资源优化**\n- 压缩图片（WebP、AVIF格式）\n- 代码分割和懒加载\n- CDN 加速\n- 启用 Gzip 压缩\n\n**2. 代码优化**\n- 减少 HTTP 请求\n- 合并 CSS/JS 文件\n- 使用缓存策略\n- 避免阻塞渲染\n\n**3. 渲染优化**\n- 使用 CSS3 硬件加速\n- 避免重排重绘\n- 虚拟滚动\n- 图片懒加载\n\n**4. 网络优化**\n- HTTP/2 协议\n- 预加载关键资源\n- 服务端渲染（SSR）\n- 边缘计算\n\n**工具推荐：**\n- Lighthouse 性能检测\n- WebPageTest 详细分析\n- Chrome DevTools 调试\n\n性能优化是一个持续过程，需要根据实际数据调整策略。'
    }
  ]);


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
    setQuestion('');
    
    // TODO: 实现AI问答功能
    console.log('AI Question:', question);
    
    // 模拟API调用
    setTimeout(() => {
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: '这是一个模拟的AI回答。在实际应用中，这里会显示真实的AI回复内容。'
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 2000);
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
        <WindowFooter>
          <div className="ai-input-container">
            <input
              type="search"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="询问 AI 任意问题"
              className="ai-input-field"
            />
          </div>
          <div className="ai-input-actions">
            <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <div className="ai-action">
                  <button 
                    className="ai-clear-btn"
                    onClick={handleClearMessages}
                    title="清除对话记录"
                  >
                    <Eraser size={16} />
                  </button>
                </div>
              </Tooltip.Trigger>
              <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
                清空当前聊天框内容
                <Tooltip.Arrow className="radix-tooltip-arrow" />
              </Tooltip.Content>
            </Tooltip.Root>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <div className="ai-action">
                  <button className="ai-copy-btn" title="复制对话">
                    <Copy size={16} />
                  </button>
                </div>
              </Tooltip.Trigger>
              <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
                复制当前 AI 回答内容
                <Tooltip.Arrow className="radix-tooltip-arrow" />
              </Tooltip.Content>
            </Tooltip.Root>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <div className="ai-action">
                  <button
                    onClick={handleSubmit}
                    disabled={!question.trim() || isLoading}
                    className="ai-submit-btn"
                    title="提交（Enter）"
                  >
                    <span className="ai-submit-text">提交</span>
                    <CornerDownLeft size={16} />
                  </button>
                </div>
              </Tooltip.Trigger>
              <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
                提交当前问题给到 AI
                <Tooltip.Arrow className="radix-tooltip-arrow" />
              </Tooltip.Content>
            </Tooltip.Root>
            </Tooltip.Provider>
          </div>
        </WindowFooter>
      </motion.div>
    </div>
  );
}
