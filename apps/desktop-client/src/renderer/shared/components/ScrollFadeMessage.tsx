/**
 * 滚动渐变消息组件
 * 整合动画和渐变效果的完整消息组件
 */

import React, { useState } from 'react';
import { logger } from '../../../utils/rendererLogger.js';
import { Copy, Check } from 'lucide-react';
import { AnimatedMessage, AnimatedMessageProps } from './AnimatedMessage';
import { renderContentByLines, LineRenderOptions } from '../../utils/messageRenderer';
import { FadeConfig } from '../../utils/fadeCalculator';

export interface MessageData {
  id: string;
  type: 'user' | 'ai';
  content: string;
}

export interface ScrollFadeMessageProps extends Omit<AnimatedMessageProps, 'children'> {
  /** 消息数据 */
  message: MessageData;
  /** 渲染选项 */
  renderOptions?: LineRenderOptions;
  /** 消息容器类名 */
  messageClassName?: string;
  /** 消息内容容器类名 */
  contentClassName?: string;
  /** 自定义渲染函数 */
  customRender?: (message: MessageData, renderOptions?: LineRenderOptions) => React.ReactElement[];
}

/**
 * 基础滚动渐变消息组件
 */
export const ScrollFadeMessage: React.FC<ScrollFadeMessageProps> = ({
  message,
  renderOptions,
  messageClassName,
  contentClassName,
  customRender,
  ...animationProps
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const defaultMessageClassName = `ai-message ai-message-${message.type}`;
  const defaultContentClassName = 'ai-message-content';

  const renderedContent = customRender
    ? customRender(message, renderOptions)
    : renderContentByLines(message.content, renderOptions);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      logger.error(`复制失败: ${error}`);
    }
  };

  return (
    <AnimatedMessage {...animationProps}>
      <div 
        className={`${messageClassName || defaultMessageClassName} ${isHovered ? 'message-hovered' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={contentClassName || defaultContentClassName}>
          {renderedContent}
        </div>
        {isHovered && (
          <button
            className="message-copy-btn"
            onClick={handleCopy}
            title={copied ? '已复制' : '复制内容'}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        )}
      </div>
    </AnimatedMessage>
  );
};

/**
 * 消息列表组件 - 整合自动滚动
 */
export interface ScrollFadeMessageListProps {
  /** 消息列表 */
  messages: MessageData[];
  /** 是否正在加载 */
  isLoading?: boolean;
  /** 加载组件 */
  loadingComponent?: React.ReactNode;
  /** 容器类名 */
  containerClassName?: string;
  /** 消息列表类名 */
  messagesClassName?: string;
  /** 动画配置 */
  animationProps?: Partial<AnimatedMessageProps>;
  /** 渲染配置 */
  renderOptions?: LineRenderOptions;
  /** 自定义消息渲染 */
  customMessageRender?: (message: MessageData, index: number, renderOptions?: LineRenderOptions) => React.ReactNode;
}

export const ScrollFadeMessageList = React.forwardRef<HTMLDivElement, ScrollFadeMessageListProps>(({
  messages,
  isLoading = false,
  loadingComponent,
  containerClassName = 'ai-window-body',
  messagesClassName = 'ai-messages',
  animationProps = {},
  renderOptions,
  customMessageRender
}, ref) => {
  const defaultLoadingComponent = (
    <div className="ai-message ai-message-ai">
      <div className="ai-message-content">
        <div className="ai-loading-spinner" />
      </div>
    </div>
  );

  return (
    <div className={containerClassName} ref={ref}>
      <div className={messagesClassName}>
        {messages.map((message, index) => {
          if (customMessageRender) {
            return (
              <React.Fragment key={message.id}>
                {customMessageRender(message, index, renderOptions)}
              </React.Fragment>
            );
          }

          return (
            <ScrollFadeMessage
              key={message.id}
              message={message}
              index={index}
              renderOptions={renderOptions}
              {...animationProps}
            />
          );
        })}
        {isLoading && (loadingComponent || defaultLoadingComponent)}
      </div>
    </div>
  );
});

ScrollFadeMessageList.displayName = 'ScrollFadeMessageList';

/**
 * 预设消息组件
 */

/** AI 问答消息组件 */
export const AIQuestionMessage: React.FC<Omit<ScrollFadeMessageProps, 'renderOptions'>> = (props) => (
  <ScrollFadeMessage
    {...props}
    renderOptions={{
      lineClassName: 'message-line',
      codeBlockClassName: 'ai-code-block',
      inlineCodeClassName: 'ai-inline-code'
    }}
  />
);

/** 简单文本消息组件 */
export const SimpleTextMessage: React.FC<Omit<ScrollFadeMessageProps, 'renderOptions' | 'customRender'>> = ({
  message,
  ...props
}) => (
  <ScrollFadeMessage
    {...props}
    message={message}
    customRender={(msg) => [
      <div key="simple-text" style={{ whiteSpace: 'pre-wrap' }}>
        {msg.content}
      </div>
    ]}
  />
);

/**
 * 消息组件工厂函数
 */
export interface MessageComponentConfig {
  /** 默认动画配置 */
  defaultAnimation?: Partial<AnimatedMessageProps>;
  /** 默认渲染配置 */
  defaultRender?: LineRenderOptions;
  /** 默认样式类名 */
  defaultClassName?: {
    message?: string;
    content?: string;
  };
}

/**
 * 创建自定义消息组件
 * @param config 组件配置
 * @returns 自定义消息组件
 */
export const createMessageComponent = (config: MessageComponentConfig = {}) => {
  const {
    defaultAnimation = {},
    defaultRender = {},
    defaultClassName = {}
  } = config;

  return React.forwardRef<HTMLDivElement, ScrollFadeMessageProps>((props, ref) => {
    const mergedAnimationProps = { ...defaultAnimation, ...props };
    const mergedRenderOptions = { ...defaultRender, ...props.renderOptions };
    const mergedMessageClassName = props.messageClassName || defaultClassName.message;
    const mergedContentClassName = props.contentClassName || defaultClassName.content;

    return (
      <div ref={ref}>
        <ScrollFadeMessage
          {...mergedAnimationProps}
          renderOptions={mergedRenderOptions}
          messageClassName={mergedMessageClassName}
          contentClassName={mergedContentClassName}
        />
      </div>
    );
  });
};

/**
 * 高阶组件：为消息组件添加渐变效果
 */
export interface WithScrollFadeProps {
  /** 渐变配置 */
  fadeConfig?: FadeConfig;
}

export const withScrollFade = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return React.forwardRef<any, P & WithScrollFadeProps>((props, ref) => {
    const { fadeConfig, ...componentProps } = props;
    
    // 这里可以添加渐变相关的逻辑
    // 实际的渐变效果由 useScrollFadeEffect Hook 处理
    
    return <Component {...(componentProps as P)} ref={ref} />;
  });
};