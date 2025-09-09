/**
 * 透明度计算工具函数
 * 用于滚动渐变效果的透明度计算
 */

export interface FadeConfig {
  /** 渐变区域高度，默认60px */
  fadeZoneHeight?: number;
  /** 最小透明度，默认0.5 */
  minAlpha?: number;
  /** 渐变步长，默认10px */
  stepSize?: number;
  /** 每步透明度递减值，默认0.1 */
  alphaStep?: number;
}

/**
 * 计算阶梯式透明度
 * @param distanceFromTop 元素距离顶部的距离
 * @param config 渐变配置
 * @returns 计算后的透明度值 (0-1)
 */
export const calculateStepAlpha = (
  distanceFromTop: number,
  config: FadeConfig = {}
): number => {
  const {
    fadeZoneHeight = 60,
    minAlpha = 0.5,
    stepSize = 10,
    alphaStep = 0.1
  } = config;

  const steps = Math.floor((fadeZoneHeight - distanceFromTop) / stepSize);
  return Math.max(minAlpha, 1.0 - (steps * alphaStep));
};

/**
 * 计算线性透明度
 * @param distanceFromTop 元素距离顶部的距离
 * @param config 渐变配置
 * @returns 计算后的透明度值 (0-1)
 */
export const calculateLinearAlpha = (
  distanceFromTop: number,
  config: FadeConfig = {}
): number => {
  const {
    fadeZoneHeight = 60,
    minAlpha = 0.5
  } = config;

  const ratio = distanceFromTop / fadeZoneHeight;
  return Math.max(minAlpha, ratio);
};

/**
 * 获取元素相对于容器的位置信息
 * @param element 目标元素
 * @param container 容器元素
 * @returns 位置信息
 */
export const getElementPosition = (
  element: Element,
  container: Element
) => {
  const rect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  
  return {
    relativeTop: rect.top - containerRect.top,
    relativeBottom: rect.top - containerRect.top + rect.height,
    height: rect.height
  };
};

/**
 * 判断元素是否在渐变区域内
 * @param position 元素位置信息
 * @param fadeZoneHeight 渐变区域高度
 * @returns 是否在渐变区域内
 */
export const isInFadeZone = (
  position: { relativeTop: number; relativeBottom: number },
  fadeZoneHeight: number
): boolean => {
  return position.relativeTop < fadeZoneHeight && position.relativeBottom > 0;
};