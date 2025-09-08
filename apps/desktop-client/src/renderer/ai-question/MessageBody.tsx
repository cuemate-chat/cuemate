import { useRef } from 'react';

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

// 渲染消息内容
const renderMessageContent = (content: string) => {
  const parts = parseMarkdown(content);
  
  return parts.map((part, index) => {
    if (part.type === 'code') {
      return (
        <pre key={index} className="ai-code-block">
          <code className={`language-${part.language}`}>
            {part.content}
          </code>
        </pre>
      );
    } else {
      // 处理内联代码和普通文本
      const textParts = [];
      let textIndex = 0;
      const inlineCodeRegex = /`([^`]+)`/g;
      let textMatch;
      
      while ((textMatch = inlineCodeRegex.exec(part.content)) !== null) {
        // 添加代码前的文本
        if (textMatch.index > textIndex) {
          const beforeText = part.content.slice(textIndex, textMatch.index);
          if (beforeText) {
            textParts.push(beforeText);
          }
        }
        
        // 添加内联代码
        textParts.push(
          <code key={`inline-${textMatch.index}`} className="ai-inline-code">
            {textMatch[1]}
          </code>
        );
        
        textIndex = textMatch.index + textMatch[0].length;
      }
      
      // 添加剩余文本
      if (textIndex < part.content.length) {
        textParts.push(part.content.slice(textIndex));
      }
      
      return (
        <span key={index}>
          {textParts}
        </span>
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

  return (
    <div className="ai-window-body" ref={messagesRef}>
      <div className="ai-messages">
        {messages.map((message) => (
          <div key={message.id} className={`ai-message ai-message-${message.type}`}>
            <div className="ai-message-content">
              {renderMessageContent(message.content)}
            </div>
          </div>
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