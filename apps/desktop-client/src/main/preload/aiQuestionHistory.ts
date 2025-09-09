import { contextBridge, ipcRenderer } from 'electron';

const api = {
  showHistory: () => ipcRenderer.invoke('show-ai-question-history'),
  hideHistory: () => ipcRenderer.invoke('hide-ai-question-history'),
  toggleHistory: () => ipcRenderer.invoke('toggle-ai-question-history'),
  closeSelf: () => ipcRenderer.invoke('hide-ai-question-history'),
  showAIQuestion: () => ipcRenderer.invoke('show-ai-question'),
  getUserData: () => ipcRenderer.invoke('get-user-data'),
  loadConversation: (data: any) => ipcRenderer.invoke('load-conversation', data),
};

contextBridge.exposeInMainWorld('electronHistoryAPI', api);

console.log('AI 问答历史窗口预加载脚本已加载');
