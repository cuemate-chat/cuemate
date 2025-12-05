import { contextBridge, ipcRenderer } from 'electron';

const api = {
  showHistory: () => ipcRenderer.invoke('show-ai-question-history'),
  hideHistory: () => ipcRenderer.invoke('hide-ai-question-history'),
  toggleHistory: () => ipcRenderer.invoke('toggle-ai-question-history'),
  closeSelf: () => ipcRenderer.invoke('hide-ai-question-history'),
  showAIQuestion: () => ipcRenderer.invoke('show-ai-question'),
  getUserData: () => ipcRenderer.invoke('get-user-data'),
  loadConversation: (data: any) => ipcRenderer.invoke('load-conversation', data),

  // === 面试 ID 持久化 API（用于恢复面试）===
  resumingInterviewIds: {
    get: () => ipcRenderer.invoke('resuming-interview-ids-get'),
  },
  mockInterviewId: {
    set: (mockInterviewId: string) => ipcRenderer.invoke('mock-interview-id-set', mockInterviewId),
    clear: () => ipcRenderer.invoke('mock-interview-id-clear'),
  },
  trainingInterviewId: {
    set: (trainingInterviewId: string) => ipcRenderer.invoke('training-interview-id-set', trainingInterviewId),
    clear: () => ipcRenderer.invoke('training-interview-id-clear'),
  },

  // === 模式切换 API ===
  switchToMode: (mode: 'voice-qa' | 'mock-interview' | 'interview-training') =>
    ipcRenderer.invoke('switch-to-mode', mode),

  // === 事件监听 API ===
  onModeChange: (
    callback: (mode: 'voice-qa' | 'mock-interview' | 'interview-training') => void,
  ) => {
    ipcRenderer.on('mode-change', (_event, mode) => callback(mode));
  },
  removeModeChangeListener: () => {
    ipcRenderer.removeAllListeners('mode-change');
  },

  // === 点击穿透模式 API ===
  clickThrough: {
    get: () => ipcRenderer.invoke('click-through-get'),
    set: (enabled: boolean) => ipcRenderer.invoke('click-through-set', enabled),
    onChanged: (callback: (enabled: boolean) => void) => {
      const handler = (_e: any, enabled: boolean) => callback(enabled);
      ipcRenderer.on('click-through-changed', handler);
      return () => ipcRenderer.off('click-through-changed', handler);
    },
  },
};

contextBridge.exposeInMainWorld('electronHistoryAPI', api);
