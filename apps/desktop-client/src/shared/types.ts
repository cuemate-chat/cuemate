// 共享类型定义

export interface WindowConfig {
  id: string;
  label: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
  alwaysOnTop?: boolean;
  frame?: boolean;
  transparent?: boolean;
  skipTaskbar?: boolean;
  resizable?: boolean;
  minimizable?: boolean;
  maximizable?: boolean;
  closable?: boolean;
  focusable?: boolean;
  show?: boolean;
  center?: boolean;
}

export interface WindowPosition {
  x: number;
  y: number;
}

export interface WindowSize {
  width: number;
  height: number;
}

// IPC 消息类型
export interface IPCMessage<T = any> {
  type: string;
  data?: T;
}

// 窗口事件类型
export type WindowEventType =
  | 'window-ready'
  | 'window-show'
  | 'window-hide'
  | 'window-focus'
  | 'window-blur'
  | 'window-close'
  | 'mouse-enter'
  | 'mouse-leave';

// 全局快捷键配置
export interface ShortcutConfig {
  accelerator: string;
  callback: () => void;
}

// 应用状态
export interface AppState {
  isControlBarVisible: boolean;
  isCloseButtonVisible: boolean;
  isMainContentVisible: boolean;
  isAIQuestionVisible: boolean;
  isAIQuestionHistoryVisible?: boolean;
}

// 日志级别
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

// 前端日志消息
export interface FrontendLogMessage {
  level: LogLevel;
  message: string;
  timestamp?: number;
}

// 平台类型
export type Platform = 'win32' | 'darwin' | 'linux';

// Electron API 接口 - 扩展以匹配现有预加载脚本
export interface ElectronAPI {
  // 基本方法
  onClick?: () => Promise<any>;

  // 日志方法
  log: (logMessage: FrontendLogMessage) => Promise<void>;

  // 窗口管理
  showMainContent?: () => Promise<void>;
  hideMainContent?: () => Promise<void>;
  showFloatingWindows: () => Promise<void>;
  hideFloatingWindows: () => Promise<void>;
  showCloseButton: () => Promise<void>;
  hideCloseButton: () => Promise<void>;
  ensureMainFocus: () => Promise<void>;
  toggleFloatingWindows?: () => Promise<void>;
  toggleMainContent?: () => Promise<void>;
  showAIQuestion?: () => Promise<void>;
  hideAIQuestion?: () => Promise<void>;
  toggleAIQuestion?: () => Promise<void>;

  // 应用控制
  quitApp: () => Promise<void>;

  // 外部链接
  openExternalUrl: (url: string) => Promise<void>;

  // 对话框
  showFileDialog?: (options?: any) => Promise<any>;
  showFolderDialog?: (options?: any) => Promise<any>;

  // 主题相关
  getTheme?: () => Promise<string>;
  onThemeChange?: (callback: (theme: 'light' | 'dark') => void) => () => void;

  // 应用信息
  getAppInfo?: () => Promise<any>;

  // 登录状态检查
  checkLoginStatus: () => Promise<{
    success: boolean;
    isLoggedIn: boolean;
    user?: any;
    error?: string;
  }>;

  // 开发工具
  openDevTools?: () => Promise<void>;

  // 事件监听
  on: (channel: string, callback: (...args: any[]) => void) => void;
  off: (channel: string, callback?: (...args: any[]) => void) => void;
  onMouseEnter?: (callback: () => void) => void;
  onMouseLeave?: (callback: () => void) => void;

  // 音频文件保存
  saveAudioFile?: (audioData: Uint8Array, fileName: string) => Promise<{ success: boolean; filePath?: string; size?: number; error?: string; }>;

  // 平台信息
  platform: Platform;

  // 版本信息
  versions?: {
    node: string;
    chrome: string;
    electron: string;
  };

  // Piper TTS API
  piperGetVoices?: () => Promise<{ success: boolean; voices?: any[]; error?: string; }>;
  piperIsAvailable?: () => Promise<{ success: boolean; available?: boolean; }>;
  piperSynthesize?: (text: string, options?: any) => Promise<{ success: boolean; audioData?: string; error?: string; }>;
  piperSpeak?: (text: string, options?: any) => Promise<{ success: boolean; error?: string; }>;
  piperPlayToDevice?: (audioDataBase64: string, deviceId?: string) => Promise<{ success: boolean; error?: string; }>;

  // ASR 配置 API
  asrConfig?: {
    get: () => Promise<{ success: boolean; config?: any; error?: string }>;
    updateDevices: (partial: {
      microphone_device_id?: string;
      microphone_device_name?: string;
      speaker_device_id?: string;
      speaker_device_name?: string;
    }) => Promise<{ success: boolean; config?: any; error?: string }>;
    onChanged: (callback: (config: any) => void) => () => void;
  };
}

// 已在各个预加载脚本中声明，这里不需要重复声明
