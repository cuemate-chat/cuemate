import { contextBridge, ipcRenderer } from 'electron';

const api = {
  showHistory: () => ipcRenderer.invoke('show-ai-question-history'),
  hideHistory: () => ipcRenderer.invoke('hide-ai-question-history'),
  toggleHistory: () => ipcRenderer.invoke('toggle-ai-question-history'),
  closeSelf: () => ipcRenderer.invoke('hide-ai-question-history'),
  showAIQuestion: () => ipcRenderer.invoke('show-ai-question'),
  getUserData: () => ipcRenderer.invoke('get-user-data'),
  loadConversation: (data: any) => ipcRenderer.invoke('load-conversation', data),

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
};

contextBridge.exposeInMainWorld('electronHistoryAPI', api);

console.log('AI 问答历史窗口预加载脚本已加载');
