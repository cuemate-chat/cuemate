/**
 * 滚动渐变效果Hook
 * 提供高度可配置的滚动渐变功能
 */

import { useEffect, RefObject } from 'react';
import {
  FadeConfig,
  calculateStepAlpha,
  getElementPosition,
  isInFadeZone
} from '../utils/fadeCalculator';

export interface ScrollFadeConfig extends FadeConfig {
  /** AI消息选择器，默认'.ai-message-ai .message-line' */
  aiSelector?: string;
  /** User消息选择器，默认'.ai-message-user .ai-message-content' */
  userSelector?: string;
  /** User消息第一行选择器，默认'.message-line[data-line="0"]' */
  userFirstLineSelector?: string;
  /** 是否启用AI消息渐变，默认true */
  enableAiFade?: boolean;
  /** 是否启用User消息渐变，默认true */
  enableUserFade?: boolean;
  /** 过渡动画时间，默认'0.1s ease' */
  transition?: string;
}

export interface UserMessageStrategy {
  /** 短消息策略：框变色 */
  SHORT: 'frame-fade';
  /** 长消息策略：第一行文字变色 */
  LONG: 'first-line-fade';
}

/**
 * 滚动渐变效果Hook
 * @param containerRef 容器引用
 * @param config 配置选项
 * @returns 无返回值，直接操作DOM
 */
export const useScrollFadeEffect = (
  containerRef: RefObject<HTMLElement>,
  config: ScrollFadeConfig = {}
): void => {
  const {
    fadeZoneHeight = 60,
    minAlpha = 0.5,
    stepSize = 10,
    alphaStep = 0.1,
    aiSelector = '.ai-message-ai .message-line',
    userSelector = '.ai-message-user .ai-message-content',
    userFirstLineSelector = '.message-line[data-line="0"]',
    enableAiFade = true,
    enableUserFade = true,
    transition = 'opacity 0.1s ease'
  } = config;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // 处理AI消息行级别渐变
      if (enableAiFade) {
        const aiLines = container.querySelectorAll(aiSelector);
        aiLines.forEach((lineEl) => {
          const position = getElementPosition(lineEl, container);
          
          if (isInFadeZone(position, fadeZoneHeight)) {
            const distanceFromTop = Math.max(0, position.relativeTop);
            const alpha = calculateStepAlpha(distanceFromTop, {
              fadeZoneHeight,
              minAlpha,
              stepSize,
              alphaStep
            });
            
            const element = lineEl as HTMLElement;
            element.style.opacity = alpha.toString();
            element.style.transition = transition;
          } else if (position.relativeTop >= fadeZoneHeight) {
            // 在渐变区域下方，完全可见
            (lineEl as HTMLElement).style.opacity = '1';
          } else {
            // 在渐变区域上方，保持最小透明度
            (lineEl as HTMLElement).style.opacity = minAlpha.toString();
          }
        });
      }

      // 处理User消息智能渐变
      if (enableUserFade) {
        const userMessages = container.querySelectorAll(userSelector);
        userMessages.forEach((messageEl) => {
          const position = getElementPosition(messageEl, container);
          
          if (position.relativeBottom < fadeZoneHeight) {
            // 短消息策略：框变色
            if (position.relativeTop < fadeZoneHeight) {
              const distanceFromTop = Math.max(0, position.relativeTop);
              const alpha = calculateStepAlpha(distanceFromTop, {
                fadeZoneHeight,
                minAlpha,
                stepSize,
                alphaStep
              });
              
              const element = messageEl as HTMLElement;
              element.style.opacity = alpha.toString();
              element.style.transition = transition;
            }
          } else if (position.relativeTop < fadeZoneHeight) {
            // 长消息策略：第一行文字变色
            const element = messageEl as HTMLElement;
            element.style.opacity = '1'; // 框保持原色
            
            // 处理第一行透明度
            const firstLine = messageEl.querySelector(userFirstLineSelector) as HTMLElement;
            if (firstLine) {
              const firstLinePosition = getElementPosition(firstLine, container);
              
              if (firstLinePosition.relativeTop < fadeZoneHeight) {
                const distanceFromTop = Math.max(0, firstLinePosition.relativeTop);
                const alpha = calculateStepAlpha(distanceFromTop, {
                  fadeZoneHeight,
                  minAlpha,
                  stepSize,
                  alphaStep
                });
                
                firstLine.style.opacity = alpha.toString();
                firstLine.style.transition = transition;
              } else {
                firstLine.style.opacity = '1';
              }
            }
          } else {
            // 完全在渐变区域外
            const element = messageEl as HTMLElement;
            element.style.opacity = '1';
            const firstLine = messageEl.querySelector(userFirstLineSelector) as HTMLElement;
            if (firstLine) {
              firstLine.style.opacity = '1';
            }
          }
        });
      }
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll(); // 初始化调用

    return () => container.removeEventListener('scroll', handleScroll);
  }, [
    fadeZoneHeight,
    minAlpha,
    stepSize,
    alphaStep,
    aiSelector,
    userSelector,
    userFirstLineSelector,
    enableAiFade,
    enableUserFade,
    transition
  ]);
};

/**
 * 简化版滚动渐变Hook - 只处理行级别渐变
 * @param containerRef 容器引用
 * @param selector 元素选择器
 * @param config 配置选项
 */
export const useSimpleScrollFade = (
  containerRef: RefObject<HTMLElement>,
  selector: string = '.message-line',
  config: FadeConfig = {}
): void => {
  const {
    fadeZoneHeight = 60,
    minAlpha = 0.5,
    stepSize = 10,
    alphaStep = 0.1
  } = config;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const elements = container.querySelectorAll(selector);
      elements.forEach((element) => {
        const position = getElementPosition(element, container);
        
        if (isInFadeZone(position, fadeZoneHeight)) {
          const distanceFromTop = Math.max(0, position.relativeTop);
          const alpha = calculateStepAlpha(distanceFromTop, {
            fadeZoneHeight,
            minAlpha,
            stepSize,
            alphaStep
          });
          
          const htmlElement = element as HTMLElement;
          htmlElement.style.opacity = alpha.toString();
          htmlElement.style.transition = 'opacity 0.1s ease';
        } else if (position.relativeTop >= fadeZoneHeight) {
          (element as HTMLElement).style.opacity = '1';
        } else {
          (element as HTMLElement).style.opacity = minAlpha.toString();
        }
      });
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, [selector, fadeZoneHeight, minAlpha, stepSize, alphaStep]);
};