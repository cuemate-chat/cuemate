/**
 * 当前面试ID管理工具
 * 使用localStorage存储,所有窗口共享,避免React闭包问题
 */

const CURRENT_INTERVIEW_KEY = 'current-interview-id';

export const currentInterview = {
  /**
   * 设置当前面试ID
   */
  set(interviewId: string | undefined): void {
    if (interviewId) {
      localStorage.setItem(CURRENT_INTERVIEW_KEY, interviewId);
    } else {
      localStorage.removeItem(CURRENT_INTERVIEW_KEY);
    }
  },

  /**
   * 获取当前面试ID
   */
  get(): string | undefined {
    const id = localStorage.getItem(CURRENT_INTERVIEW_KEY);
    return id || undefined;
  },

  /**
   * 清除当前面试ID
   */
  clear(): void {
    localStorage.removeItem(CURRENT_INTERVIEW_KEY);
  },

  /**
   * 检查是否存在当前面试
   */
  exists(): boolean {
    return !!localStorage.getItem(CURRENT_INTERVIEW_KEY);
  },
};
