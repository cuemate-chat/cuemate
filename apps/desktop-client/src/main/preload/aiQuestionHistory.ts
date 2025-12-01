import { contextBridge, ipcRenderer } from 'electron';

const api = {
  showHistory: () => ipcRenderer.invoke('show-ai-question-history'),
  hideHistory: () => ipcRenderer.invoke('hide-ai-question-history'),
  toggleHistory: () => ipcRenderer.invoke('toggle-ai-question-history'),
  closeSelf: () => ipcRenderer.invoke('hide-ai-question-history'),
  showAIQuestion: () => ipcRenderer.invoke('show-ai-question'),
  getUserData: () => ipcRenderer.invoke('get-user-data'),
  loadConversation: (data: any) => ipcRenderer.invoke('load-conversation', data),

  // === interviewId 持久化 API ===
  interviewId: {
    get: () => ipcRenderer.invoke('interview-id-get'),
    set: (interviewId: string | null) => ipcRenderer.invoke('interview-id-set', interviewId),
    clear: () => ipcRenderer.invoke('interview-id-clear'),
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
