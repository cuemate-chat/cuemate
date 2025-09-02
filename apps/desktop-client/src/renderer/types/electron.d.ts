// Electron API 类型声明文件
// 为渲染进程中的 window.electronAPI 提供类型支持

interface FrontendLogMessage {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp?: number;
}

interface AppInfo {
  name: string;
  version: string;
  platform: string;
  arch: string;
  electronVersion: string;
  nodeVersion: string;
  chromeVersion: string;
}

interface DialogResult {
  canceled: boolean;
  filePaths: string[];
}

interface AppState {
  isControlBarVisible: boolean;
  isCloseButtonVisible: boolean;
  isMainContentVisible: boolean;
  mainFocusWindowId?: string;
}

interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ElectronAPIResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// 基础 Electron API 接口
interface BaseElectronAPI {
  // 日志相关
  log: (logMessage: FrontendLogMessage) => Promise<ElectronAPIResult>;
  
  // 事件监听
  on: (channel: string, callback: (...args: any[]) => void) => void;
  off: (channel: string, callback?: (...args: any[]) => void) => void;
  
  // 系统信息
  platform: string;
  versions?: {
    node: string;
    chrome: string;
    electron: string;
  };
}

// 控制条窗口 API
interface ControlBarAPI extends BaseElectronAPI {
  // 窗口管理
  showFloatingWindows: () => Promise<ElectronAPIResult>;
  hideFloatingWindows: () => Promise<ElectronAPIResult>;
  toggleFloatingWindows: () => Promise<ElectronAPIResult>;
  
  showCloseButton: () => Promise<ElectronAPIResult>;
  hideCloseButton: () => Promise<ElectronAPIResult>;
  
  showMainContent: () => Promise<ElectronAPIResult>;
  toggleMainContent: () => Promise<ElectronAPIResult>;
  
  getAppState: () => Promise<ElectronAPIResult<AppState>>;

  // 系统交互
  openExternalUrl: (url: string) => Promise<ElectronAPIResult>;
  showFileDialog: (options?: any) => Promise<ElectronAPIResult<DialogResult>>;
  showFolderDialog: () => Promise<ElectronAPIResult<DialogResult>>;

  // 应用控制
  quitApp: () => Promise<ElectronAPIResult>;
  restartApp: () => Promise<ElectronAPIResult>;
  getAppInfo: () => Promise<ElectronAPIResult<AppInfo>>;

  // 事件处理
  onMouseEnter: () => Promise<ElectronAPIResult>;
  onMouseLeave: () => Promise<ElectronAPIResult>;

  // 开发工具
  openDevTools: () => Promise<ElectronAPIResult>;
}

// 关闭按钮窗口 API
interface CloseButtonAPI extends BaseElectronAPI {
  // 按钮交互
  onClick: () => Promise<ElectronAPIResult>;
  
  // 窗口管理
  hideFloatingWindows: () => Promise<ElectronAPIResult>;
  quitApp: () => Promise<ElectronAPIResult>;
}

// 主内容窗口 API
interface MainContentAPI extends BaseElectronAPI {
  // 窗口管理
  showFloatingWindows: () => Promise<ElectronAPIResult>;
  hideFloatingWindows: () => Promise<ElectronAPIResult>;
  toggleFloatingWindows: () => Promise<ElectronAPIResult>;
  
  showCloseButton: () => Promise<ElectronAPIResult>;
  hideCloseButton: () => Promise<ElectronAPIResult>;
  
  showMainContent: () => Promise<ElectronAPIResult>;
  hideMainContent: () => Promise<ElectronAPIResult>;
  toggleMainContent: () => Promise<ElectronAPIResult>;
  
  getAppState: () => Promise<ElectronAPIResult<AppState>>;

  // 系统交互
  openExternalUrl: (url: string) => Promise<ElectronAPIResult>;
  showFileDialog: (options?: any) => Promise<ElectronAPIResult<DialogResult>>;
  showFolderDialog: () => Promise<ElectronAPIResult<DialogResult>>;

  // 应用控制
  quitApp: () => Promise<ElectronAPIResult>;
  restartApp: () => Promise<ElectronAPIResult>;
  getAppInfo: () => Promise<ElectronAPIResult<AppInfo>>;

  // 开发工具
  openDevTools: (windowId?: string) => Promise<ElectronAPIResult>;
  
  // 主题相关
  getTheme: () => 'light' | 'dark';
  onThemeChange: (callback: (theme: 'light' | 'dark') => void) => (() => void) | undefined;
}

// 日志 API
interface Logger {
  info: (message: string) => Promise<ElectronAPIResult>;
  warn: (message: string) => Promise<ElectronAPIResult>;
  error: (message: string) => Promise<ElectronAPIResult>;
  debug: (message: string) => Promise<ElectronAPIResult>;
  logWithContext?: (level: 'info' | 'warn' | 'error' | 'debug', message: string, context?: any) => Promise<ElectronAPIResult>;
}

// 工具 API (仅在主内容窗口可用)
interface Utils {
  copyToClipboard: (text: string) => Promise<boolean>;
  readFromClipboard: () => Promise<string | null>;
  formatBytes: (bytes: number, decimals?: number) => string;
  debounce: <T extends (...args: any[]) => any>(func: T, wait: number) => T;
  throttle: <T extends (...args: any[]) => any>(func: T, limit: number) => T;
}

// 扩展 Window 接口
declare global {
  interface Window {
    electronAPI: ControlBarAPI | CloseButtonAPI | MainContentAPI;
    logger: Logger;
    utils?: Utils; // 仅在主内容窗口可用
  }
}

// 导出类型供其他文件使用
export {
  FrontendLogMessage,
  AppInfo,
  DialogResult,
  AppState,
  WindowBounds,
  ElectronAPIResult,
  BaseElectronAPI,
  ControlBarAPI,
  CloseButtonAPI,
  MainContentAPI,
  Logger,
  Utils
};