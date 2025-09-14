/**
 * 动画消息组件
 * 封装ScrollAnimation的标准化配置
 */

import React from 'react';
import ScrollAnimation from 'react-animate-on-scroll';

export interface AnimatedMessageProps {
  /** 子元素 */
  children: React.ReactNode;
  /** 消息索引，用于计算延迟时间 */
  index: number;
  /** 动画类型，默认'animate__fadeInUp' */
  animationType?: string;
  /** 动画持续时间，默认0.6秒 */
  duration?: number;
  /** 每个消息的延迟间隔，默认30ms */
  delayStep?: number;
  /** 最大延迟时间，默认500ms */
  maxDelay?: number;
  /** 触发偏移量，默认0 */
  offset?: number;
  /** 是否只动画一次，默认true */
  animateOnce?: boolean;
  /** 是否初始可见，默认true */
  initiallyVisible?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

/**
 * 基础动画消息组件
 */
export const AnimatedMessage: React.FC<AnimatedMessageProps> = ({
  children,
  index,
  animationType = 'animate__fadeInUp',
  duration = 0.6,
  delayStep = 30,
  maxDelay = 500,
  offset = 0,
  animateOnce = true,
  initiallyVisible = true,
  className,
  style
}) => {
  const delay = Math.min(index * delayStep, maxDelay);

  return (
    <ScrollAnimation
      animateIn={animationType}
      animateOnce={animateOnce}
      delay={delay}
      duration={duration}
      offset={offset}
      initiallyVisible={initiallyVisible}
    >
      {className || style ? (
        <div className={className} style={style}>
          {children}
        </div>
      ) : (
        children
      )}
    </ScrollAnimation>
  );
};

/**
 * 预设的动画类型
 */
export const AnimationTypes = {
  FADE_IN_UP: 'animate__fadeInUp',
  FADE_IN_DOWN: 'animate__fadeInDown',
  FADE_IN_LEFT: 'animate__fadeInLeft',
  FADE_IN_RIGHT: 'animate__fadeInRight',
  FADE_IN: 'animate__fadeIn',
  SLIDE_IN_UP: 'animate__slideInUp',
  SLIDE_IN_DOWN: 'animate__slideInDown',
  ZOOM_IN: 'animate__zoomIn',
  BOUNCE_IN: 'animate__bounceIn'
} as const;

export type AnimationType = typeof AnimationTypes[keyof typeof AnimationTypes];

/**
 * 快速创建不同动画类型的组件
 */

/** 淡入上升动画（默认） */
export const FadeInUpMessage: React.FC<Omit<AnimatedMessageProps, 'animationType'>> = (props) => (
  <AnimatedMessage {...props} animationType={AnimationTypes.FADE_IN_UP} />
);

/** 淡入下降动画 */
export const FadeInDownMessage: React.FC<Omit<AnimatedMessageProps, 'animationType'>> = (props) => (
  <AnimatedMessage {...props} animationType={AnimationTypes.FADE_IN_DOWN} />
);

/** 从左淡入动画 */
export const FadeInLeftMessage: React.FC<Omit<AnimatedMessageProps, 'animationType'>> = (props) => (
  <AnimatedMessage {...props} animationType={AnimationTypes.FADE_IN_LEFT} />
);

/** 从右淡入动画 */
export const FadeInRightMessage: React.FC<Omit<AnimatedMessageProps, 'animationType'>> = (props) => (
  <AnimatedMessage {...props} animationType={AnimationTypes.FADE_IN_RIGHT} />
);

/** 简单淡入动画 */
export const FadeInMessage: React.FC<Omit<AnimatedMessageProps, 'animationType'>> = (props) => (
  <AnimatedMessage {...props} animationType={AnimationTypes.FADE_IN} />
);

/** 滑入上升动画 */
export const SlideInUpMessage: React.FC<Omit<AnimatedMessageProps, 'animationType'>> = (props) => (
  <AnimatedMessage {...props} animationType={AnimationTypes.SLIDE_IN_UP} />
);

/** 缩放淡入动画 */
export const ZoomInMessage: React.FC<Omit<AnimatedMessageProps, 'animationType'>> = (props) => (
  <AnimatedMessage {...props} animationType={AnimationTypes.ZOOM_IN} />
);

/** 弹跳淡入动画 */
export const BounceInMessage: React.FC<Omit<AnimatedMessageProps, 'animationType'>> = (props) => (
  <AnimatedMessage {...props} animationType={AnimationTypes.BOUNCE_IN} />
);

/**
 * 配置预设
 */
export const AnimationPresets = {
  /** 快速：短延迟，快动画 */
  FAST: {
    duration: 0.4,
    delayStep: 20,
    maxDelay: 300
  },
  /** 正常：默认设置 */
  NORMAL: {
    duration: 0.6,
    delayStep: 30,
    maxDelay: 500
  },
  /** 慢速：长延迟，慢动画 */
  SLOW: {
    duration: 0.8,
    delayStep: 50,
    maxDelay: 800
  },
  /** 顺序：没有并行，严格顺序 */
  SEQUENTIAL: {
    duration: 0.5,
    delayStep: 100,
    maxDelay: 2000
  }
} as const;

export type AnimationPreset = keyof typeof AnimationPresets;

/**
 * 带预设的动画组件
 */
export interface PresetAnimatedMessageProps extends Omit<AnimatedMessageProps, 'duration' | 'delayStep' | 'maxDelay'> {
  preset?: AnimationPreset;
}

export const PresetAnimatedMessage: React.FC<PresetAnimatedMessageProps> = ({
  preset = 'NORMAL',
  ...props
}) => {
  const presetConfig = AnimationPresets[preset];
  
  return (
    <AnimatedMessage
      {...props}
      {...presetConfig}
    />
  );
};