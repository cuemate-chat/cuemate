import { contextBridge, ipcRenderer } from 'electron';
import type { FrontendLogMessage } from '../../shared/types.js';

/**
 * Interviewer窗口预加载脚本
 * 为Interviewer窗口的渲染进程安全地暴露主进程 API
 */

// 定义Interviewer窗口可用的 API
const interviewerAPI = {
  // === 窗口管理 API ===
  showInterviewer: () => ipcRenderer.invoke('show-interviewer'),
  hideInterviewer: () => ipcRenderer.invoke('hide-interviewer'),
  toggleInterviewer: () => ipcRenderer.invoke('toggle-interviewer'),
  closeSelf: () => ipcRenderer.invoke('hide-interviewer'),

  // === AI 窗口管理 API ===
  showAIQuestion: () => ipcRenderer.invoke('show-ai-question'),
  hideAIQuestion: () => ipcRenderer.invoke('hide-ai-question'),
  toggleAIQuestion: () => ipcRenderer.invoke('toggle-ai-question'),

  // === 模式切换 API ===
  switchToMode: (mode: 'voice-qa' | 'mock-interview' | 'interview-training') =>
    ipcRenderer.invoke('switch-to-mode', mode),

  // === 控制条按钮状态 API ===
  setAskAIButtonDisabled: (disabled: boolean) =>
    ipcRenderer.invoke('set-ask-ai-button-disabled', disabled),

  // === 日志 API ===
  log: (logMessage: FrontendLogMessage) => ipcRenderer.invoke('frontend-log', logMessage),

  // === 开发工具 API ===
  openDevTools: () => ipcRenderer.invoke('open-dev-tools'),

  // === 语音合成（macOS say） ===
  speakText: (voice: string, text: string) => ipcRenderer.invoke('speak-text', { voice, text }),

  // === 系统音频扬声器捕获 API ===
  systemAudioCapture: {
    isAvailable: () => ipcRenderer.invoke('system-audio-capture-available'),
    getStatus: () => ipcRenderer.invoke('system-audio-capture-status'),
    getDevices: () => ipcRenderer.invoke('system-audio-get-devices'),
    startCapture: (options?: { sampleRate?: number; channels?: number }) =>
      ipcRenderer.invoke('system-audio-capture-start', options),
    stopCapture: () => ipcRenderer.invoke('system-audio-capture-stop'),
  },

  // === 系统音频扬声器音频测试 API ===
  audioTest: {
    startMicTest: (options?: { deviceId?: string }) =>
      ipcRenderer.invoke('mic-test-start', options),
    startSpeakerTest: (options?: { deviceId?: string }) =>
      ipcRenderer.invoke('speaker-test-start', options),
    stopTest: () => ipcRenderer.invoke('test-stop'),
    sendMicAudio: (audioData: ArrayBuffer) => ipcRenderer.invoke('mic-send-audio', audioData),
  },

  // === 事件监听 API ===
  on: (channel: string, callback: (...args: any[]) => void) => {
    // 只允许特定的事件频道
    const allowedChannels = [
      'voice-recognition-result',
      'voice-recognition-error',
      'voice-recognition-start',
      'voice-recognition-stop',
      'system-audio-data',
      'system-audio-error',
      'mic-test-status',
      'mic-test-result',
      'speaker-test-status',
      'speaker-test-result',
      'speaker-audio-data',
    ];

    if (allowedChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    } else {
      console.warn(`Interviewer窗口不允许监听频道: ${channel}`);
    }
  },

  off: (channel: string, callback?: (...args: any[]) => void) => {
    if (callback) {
      ipcRenderer.off(channel, callback);
    } else {
      ipcRenderer.removeAllListeners(channel);
    }
  },

  // === 工具方法 ===
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
};

// 日志功能的便捷方法
const logger = {
  info: (message: string) => interviewerAPI.log({ level: 'info', message, timestamp: Date.now() }),
  warn: (message: string) => interviewerAPI.log({ level: 'warn', message, timestamp: Date.now() }),
  error: (message: string) =>
    interviewerAPI.log({ level: 'error', message, timestamp: Date.now() }),
  debug: (message: string) =>
    interviewerAPI.log({ level: 'debug', message, timestamp: Date.now() }),
};

// 通过 contextBridge 安全地暴露 API
contextBridge.exposeInMainWorld('electronAPI', interviewerAPI);
contextBridge.exposeInMainWorld('electronInterviewerAPI', interviewerAPI);
contextBridge.exposeInMainWorld('logger', logger);

// 类型定义（供 TypeScript 使用）
export type InterviewerAPI = typeof interviewerAPI;
export type Logger = typeof logger;

console.log('Interviewer窗口预加载脚本已加载');
