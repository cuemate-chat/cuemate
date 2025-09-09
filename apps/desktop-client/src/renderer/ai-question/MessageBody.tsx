import 'animate.css/animate.min.css';
import { useEffect, useRef } from 'react';
import ScrollAnimation from 'react-animate-on-scroll';

// 解析 Markdown 格式的代码块
const parseMarkdown = (text: string) => {
  const parts = [];
  let lastIndex = 0;
  
  // 匹配代码块 ```language\n...\n```
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  
  while ((match = codeBlockRegex.exec(text)) !== null) {
    // 添加代码块前的文本
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index);
      if (beforeText.trim()) {
        parts.push({ type: 'text', content: beforeText });
      }
    }
    
    // 添加代码块
    parts.push({
      type: 'code',
      language: match[1] || 'text',
      content: match[2].trim()
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // 添加剩余的文本
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    if (remainingText.trim()) {
      parts.push({ type: 'text', content: remainingText });
    }
  }
  
  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
};

// 渲染消息内容 - 行级别拆分版本
const renderMessageContent = (content: string) => {
  const parts = parseMarkdown(content);
  
  return parts.map((part, partIndex) => {
    if (part.type === 'code') {
      // 代码块也按行拆分
      const codeLines = part.content.split('\n');
      
      return (
        <pre key={partIndex} className="ai-code-block">
          <code className={`language-${part.language}`}>
            {codeLines.map((codeLine, lineIndex) => (
              <p 
                key={`code-${partIndex}-line-${lineIndex}`}
                className="message-line"
                data-line={lineIndex}
                style={{ margin: 0, lineHeight: '1.6' }}
              >
                {codeLine || '\u00A0'} {/* 空行使用不间断空格 */}
              </p>
            ))}
          </code>
        </pre>
      );
    } else {
      // 简化版本：先按行拆分，每行单独处理内联代码
      const lines = part.content.split('\n');
      
      return (
        <div key={partIndex}>
          {lines.map((line, lineIndex) => {
            // 处理每行的内联代码
            const processLine = (lineText: string) => {
              const parts = [];
              let lastIndex = 0;
              const inlineCodeRegex = /`([^`]+)`/g;
              let match;
              
              while ((match = inlineCodeRegex.exec(lineText)) !== null) {
                // 添加代码前的文本
                if (match.index > lastIndex) {
                  parts.push(lineText.slice(lastIndex, match.index));
                }
                
                // 添加内联代码
                parts.push(
                  <code key={`${partIndex}-${lineIndex}-${match.index}`} className="ai-inline-code">
                    {match[1]}
                  </code>
                );
                
                lastIndex = match.index + match[0].length;
              }
              
              // 添加剩余文本
              if (lastIndex < lineText.length) {
                parts.push(lineText.slice(lastIndex));
              }
              
              return parts.length > 0 ? parts : [lineText];
            };
            
            return (
              <p 
                key={`${partIndex}-line-${lineIndex}`} 
                className="message-line"
                data-line={lineIndex}
                style={{ margin: 0, lineHeight: '1.6' }}
              >
                {line ? processLine(line) : '\u00A0'} {/* 空行使用不间断空格 */}
              </p>
            );
          })}
        </div>
      );
    }
  });
};

interface MessageBodyProps {
  messages: Array<{id: string, type: 'user' | 'ai', content: string}>;
  isLoading: boolean;
}

export function MessageBody({ messages, isLoading }: MessageBodyProps) {
  const messagesRef = useRef<HTMLDivElement>(null);

  // 滚动到最新消息
  useEffect(() => {
    if (messagesRef.current) {
      const scrollElement = messagesRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [messages, isLoading]);

  // 实现固定位置前几行文字渐变效果
  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;

    const handleScroll = () => {
      
      // 固定区域高度 - 适配AI窗口尺寸
      const fadeZoneHeight = 60;
      
      // 处理AI消息 - 行级别文字透明度控制
      const aiElements = container.querySelectorAll('.ai-message-ai .message-line');
      aiElements.forEach((lineEl) => {
        const rect = lineEl.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const relativeTop = rect.top - containerRect.top;
        const lineBottom = relativeTop + rect.height;
        
        // 只有行在渐变区域内才处理
        if (relativeTop < fadeZoneHeight && lineBottom > 0) {
          const distanceFromTop = Math.max(0, relativeTop);
          // 渐进式透明度：每10px降低0.1透明度，从1.0到0.5
          const steps = Math.floor((fadeZoneHeight - distanceFromTop) / 10);
          const alpha = Math.max(0.5, 1.0 - (steps * 0.1));
          
          (lineEl as HTMLElement).style.opacity = alpha.toString();
          (lineEl as HTMLElement).style.transition = 'opacity 0.1s ease';
        } else if (relativeTop >= fadeZoneHeight) {
          // 在渐变区域下方，完全可见
          (lineEl as HTMLElement).style.opacity = '1';
        } else {
          // 在渐变区域上方，保持最小透明度
          (lineEl as HTMLElement).style.opacity = '0.5';
        }
      });

      // 处理User消息 - 区分短消息和长消息
      const userElements = container.querySelectorAll('.ai-message-user .ai-message-content');
      userElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const relativeTop = rect.top - containerRect.top;
        const relativeBottom = relativeTop + rect.height;
        
        if (relativeBottom < fadeZoneHeight) {
          // 短消息：整个消息都在渐变区域内 - 框变色
          if (relativeTop < fadeZoneHeight) {
            const distanceFromTop = Math.max(0, relativeTop);
            const steps = Math.floor((fadeZoneHeight - distanceFromTop) / 10);
            const alpha = Math.max(0.5, 1.0 - (steps * 0.1));
            
            (el as HTMLElement).style.opacity = alpha.toString();
            (el as HTMLElement).style.transition = 'opacity 0.1s ease';
          }
        } else if (relativeTop < fadeZoneHeight) {
          // 长消息：跨越渐变区域 - 只改变第一行文字颜色
          (el as HTMLElement).style.opacity = '1'; // 框保持原色
          
          // 处理第一行透明度
          const firstLine = el.querySelector('.message-line[data-line="0"]') as HTMLElement;
          if (firstLine) {
            const firstLineRect = firstLine.getBoundingClientRect();
            const firstLineTop = firstLineRect.top - containerRect.top;
            
            if (firstLineTop < fadeZoneHeight) {
              const distanceFromTop = Math.max(0, firstLineTop);
              const steps = Math.floor((fadeZoneHeight - distanceFromTop) / 10);
              const alpha = Math.max(0.5, 1.0 - (steps * 0.1));
              
              firstLine.style.opacity = alpha.toString();
              firstLine.style.transition = 'opacity 0.1s ease';
            } else {
              firstLine.style.opacity = '1';
            }
          }
        } else {
          // 完全在渐变区域外
          (el as HTMLElement).style.opacity = '1';
          const firstLine = el.querySelector('.message-line[data-line="0"]') as HTMLElement;
          if (firstLine) {
            firstLine.style.opacity = '1';
          }
        }
      });
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="ai-window-body" ref={messagesRef}>
      <div className="ai-messages">
        {messages.map((message, index) => (
          <ScrollAnimation
            key={message.id}
            animateIn="animate__fadeInUp"
            animateOnce={true}
            delay={Math.min(index * 30, 500)}
            duration={0.6}
            initiallyVisible={true}
            offset={0}
          >
            <div className={`ai-message ai-message-${message.type}`}>
              <div className="ai-message-content">
                {renderMessageContent(message.content)}
              </div>
            </div>
          </ScrollAnimation>
        ))}
        {isLoading && (
          <div className="ai-message ai-message-ai">
            <div className="ai-message-content">
              <div className="ai-loading-spinner" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}