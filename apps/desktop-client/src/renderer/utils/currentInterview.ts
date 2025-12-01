/**
 * 当前面试 ID 管理工具
 * 直接使用 voiceState，不再单独存 localStorage
 */

import { clearVoiceState, getVoiceState, setVoiceState } from '../../utils/voiceState';

export const currentInterview = {
  /**
   * 设置当前面试 ID
   */
  set(interviewId: string | undefined): void {
    if (interviewId) {
      const current = getVoiceState();
      setVoiceState({
        ...current,
        interviewId,
      });
    }
  },

  /**
   * 获取当前面试 ID
   */
  get(): string | undefined {
    const voiceState = getVoiceState();
    return voiceState.interviewId || undefined;
  },

  /**
   * 清除当前面试 ID
   */
  clear(): void {
    clearVoiceState();
  },

  /**
   * 检查是否存在当前面试
   */
  exists(): boolean {
    const voiceState = getVoiceState();
    return !!voiceState.interviewId;
  },
};
