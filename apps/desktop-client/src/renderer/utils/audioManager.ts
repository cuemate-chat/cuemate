// apps/desktop-client/src/renderer/utils/audioManager.ts

import { createLogger } from '../../utils/rendererLogger.js';

const log = createLogger('AudioManager');

type InterviewType = 'mock-interview' | 'interview-training';

/**
 * 麦克风控制器映射
 */
const microphoneControllers = new Map<InterviewType, any>();

/**
 * 音量检测器映射
 */
const voiceCoordinators = new Map<InterviewType, any>();

/**
 * 启动麦克风
 */
export async function startMicrophone(type: InterviewType, controller: any): Promise<void> {
  // 如果已存在，先停止
  const existing = microphoneControllers.get(type);
  if (existing) {
    if (typeof existing.stop === 'function') {
      await existing.stop();
    }
  }

  microphoneControllers.set(type, controller);
  log.debug('startMicrophone', '麦克风已启动', { type });
}

/**
 * 停止麦克风（但不销毁）
 */
export async function stopMicrophone(type: InterviewType): Promise<void> {
  const controller = microphoneControllers.get(type);
  if (controller) {
    if (typeof controller.stop === 'function') {
      await controller.stop();
    }
    log.debug('stopMicrophone', '麦克风已停止', { type });
  }
}

/**
 * 销毁麦克风（完全清理）
 */
export async function destroyMicrophone(type: InterviewType): Promise<void> {
  const controller = microphoneControllers.get(type);
  if (controller) {
    if (typeof controller.stop === 'function') {
      await controller.stop();
    }
    microphoneControllers.delete(type);
    log.debug('destroyMicrophone', '麦克风已销毁', { type });
  }
}

/**
 * 获取麦克风控制器
 */
export function getMicrophoneController(type: InterviewType): any {
  return microphoneControllers.get(type) || null;
}

/**
 * 初始化音量检测器
 */
export function initVoiceCoordinator(type: InterviewType, coordinator: any): void {
  // 如果已存在，先销毁
  const existing = voiceCoordinators.get(type);
  if (existing) {
    if (typeof existing.destroy === 'function') {
      existing.destroy();
    }
  }

  voiceCoordinators.set(type, coordinator);
  log.debug('initVoiceCoordinator', '音量检测器已初始化', { type });
}

/**
 * 获取音量检测器
 */
export function getVoiceCoordinator(type: InterviewType): any {
  return voiceCoordinators.get(type) || null;
}

/**
 * 销毁音量检测器
 */
export function destroyVoiceCoordinator(type: InterviewType): void {
  const coordinator = voiceCoordinators.get(type);
  if (coordinator) {
    if (typeof coordinator.destroy === 'function') {
      coordinator.destroy();
    }
    voiceCoordinators.delete(type);
    log.debug('destroyVoiceCoordinator', '音量检测器已销毁', { type });
  }
}

/**
 * 清理所有资源
 */
export async function cleanup(): Promise<void> {
  // 停止所有麦克风
  for (const [, controller] of microphoneControllers.entries()) {
    if (typeof controller.stop === 'function') {
      await controller.stop();
    }
  }
  microphoneControllers.clear();

  // 销毁所有音量检测器
  for (const [, coordinator] of voiceCoordinators.entries()) {
    if (typeof coordinator.destroy === 'function') {
      coordinator.destroy();
    }
  }
  voiceCoordinators.clear();

  log.debug('cleanup', '所有资源已清理');
}
