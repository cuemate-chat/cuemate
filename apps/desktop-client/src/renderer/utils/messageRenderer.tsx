/**
 * 消息内容渲染工具函数
 * 支持 Markdown 解析和行级别拆分
 */

import React from 'react';

export interface ParsedContent {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

export interface LineRenderOptions {
  /** 行级别 CSS 类名，默认'message-line' */
  lineClassName?: string;
  /** 行级别样式 */
  lineStyle?: React.CSSProperties;
  /** 代码块 CSS 类名，默认'ai-code-block' */
  codeBlockClassName?: string;
  /** 内联代码 CSS 类名，默认'ai-inline-code' */
  inlineCodeClassName?: string;
}

/**
 * 解析 Markdown 格式的代码块
 * @param text 原始文本
 * @returns 解析后的内容数组
 */
export const parseMarkdown = (text: string): ParsedContent[] => {
  const parts: ParsedContent[] = [];
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

/**
 * 处理单行文本的内联代码
 * @param lineText 行文本
 * @param partIndex 部分索引
 * @param lineIndex 行索引
 * @param inlineCodeClassName 内联代码类名
 * @returns 处理后的 React 元素数组
 */
export const processInlineCode = (
  lineText: string,
  partIndex: number,
  lineIndex: number,
  inlineCodeClassName: string = 'ai-inline-code'
): (string | React.ReactElement)[] => {
  const parts: (string | React.ReactElement)[] = [];
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
      <code 
        key={`${partIndex}-${lineIndex}-${match.index}`} 
        className={inlineCodeClassName}
      >
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

/**
 * 将内容按行拆分并渲染为 React 元素
 * @param content 原始文本内容
 * @param options 渲染选项
 * @returns React 元素数组
 */
export const renderContentByLines = (
  content: string,
  options: LineRenderOptions = {}
): React.ReactElement[] => {
  const {
    lineClassName = 'message-line',
    lineStyle = { margin: 0, lineHeight: '1.6' },
    codeBlockClassName = 'ai-code-block',
    inlineCodeClassName = 'ai-inline-code'
  } = options;

  const parts = parseMarkdown(content);
  
  return parts.map((part, partIndex) => {
    if (part.type === 'code') {
      // 代码块按行拆分
      const codeLines = part.content.split('\n');
      
      return (
        <pre key={partIndex} className={codeBlockClassName}>
          <code className={`language-${part.language}`}>
            {codeLines.map((codeLine, lineIndex) => (
              <p 
                key={`code-${partIndex}-line-${lineIndex}`}
                className={lineClassName}
                data-line={lineIndex}
                style={lineStyle}
              >
                {codeLine || '\u00A0'}
              </p>
            ))}
          </code>
        </pre>
      );
    } else {
      // 普通文本按行拆分
      const lines = part.content.split('\n');
      
      return (
        <div key={partIndex}>
          {lines.map((line, lineIndex) => (
            <p 
              key={`${partIndex}-line-${lineIndex}`}
              className={lineClassName}
              data-line={lineIndex}
              style={lineStyle}
            >
              {line ? processInlineCode(line, partIndex, lineIndex, inlineCodeClassName) : '\u00A0'}
            </p>
          ))}
        </div>
      );
    }
  });
};

/**
 * 快速渲染简单文本（不支持 Markdown）
 * @param content 文本内容
 * @param options 渲染选项
 * @returns React 元素数组
 */
export const renderSimpleTextByLines = (
  content: string,
  options: LineRenderOptions = {}
): React.ReactElement[] => {
  const {
    lineClassName = 'message-line',
    lineStyle = { margin: 0, lineHeight: '1.6' }
  } = options;

  const lines = content.split('\n');
  
  return [
    <div key="simple-text">
      {lines.map((line, lineIndex) => (
        <p 
          key={`line-${lineIndex}`}
          className={lineClassName}
          data-line={lineIndex}
          style={lineStyle}
        >
          {line || '\u00A0'}
        </p>
      ))}
    </div>
  ];
};