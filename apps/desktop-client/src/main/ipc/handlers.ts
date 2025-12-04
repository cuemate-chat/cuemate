import { app, BrowserWindow, clipboard, dialog, ipcMain, shell } from 'electron';
import WebSocket from 'ws';
import type { FrontendLogMessage } from '../../shared/types.js';
import { createLogger, logger } from '../../utils/logger.js';
import { PiperTTS } from '../audio/PiperTTS.js';

const log = createLogger('IPCHandlers');
import { SystemAudioCapture } from '../audio/SystemAudioCapture.js';
import { DockerServiceManager } from '../services/DockerServiceManager.js';
import { ensureDockActiveAndIcon } from '../utils/dock.js';
import { type AppSettings, loadSettings, saveSettings, loadInterviewId, saveInterviewId, clearInterviewId } from '../utils/settings.js';
import { WindowManager } from '../windows/WindowManager.js';
import { registerASRWebSocketHandlers } from './asrWebSocketHandlers.js';

/**
 * 格式化时间为北京时间字符串
 */
function formatTimeString(date: Date): string {
  return date
    .toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    .replace(/\//g, '-');
}

/**
 * 设置 IPC 通信处理器
 * command 系统，处理前端和后端之间的通信
 */
/**
 * 全局缓存用户数据和 token
 * 导出以便 WebSocket 等其他模块可以更新
 */
export let cachedUserData: any = null;
export let cachedToken: string | null = null;

/**
 * 设置缓存的用户数据和 token
 */
export function setCachedAuth(userData: any, token: string): void {
  cachedUserData = userData;
  cachedToken = token;
}

/**
 * 清空缓存
 */
export function clearCachedAuth(): void {
  cachedUserData = null;
  cachedToken = null;
}

// 导出广播函数供其他模块使用
export function broadcastClickThroughChanged(enabled: boolean): void {
  try {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      try {
        win.webContents.send('click-through-changed', enabled);
      } catch {}
    }
  } catch {}
}

export function broadcastAppVisibilityChanged(visible: boolean): void {
  try {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      try {
        win.webContents.send('app-visibility-changed', visible);
      } catch {}
    }
  } catch {}
}

export function setupIPC(windowManager: WindowManager): void {
  // 全局缓存 ASR 配置
  let asrConfigCache: any | null = null;

  // === 使用公共设置模块 ===
  let currentSettings: AppSettings = loadSettings();

  // 便捷访问器
  let stealthModeEnabled = currentSettings.stealthModeEnabled;
  let clickThroughEnabled = currentSettings.clickThroughEnabled;
  let dockIconVisible = currentSettings.dockIconVisible;
  let stopDockerOnQuit = currentSettings.stopDockerOnQuit;

  // 保存当前设置
  function persistSettings(): void {
    currentSettings = {
      stealthModeEnabled,
      clickThroughEnabled,
      dockIconVisible,
      stopDockerOnQuit,
    };
    saveSettings(currentSettings);
  }
  function applyStealthModeToAllWindows(enabled: boolean): void {
    try {
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        try {
          win.setContentProtection(enabled);
        } catch {}
      }
    } catch {}
  }
  function broadcastStealthChanged(enabled: boolean): void {
    try {
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        try {
          win.webContents.send('stealth-mode-changed', enabled);
        } catch {}
      }
    } catch {}
  }
  function applyClickThroughToAllWindows(enabled: boolean): void {
    try {
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        try {
          const title = win.getTitle();
          // 排除托盘菜单窗口，它不应该受穿透模式影响
          if (title === 'CueMate Menu') {
            continue;
          }
          win.setIgnoreMouseEvents(enabled, { forward: true });
        } catch (error) {
          log.error('applyClickThroughToAllWindows', `设置窗口穿透失败: ${win.getTitle()}`, {}, error);
        }
      }
    } catch (error) {
      log.error('applyClickThroughToAllWindows', '应用点击穿透到所有窗口失败', {}, error);
    }
  }

  // 初始化应用设置（设置已在上面通过 loadSettings() 加载）
  try {
    (global as any).stealthModeEnabled = stealthModeEnabled;
    (global as any).clickThroughEnabled = clickThroughEnabled;
    (global as any).dockIconVisible = dockIconVisible;
    (global as any).stopDockerOnQuit = stopDockerOnQuit;
  } catch {}
  if (stealthModeEnabled) {
    applyStealthModeToAllWindows(true);
  }
  if (clickThroughEnabled) {
    applyClickThroughToAllWindows(true);
  }

  async function fetchAsrConfigFromServer(): Promise<any | null> {
    try {
      const response = await fetch('http://127.0.0.1:3001/asr/config', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        log.warn('fetchAsrConfigFromServer', '获取 ASR 配置失败', { status: response.status });
        return null;
      }
      const data = await response.json();
      return data?.config ?? null;
    } catch (error) {
      log.error('fetchAsrConfigFromServer', '拉取 ASR 配置异常', {}, error);
      return null;
    }
  }

  async function postAsrConfigToServer(
    config: any,
  ): Promise<{ success: boolean; config?: any; message?: string; error?: string }> {
    try {
      const response = await fetch('http://127.0.0.1:3001/asr/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        const text = await response.text();
        return { success: false, error: text };
      }
      const data = await response.json();
      return data as any;
    } catch (error: any) {
      return { success: false, error: error?.message || '更新 ASR 配置异常' };
    }
  }

  function broadcastAsrConfigChanged(config: any): void {
    try {
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        try {
          win.webContents.send('asr-config-changed', config);
        } catch {}
      }
    } catch {}
  }

  /**
   * 剪贴板操作 - 写入文本
   */
  ipcMain.handle('clipboard-write-text', async (_event, text: string) => {
    try {
      clipboard.writeText(text);
      return { success: true };
    } catch (error) {
      log.error('clipboard-write-text', '写入剪贴板失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 剪贴板操作 - 读取文本
   */
  ipcMain.handle('clipboard-read-text', async () => {
    try {
      const text = clipboard.readText();
      return { success: true, text };
    } catch (error) {
      log.error('clipboard-read-text', '读取剪贴板失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 显示浮动窗口
   */
  ipcMain.handle('show-floating-windows', async () => {
    try {
      windowManager.showFloatingWindows();
      return { success: true };
    } catch (error) {
      log.error('show-floating-windows', '显示浮动窗口失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 隐藏浮动窗口
   */
  ipcMain.handle('hide-floating-windows', async () => {
    try {
      windowManager.hideFloatingWindows();
      return { success: true };
    } catch (error) {
      log.error('hide-floating-windows', '隐藏浮动窗口失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 切换浮动窗口显示状态
   */
  ipcMain.handle('toggle-floating-windows', async () => {
    try {
      windowManager.toggleFloatingWindows();
      return { success: true };
    } catch (error) {
      log.error('toggle-floating-windows', '切换浮动窗口失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 设置 AI 窗口高度百分比
   */
  ipcMain.handle('set-ai-window-height', async (_event, percentage: number) => {
    try {
      windowManager.setAIWindowHeightPercentage(percentage);
      return { success: true };
    } catch (error) {
      log.error('set-ai-window-height', '设置 AI 窗口高度失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // === interviewId 持久化相关 IPC ===
  ipcMain.handle('interview-id-get', async () => {
    try {
      const interviewId = loadInterviewId();
      return { success: true, interviewId };
    } catch (error) {
      log.error('interview-id-get', '获取 interviewId 失败', {}, error);
      return { success: false, interviewId: null };
    }
  });
  ipcMain.handle('interview-id-set', async (_event, interviewId: string | null) => {
    try {
      if (interviewId) {
        saveInterviewId(interviewId);
      } else {
        clearInterviewId();
      }
      return { success: true };
    } catch (error) {
      log.error('interview-id-set', '保存 interviewId 失败', {}, error);
      return { success: false };
    }
  });
  ipcMain.handle('interview-id-clear', async () => {
    try {
      clearInterviewId();
      return { success: true };
    } catch (error) {
      log.error('interview-id-clear', '清除 interviewId 失败', {}, error);
      return { success: false };
    }
  });

  // === 隐身模式（内容保护）相关 IPC ===
  ipcMain.handle('visibility-get', async () => {
    return { success: true, enabled: stealthModeEnabled };
  });
  ipcMain.handle('visibility-set', async (_event, enabled: boolean) => {
    try {
      stealthModeEnabled = !!enabled;
      try {
        (global as any).stealthModeEnabled = stealthModeEnabled;
      } catch {}
      applyStealthModeToAllWindows(stealthModeEnabled);
      persistSettings();
      broadcastStealthChanged(stealthModeEnabled);
      return { success: true, enabled: stealthModeEnabled };
    } catch (error) {
      log.error('visibility-set', '切换隐身模式失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // === 点击穿透模式相关 IPC ===
  ipcMain.handle('click-through-get', async () => {
    return { success: true, enabled: clickThroughEnabled };
  });
  ipcMain.handle('click-through-set', async (_event, enabled: boolean) => {
    try {
      clickThroughEnabled = !!enabled;
      try {
        (global as any).clickThroughEnabled = clickThroughEnabled;
      } catch {}
      applyClickThroughToAllWindows(clickThroughEnabled);
      persistSettings();
      broadcastClickThroughChanged(clickThroughEnabled);

      // 通知主进程更新托盘菜单
      const { ipcMain } = require('electron');
      ipcMain.emit('update-tray-menu');

      return { success: true, enabled: clickThroughEnabled };
    } catch (error) {
      log.error('click-through-set', '切换点击穿透模式失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 获取 AI 窗口高度百分比
   */
  ipcMain.handle('get-ai-window-height', async () => {
    try {
      const percentage = windowManager.getAIWindowHeightPercentage();
      return { success: true, percentage };
    } catch (error) {
      log.error('get-ai-window-height', '获取 AI 窗口高度失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 切换 AI 窗口模式
   */
  ipcMain.handle(
    'switch-to-mode',
    async (_event, mode: 'voice-qa' | 'mock-interview' | 'interview-training') => {
      try {
        windowManager.switchToMode(mode);
        return { success: true };
      } catch (error) {
        log.error('switch-to-mode', '切换 AI 窗口模式失败', {}, error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  );

  /**
   * 设置"提问 AI"按钮的禁用状态
   */
  ipcMain.handle('set-ask-ai-button-disabled', async (_event, disabled: boolean) => {
    try {
      windowManager.setAskAIButtonDisabled(disabled);
      return { success: true };
    } catch (error) {
      log.error('set-ask-ai-button-disabled', '设置提问 AI 按钮禁用状态失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 显示关闭按钮 - 由控制条组件内部管理
   */
  ipcMain.handle('show-close-button', async () => {
    try {
      windowManager.showCloseButton();
      return { success: true };
    } catch (error) {
      log.error('show-close-button', '显示关闭按钮失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 隐藏关闭按钮 - 由控制条组件内部管理
   */
  ipcMain.handle('hide-close-button', async () => {
    try {
      windowManager.hideCloseButton();
      return { success: true };
    } catch (error) {
      log.error('hide-close-button', '隐藏关闭按钮失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 显示主内容窗口
   */
  ipcMain.handle('show-main-content', async () => {
    try {
      windowManager.showMainContent();
      return { success: true };
    } catch (error) {
      log.error('show-main-content', '显示主内容窗口失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 隐藏主内容窗口
   */
  ipcMain.handle('hide-main-content', async () => {
    try {
      windowManager.hideMainContent();
      return { success: true };
    } catch (error) {
      log.error('hide-main-content', '隐藏主内容窗口失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 切换主内容窗口显示状态
   */
  ipcMain.handle('toggle-main-content', async () => {
    try {
      windowManager.toggleMainContent();
      return { success: true };
    } catch (error) {
      log.error('toggle-main-content', '切换主内容窗口失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 显示 AI 问答窗口
   */
  ipcMain.handle('show-ai-question', async () => {
    try {
      windowManager.showAIQuestion();
      return { success: true };
    } catch (error) {
      log.error('show-ai-question', '显示 AI 问答窗口失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 隐藏 AI 问答窗口
   */
  ipcMain.handle('hide-ai-question', async () => {
    try {
      windowManager.hideAIQuestion();
      return { success: true };
    } catch (error) {
      log.error('hide-ai-question', '隐藏 AI 问答窗口失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 切换 AI 问答窗口显示状态
   */
  ipcMain.handle('toggle-ai-question', async () => {
    try {
      windowManager.toggleAIQuestion();
      return { success: true };
    } catch (error) {
      log.error('toggle-ai-question', '切换 AI 问答窗口失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // 历史窗口相关 IPC
  ipcMain.handle('show-ai-question-history', async () => {
    try {
      windowManager.showAIQuestionHistoryNextToAI();
      return { success: true };
    } catch (error) {
      log.error('show-ai-question-history', '显示 AI 问答历史窗口失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('hide-ai-question-history', async () => {
    try {
      windowManager.hideAIQuestionHistory();
      return { success: true };
    } catch (error) {
      log.error('hide-ai-question-history', '隐藏 AI 问答历史窗口失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('toggle-ai-question-history', async () => {
    try {
      windowManager.toggleAIQuestionHistoryNextToAI();
      return { success: true };
    } catch (error) {
      log.error('toggle-ai-question-history', '切换 AI 问答历史窗口失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Interviewer 窗口相关 IPC
  ipcMain.handle('show-interviewer', async () => {
    try {
      windowManager.showInterviewerNextToAI();
      return { success: true };
    } catch (error) {
      log.error('show-interviewer', '显示 Interviewer 窗口失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('hide-interviewer', async () => {
    try {
      windowManager.hideInterviewer();
      return { success: true };
    } catch (error) {
      log.error('hide-interviewer', '隐藏 Interviewer 窗口失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('toggle-interviewer', async () => {
    try {
      windowManager.toggleInterviewerNextToAI();
      return { success: true };
    } catch (error) {
      log.error('toggle-interviewer', '切换 Interviewer 窗口失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 获取应用状态
   */
  ipcMain.handle('get-app-state', async () => {
    try {
      const appState = windowManager.getAppState();
      const isClickThrough = (global as any).clickThroughEnabled || false;
      return {
        success: true,
        data: {
          ...appState,
          isClickThrough,
        },
      };
    } catch (error) {
      log.error('get-app-state', '获取应用状态失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // === 应用控制相关 IPC 处理器 ===

  /**
   * 退出应用
   */
  ipcMain.handle('quit-app', async () => {
    try {
      app.quit();
      return { success: true };
    } catch (error) {
      log.error('quit-app', '退出应用失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 重启应用
   */
  ipcMain.handle('restart-app', async () => {
    try {
      app.relaunch();
      app.quit();
      return { success: true };
    } catch (error) {
      log.error('restart-app', '重启应用失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 获取应用版本信息
   */
  ipcMain.handle('get-app-info', async () => {
    try {
      const appInfo = {
        name: app.getName(),
        version: app.getVersion(),
        platform: process.platform,
        arch: process.arch,
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node,
        chromeVersion: process.versions.chrome,
      };
      return { success: true, data: appInfo };
    } catch (error) {
      log.error('get-app-info', '获取应用信息失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // === 系统交互相关 IPC 处理器 ===

  /**
   * 打开外部链接
   */
  ipcMain.handle('open-external-url', async (_event, url: string) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      log.error('open-external-url', '打开外部链接失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 显示文件夹选择对话框
   */
  ipcMain.handle('show-folder-dialog', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        title: '选择文件夹',
      });

      return {
        success: true,
        data: {
          canceled: result.canceled,
          filePaths: result.filePaths,
        },
      };
    } catch (error) {
      log.error('show-folder-dialog', '文件夹对话框失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 显示文件选择对话框
   */
  ipcMain.handle('show-file-dialog', async (_event, options: any = {}) => {
    try {
      const dialogOptions = {
        properties: ['openFile', 'multiSelections'],
        title: '选择文件',
        filters: options.filters || [{ name: '所有文件', extensions: ['*'] }],
        ...options,
      };

      const result = await dialog.showOpenDialog(dialogOptions);

      return {
        success: true,
        data: {
          canceled: result.canceled,
          filePaths: result.filePaths,
        },
      };
    } catch (error) {
      log.error('show-file-dialog', '文件对话框失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // === 日志相关 IPC 处理器 ===

  /**
   * 检查用户登录状态（带重试机制和 Docker 状态检测）
   */
  ipcMain.handle('check-login-status', async () => {
    const maxRetries = 3;
    const retryDelay = 3000; // 3 秒

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 先检查 Docker 服务状态
        const dockerStatus = DockerServiceManager.getStatus();

        if (!dockerStatus.running) {
          const isLastAttempt = attempt === maxRetries;

          if (isLastAttempt) {
            log.error(
              'check-login-status',
              'Docker 服务未运行，无法检查登录状态（所有重试已失败）',
              { attempt, maxRetries, dockerStatus },
            );
            return {
              success: false,
              isLoggedIn: false,
              error: 'Docker 服务未启动。请等待 Docker 服务启动完成后重试。',
            };
          } else {
            log.debug(
              'check-login-status',
              `Docker 服务未运行，等待启动（尝试 ${attempt}/${maxRetries}，将在 ${retryDelay}ms 后重试）`,
              { attempt, maxRetries, dockerStatus },
            );
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            continue;
          }
        }

        // Docker 已运行，尝试连接 web-api
        const response = await fetch('http://127.0.0.1:3001/auth/login-status', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // 设置较短的超时时间，避免长时间等待
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          const data = await response.json();

          // 缓存用户数据和 token 到全局变量
          if (data.isLoggedIn && data.user) {
            cachedUserData = data.user;
            cachedToken = data.token;
          } else {
            cachedUserData = null;
            cachedToken = null;
            log.info('check-login-status', '用户未登录，清空缓存');
          }

          return {
            success: true,
            isLoggedIn: data.isLoggedIn,
            user: data.user,
          };
        } else if (response.status === 401) {
          log.info('check-login-status', '用户未登录');
          cachedUserData = null; // 清空缓存
          cachedToken = null; // 清空 token 缓存
          return {
            success: true,
            isLoggedIn: false,
          };
        } else {
          log.warn('check-login-status', '登录检查返回异常状态码', { status: response.status });
          // 不误判为未登录：仅返回失败，不改变状态
          return {
            success: false,
            isLoggedIn: false,
          };
        }
      } catch (error) {
        // 再次检查 Docker 状态，以提供更准确的错误信息
        const dockerStatus = DockerServiceManager.getStatus();
        let errorMessage = '';
        const isLastAttempt = attempt === maxRetries;

        if (error instanceof Error) {
          const errCode = (error as any).cause?.code || (error as any).code;

          if (errCode === 'ECONNREFUSED' || errCode === 'ECONNRESET') {
            // Docker 已运行但连接失败，说明 web-api 容器可能还在启动中
            if (dockerStatus.running) {
              errorMessage = 'Web API 服务正在启动中，请稍候...';
              if (isLastAttempt) {
                log.error(
                  'check-login-status',
                  'Web API 服务启动超时（所有重试已失败）',
                  { errorCode: errCode, attempt, maxRetries, dockerStatus },
                  error,
                );
              } else {
                log.warn(
                  'check-login-status',
                  `Web API 服务正在启动（尝试 ${attempt}/${maxRetries}，将在 ${retryDelay}ms 后重试）`,
                  { errorCode: errCode, attempt, maxRetries, dockerStatus },
                );
              }
            } else {
              errorMessage =
                'Docker 服务未启动或 Web API 服务不可用。请确保 Docker 服务已正常运行。';
              if (isLastAttempt) {
                log.error(
                  'check-login-status',
                  '无法连接到 Web API 服务 - Docker 服务未运行（所有重试已失败）',
                  { errorCode: errCode, attempt, maxRetries, dockerStatus },
                  error,
                );
              } else {
                log.warn(
                  'check-login-status',
                  `无法连接到 Web API 服务 - Docker 服务未运行（尝试 ${attempt}/${maxRetries}，将在 ${retryDelay}ms 后重试）`,
                  { errorCode: errCode, attempt, maxRetries, dockerStatus },
                );
              }
            }
          } else if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            errorMessage = '连接 Web API 服务超时。请检查 Docker 服务是否正常运行。';

            if (isLastAttempt) {
              log.error(
                'check-login-status',
                'Web API 服务连接超时（所有重试已失败）',
                { attempt, maxRetries, dockerStatus },
                error,
              );
            } else {
              log.warn(
                'check-login-status',
                `Web API 服务连接超时（尝试 ${attempt}/${maxRetries}，将在 ${retryDelay}ms 后重试）`,
                { attempt, maxRetries, dockerStatus },
              );
            }
          } else {
            errorMessage = error.message;

            if (isLastAttempt) {
              log.error(
                'check-login-status',
                '登录状态检查失败（所有重试已失败）',
                { attempt, maxRetries, dockerStatus },
                error,
              );
            } else {
              log.warn(
                'check-login-status',
                `登录状态检查失败（尝试 ${attempt}/${maxRetries}，将在 ${retryDelay}ms 后重试）`,
                { attempt, maxRetries, dockerStatus },
              );
            }
          }
        } else {
          errorMessage = String(error);

          if (isLastAttempt) {
            log.error(
              'check-login-status',
              '登录状态检查失败（所有重试已失败）',
              { attempt, maxRetries, dockerStatus },
              error,
            );
          } else {
            log.warn(
              'check-login-status',
              `登录状态检查失败（尝试 ${attempt}/${maxRetries}，将在 ${retryDelay}ms 后重试）`,
              { attempt, maxRetries, dockerStatus },
            );
          }
        }

        // 如果不是最后一次尝试，等待后重试
        if (!isLastAttempt) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue; // 继续下一次重试
        }

        // 最后一次失败，返回错误
        cachedUserData = null; // 清空缓存
        return {
          success: false,
          isLoggedIn: false,
          error: errorMessage,
        };
      }
    }

    // 理论上不会到这里，但为了类型安全
    return {
      success: false,
      isLoggedIn: false,
      error: '未知错误',
    };
  });

  /**
   * 前端日志处理
   */
  ipcMain.handle('frontend-log', async (_event, logMessage: FrontendLogMessage) => {
    try {
      const { level, message, timestamp } = logMessage;
      const time = timestamp ? formatTimeString(new Date(timestamp)) : formatTimeString(new Date());
      const prefix = `[${time}] [RENDERER] [${level.toUpperCase()}]`;

      switch (level) {
        case 'error':
          logger.error(`${prefix} ${message}`);
          break;
        case 'warn':
          logger.warn(`${prefix} ${message}`);
          break;
        case 'debug':
          logger.debug(`${prefix} ${message}`);
          break;
        case 'info':
        default:
          logger.debug(`${prefix} ${message}`);
          break;
      }

      return { success: true };
    } catch (error) {
      log.error('frontend-log', '前端日志处理失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // === 鼠标和键盘事件相关 IPC 处理器 ===

  /**
   * 处理关闭按钮点击事件
   */
  ipcMain.handle('close-button-clicked', async () => {
    try {
      log.debug('close-button-clicked', '关闭按钮被点击');
      // 隐藏所有浮动窗口
      windowManager.hideFloatingWindows();
      return { success: true };
    } catch (error) {
      log.error('close-button-clicked', '关闭按钮点击处理失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // 控制条鼠标事件由组件内部处理

  // === 开发工具相关 IPC 处理器 ===

  /**
   * 打开开发者工具
   */
  ipcMain.handle('open-dev-tools', async (event, windowId?: string) => {
    try {
      if (windowId) {
        // 为指定窗口打开开发者工具（功能暂未实现）
        log.debug('open-dev-tools', '尝试为窗口打开开发者工具（功能待实现）', { windowId });
      } else {
        // 为发送请求的窗口打开开发者工具
        event.sender.openDevTools();
        log.debug('open-dev-tools', '为当前窗口打开开发者工具');
      }
      return { success: true };
    } catch (error) {
      log.error('open-dev-tools', '打开开发者工具失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // === ASR 配置相关 IPC 处理器 ===
  ipcMain.handle('asr-config-get', async () => {
    try {
      if (!asrConfigCache) {
        asrConfigCache = await fetchAsrConfigFromServer();
        try {
          (global as any).asrConfigCache = asrConfigCache;
        } catch {}
      }
      return { success: true, config: asrConfigCache };
    } catch (error) {
      log.error('asr-config-get', '获取 ASR 配置失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(
    'asr-config-update-devices',
    async (
      _event,
      partial: {
        microphoneDeviceId?: string;
        microphoneDeviceName?: string;
        speakerDeviceId?: string;
        speakerDeviceName?: string;
      },
    ) => {
      try {
        // 读取现有配置
        const current = asrConfigCache ?? (await fetchAsrConfigFromServer()) ?? {};
        const merged = {
          ...current,
          ...partial,
        };

        const result = await postAsrConfigToServer(merged);
        if (result.success && result.config) {
          asrConfigCache = result.config;
          try {
            (global as any).asrConfigCache = asrConfigCache;
          } catch {}
          broadcastAsrConfigChanged(asrConfigCache);
          return { success: true, config: asrConfigCache };
        }

        return { success: false, error: result.error || '更新 ASR 配置失败' };
      } catch (error) {
        log.error('asr-config-update-devices', '更新 ASR 设备配置失败', {}, error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  );

  /**
   * 加载对话到 AI 问答窗口
   */
  ipcMain.handle('load-conversation', async (_event, conversationData: any) => {
    try {
      log.info('load-conversation', '收到加载对话命令', { conversationData });

      // 获取 AI 问答窗口实例
      const aiQuestionWindow = windowManager.getAIQuestionWindow();
      const browserWindow = aiQuestionWindow.getBrowserWindow();
      if (browserWindow) {
        // 发送对话数据到 AI 问答窗口
        browserWindow.webContents.send('load-conversation-data', conversationData);
        log.info('load-conversation', '对话数据已发送到 AI 问答窗口');
        return { success: true };
      } else {
        log.warn('load-conversation', 'AI 问答窗口未找到或未创建');
        return { success: false, error: 'AI 问答窗口未找到' };
      }
    } catch (error) {
      log.error('load-conversation', '加载对话失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 获取缓存的用户数据
   */
  ipcMain.handle('get-user-data', () => {
    if (cachedUserData && cachedToken) {
      return {
        success: true,
        userData: {
          user: cachedUserData,
          token: cachedToken,
          model: cachedUserData.model,
          modelParams: cachedUserData.modelParams,
        },
      };
    } else {
      return {
        success: false,
        error: '用户数据未缓存，请检查登录状态',
      };
    }
  });

  // === 系统音频扬声器捕获相关 IPC 处理器 ===
  let systemAudioCapture: SystemAudioCapture | null = null;

  /**
   * 开始系统音频扬声器捕获
   */
  ipcMain.handle(
    'system-audio-capture-start',
    async (event, options?: { sampleRate?: number; channels?: number }) => {
      try {
        log.info('system-audio-capture-start', '开始系统音频扬声器捕获');

        if (systemAudioCapture && systemAudioCapture.isCaptureActive()) {
          return { success: false, error: '系统音频扬声器捕获已在进行中' };
        }

        // 创建音频捕获实例
        systemAudioCapture = new SystemAudioCapture(options || {});

        // 设置音频数据回调
        systemAudioCapture.onData((audioData: Buffer) => {
          // 将音频数据发送给渲染进程
          event.sender.send('system-audio-data', audioData);
        });

        // 设置错误回调
        systemAudioCapture.onError((error: Error) => {
          log.error('system-audio-capture-start', '系统音频扬声器捕获错误', {}, error);
          event.sender.send('system-audio-error', error.message);
        });

        // 启动捕获
        await systemAudioCapture.startCapture();

        return { success: true };
      } catch (error) {
        log.error('system-audio-capture-start', '开始系统音频扬声器捕获失败', {}, error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  );

  /**
   * 停止系统音频扬声器捕获
   */
  ipcMain.handle('system-audio-capture-stop', async () => {
    try {
      if (systemAudioCapture) {
        systemAudioCapture.stopCapture();
        systemAudioCapture = null;
        log.info('system-audio-capture-stop', '系统音频扬声器捕获已停止');
        return { success: true };
      } else {
        return { success: false, error: '没有正在进行的系统音频扬声器捕获任务' };
      }
    } catch (error) {
      log.error('system-audio-capture-stop', '停止系统音频扬声器捕获失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 检查系统音频扬声器捕获是否可用
   */
  ipcMain.handle('system-audio-capture-available', async () => {
    try {
      // 尝试获取音频设备列表来测试模块是否可用
      const devices = await SystemAudioCapture.getAudioDevices();
      return devices.length > 0;
    } catch (error) {
      log.error('system-audio-capture-available', '检查系统音频扬声器捕获可用性失败', {}, error);
      return false;
    }
  });

  // ASR WebSocket 连接管理
  let micAsrWebSocket: WebSocket | null = null;

  /**
   * 麦克风测试 - 30 秒采集 + 真实 ASR 识别
   */
  ipcMain.handle('mic-test-start', async (event, _options?: { deviceId?: string }) => {
    try {
      log.info('mic-test-start', '开始麦克风测试');

      log.info('mic-test-start', '连接 cuemate-asr 服务');

      // 创建到 ASR 服务的 WebSocket 连接
      const asrServiceUrl = 'ws://localhost:10095';
      micAsrWebSocket = new WebSocket(asrServiceUrl);

      micAsrWebSocket!.on('open', () => {
        log.info('mic-test-start', '麦克风 ASR 服务连接成功');
        // 不发送状态消息，只记录日志
      });

      micAsrWebSocket!.on('message', (data: any) => {
        try {
          const result = JSON.parse(data.toString());
          log.info('mic-test-start', '麦克风 ASR 识别结果', { result });

          // 构建显示文本
          let displayText = '';

          if (result.lines && Array.isArray(result.lines)) {
            result.lines.forEach((line: any) => {
              if (line.text) {
                displayText += line.text + '\n';
              }
            });
          }

          if (result.buffer_transcription) {
            displayText += `[转录中] ${result.buffer_transcription}\n`;
          }

          if (displayText.trim()) {
            event.sender.send('mic-test-result', {
              success: true,
              text: displayText.trim(),
            });
          }
        } catch (error) {
          log.error('mic-test-start', '处理麦克风 ASR 结果失败', {}, error);
        }
      });

      micAsrWebSocket!.on('error', (error: any) => {
        log.error('mic-test-start', '麦克风 ASR WebSocket 错误', {}, error);
        event.sender.send('mic-test-result', {
          success: false,
          error: '连接麦克风识别服务失败，请确保 cuemate-asr 服务已启动',
        });
      });

      micAsrWebSocket!.on('close', () => {
        log.info('mic-test-start', '麦克风 ASR WebSocket 连接关闭');
        micAsrWebSocket = null;
      });

      return { success: true };
    } catch (error) {
      log.error('mic-test-start', '麦克风测试启动失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 发送麦克风音频数据到 ASR 服务
   */
  ipcMain.handle('mic-send-audio', async (_event, audioData: Buffer) => {
    try {
      if (micAsrWebSocket && micAsrWebSocket.readyState === WebSocket.OPEN) {
        micAsrWebSocket.send(audioData);
        return { success: true };
      } else {
        return { success: false, error: 'ASR 服务未连接' };
      }
    } catch (error) {
      log.error('mic-send-audio', '发送麦克风音频数据失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 扬声器测试 - 只做音频捕获，发送数据到渲染进程
   */
  ipcMain.handle('speaker-test-start', async (event, _options?: { deviceId?: string }) => {
    try {
      log.info('speaker-test-start', '开始扬声器音频捕获');

      if (systemAudioCapture && systemAudioCapture.isCaptureActive()) {
        return { success: false, error: '系统音频捕获已在进行中' };
      }

      // 创建音频捕获实例
      systemAudioCapture = new SystemAudioCapture({ sampleRate: 16000, channels: 1 });

      // 设置音频数据回调 - 发送到渲染进程
      systemAudioCapture.onData((audioData: Buffer) => {
        // 将音频数据发送到渲染进程
        event.sender.send(
          'speaker-audio-data',
          audioData.buffer.slice(audioData.byteOffset, audioData.byteOffset + audioData.byteLength),
        );
      });

      log.info('speaker-test-start', 'speaker-test pipeline ready');
      // 设置错误回调
      systemAudioCapture.onError((error: Error) => {
        log.error('speaker-test-start', '扬声器测试音频捕获错误', {}, error);
        event.sender.send('speaker-test-result', {
          success: false,
          error: `音频捕获失败: ${error.message}`,
        });
      });

      log.info('speaker-test-start', 'speaker-test startCapture');
      // 启动捕获
      await systemAudioCapture.startCapture();

      return { success: true };
    } catch (error) {
      log.error('speaker-test-start', '扬声器测试启动失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 停止测试
   */
  ipcMain.handle('test-stop', async () => {
    try {
      if (systemAudioCapture) {
        systemAudioCapture.stopCapture();
        systemAudioCapture = null;
        log.info('test-stop', '音频测试已停止');
      }
      return { success: true };
    } catch (error) {
      log.error('test-stop', '停止测试失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 检查系统音频扬声器捕获状态
   */
  ipcMain.handle('system-audio-capture-status', async () => {
    try {
      return {
        active: systemAudioCapture ? systemAudioCapture.isCaptureActive() : false,
        available: true,
      };
    } catch (error) {
      log.error('system-audio-capture-status', '获取系统音频扬声器捕获状态失败', {}, error);
      return { active: false, available: false };
    }
  });

  /**
   * 获取系统音频扬声器设备列表
   */
  ipcMain.handle('system-audio-get-devices', async () => {
    try {
      const devices = await SystemAudioCapture.getAudioDevices();
      return { success: true, devices };
    } catch (error) {
      log.error('system-audio-get-devices', '获取音频设备列表失败', {}, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        devices: [],
      };
    }
  });

  /**
   * 保存音频文件到 data 目录
   */
  ipcMain.handle('save-audio-file', async (_event, audioData: Uint8Array, fileName: string) => {
    try {
      const fs = require('fs');
      const path = require('path');

      // 创建 data 目录（如果不存在）
      const dataDir = path.join(process.cwd(), 'data', 'audio-debug');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // 保存文件
      const filePath = path.join(dataDir, fileName);
      fs.writeFileSync(filePath, Buffer.from(audioData));

      log.info('save-audio-file', `音频文件已保存: ${filePath}, ${audioData.length} 字节`);
      return { success: true, filePath, size: audioData.length };
    } catch (error) {
      log.error('save-audio-file', '保存音频文件失败', {}, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // === Piper TTS 相关 IPC 处理器 ===
  // 使用单例模式，确保全局只有一个 PiperTTS 实例

  // 应用启动时预热 Piper TTS 服务（模型加载一次，后续毫秒级响应）
  (async () => {
    try {
      const piperTTS = PiperTTS.getInstance();
      const isAvailable = await piperTTS.isAvailable();
      if (isAvailable) {
        log.info('setupIPCHandlers', 'Piper TTS 预热：开始加载模型...');
        await piperTTS.startService();
        log.info('setupIPCHandlers', 'Piper TTS 预热完成：服务已就绪');
      }
    } catch (error) {
      log.error('setupIPCHandlers', 'Piper TTS 预热失败（将在首次使用时重试）', {}, error);
    }
  })();

  /**
   * 获取可用的 Piper TTS 语音模型
   */
  ipcMain.handle('piper-get-voices', async () => {
    try {
      const voices = PiperTTS.getInstance().getAvailableVoices();
      return { success: true, voices };
    } catch (error) {
      log.error('piper-get-voices', '获取 Piper TTS 语音模型失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 检查 Piper TTS 是否可用
   */
  ipcMain.handle('piper-is-available', async () => {
    try {
      const available = await PiperTTS.getInstance().isAvailable();
      return { success: true, available };
    } catch (error) {
      log.error('piper-is-available', '检查 Piper TTS 可用性失败', {}, error);
      return { success: false, available: false };
    }
  });

  /**
   * 使用 Piper TTS 语音合成
   */
  ipcMain.handle('piper-synthesize', async (_event, text: string, options?: any) => {
    try {
      const audioData = await PiperTTS.getInstance().synthesize(text, options);
      return { success: true, audioData: audioData.toString('base64') };
    } catch (error) {
      log.error('piper-synthesize', 'Piper TTS 语音合成失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 使用 Piper TTS 语音播放
   */
  ipcMain.handle('piper-speak', async (_event, text: string, options?: any) => {
    try {
      await PiperTTS.getInstance().speak(text, options);
      return { success: true };
    } catch (error) {
      log.error('piper-speak', 'Piper TTS 语音播放失败', {}, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 使用 Piper TTS 播放音频到指定设备
   */
  ipcMain.handle(
    'piper-play-to-device',
    async (_event, audioDataBase64: string, deviceId?: string) => {
      try {
        const audioData = Buffer.from(audioDataBase64, 'base64');
        await PiperTTS.getInstance().playToDevice(audioData, deviceId);
        return { success: true };
      } catch (error) {
        log.error('piper-play-to-device', 'Piper TTS 播放音频失败', {}, error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  );

  // 将切换函数暴露给全局对象，供快捷键调用
  function toggleClickThroughMode(): void {
    try {
      const newState = !clickThroughEnabled;
      clickThroughEnabled = newState;
      try {
        (global as any).clickThroughEnabled = clickThroughEnabled;
      } catch {}
      applyClickThroughToAllWindows(clickThroughEnabled);
      persistSettings();
      broadcastClickThroughChanged(clickThroughEnabled);

      // 同步到后端数据库
      if (cachedToken) {
        const floatingWindowVisible = newState ? 0 : 1;
        fetch('http://localhost:3001/auth/update-setting', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cachedToken}`,
          },
          body: JSON.stringify({ floatingWindowVisible }),
        }).catch((error) => {
          log.error('toggleClickThroughMode', '同步点击穿透模式到后端失败', {}, error);
        });
      }

      // 通知主进程更新托盘菜单
      const { ipcMain } = require('electron');
      ipcMain.emit('update-tray-menu');
    } catch (error) {
      log.error('toggleClickThroughMode', '快捷键切换点击穿透模式失败', {}, error);
    }
  }

  // 暴露到全局对象供 WindowManager 调用
  try {
    (global as any).toggleClickThroughMode = toggleClickThroughMode;
  } catch {}

  // === 获取 asar unpacked 文件路径 ===
  ipcMain.handle('get-asar-unpacked-path', async (_event, filename: string) => {
    const fs = require('fs');
    const path = require('path');

    log.info(
      'get-asar-unpacked-path',
      '收到获取 AudioWorklet 处理器文件请求',
      { filename, isPackaged: app.isPackaged },
    );

    // 只允许访问 pcm-processor.js 和 speaker-pcm-processor.js
    if (filename !== 'pcm-processor.js' && filename !== 'speaker-pcm-processor.js') {
      log.error('get-asar-unpacked-path', '不允许访问该文件', { filename });
      return { success: false, error: '不允许访问该文件' };
    }

    try {
      let filePath: string;

      if (!app.isPackaged) {
        // 开发环境：从 public 目录读取
        filePath = path.join(process.cwd(), 'public', filename);
        log.info('get-asar-unpacked-path', '开发环境文件路径', { filePath });
      } else {
        // 生产环境：从 app.asar.unpacked/dist 目录读取
        filePath = path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', filename);
        log.info('get-asar-unpacked-path', '生产环境文件路径', { filePath });
      }

      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        log.error('get-asar-unpacked-path', '文件不存在', { filePath });
        return { success: false, error: `文件不存在: ${filePath}` };
      }

      // 读取文件内容
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      log.info('get-asar-unpacked-path', '文件读取成功', { filename, contentLength: fileContent.length });

      // 返回文件内容（前端将使用 Blob URL）
      return { success: true, content: fileContent };
    } catch (error) {
      log.error('get-asar-unpacked-path', '读取 AudioWorklet 处理器文件失败', { filename }, error);
      return { success: false, error: (error as Error).message };
    }
  });

  // ============= 托盘菜单相关 IPC 处理器 =============

  // 显示应用
  ipcMain.handle('show-app', async () => {
    try {
      windowManager.showFloatingWindows();
      broadcastAppVisibilityChanged(true);
      return { success: true };
    } catch (error) {
      log.error('show-app', '显示应用失败', {}, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 隐藏应用
  ipcMain.handle('hide-app', async () => {
    try {
      windowManager.hideFloatingWindows();
      broadcastAppVisibilityChanged(false);
      return { success: true };
    } catch (error) {
      log.error('hide-app', '隐藏应用失败', {}, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 设置交互模式
  ipcMain.handle('set-interactive-mode', async () => {
    try {
      if ((global as any).clickThroughEnabled) {
        windowManager.toggleClickThroughMode();
      }
      return { success: true };
    } catch (error) {
      log.error('set-interactive-mode', '设置交互模式失败', {}, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 设置穿透模式
  ipcMain.handle('set-click-through-mode', async () => {
    try {
      if (!(global as any).clickThroughEnabled) {
        windowManager.toggleClickThroughMode();
      }
      return { success: true };
    } catch (error) {
      log.error('set-click-through-mode', '设置穿透模式失败', {}, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 获取 Dock 图标显示状态
  ipcMain.handle('get-dock-icon-visible', async () => {
    try {
      return dockIconVisible;
    } catch (error) {
      log.error('get-dock-icon-visible', '获取 Dock 图标显示状态失败', {}, error);
      return false;
    }
  });

  // 设置 Dock 图标显示状态
  ipcMain.handle('set-dock-icon-visible', async (_event, visible: boolean) => {
    try {
      dockIconVisible = !!visible;
      try {
        (global as any).dockIconVisible = dockIconVisible;
      } catch {}

      // 仅在 macOS 上执行
      if (process.platform === 'darwin') {
        if (dockIconVisible) {
          // 使用 ensureDockActiveAndIcon 确保 Dock 图标正确显示（包括黑点）
          await ensureDockActiveAndIcon('setDockIconVisible');
        } else {
          // 隐藏 Dock 图标（先 accessory 再 hide）
          if (typeof (app as any).setActivationPolicy === 'function') {
            (app as any).setActivationPolicy('accessory');
          }
          app.dock?.hide();
        }
      }

      // 保存到配置文件
      persistSettings();

      return { success: true, visible: dockIconVisible };
    } catch (error) {
      log.error('set-dock-icon-visible', '设置 Dock 图标显示状态失败', {}, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 获取 Docker 退出时是否关闭设置
  ipcMain.handle('get-stop-docker-on-quit', async () => {
    try {
      return stopDockerOnQuit;
    } catch (error) {
      log.error('get-stop-docker-on-quit', '获取 Docker 退出设置失败', {}, error);
      return false;
    }
  });

  // 设置 Docker 退出时是否关闭
  ipcMain.handle('set-stop-docker-on-quit', async (_event, stop: boolean) => {
    try {
      stopDockerOnQuit = !!stop;
      try {
        (global as any).stopDockerOnQuit = stopDockerOnQuit;
      } catch {}

      // 保存到配置文件
      persistSettings();

      log.info('set-stop-docker-on-quit', 'Docker 退出设置已更新', { stopDockerOnQuit });
      return { success: true, stopDockerOnQuit };
    } catch (error) {
      log.error('set-stop-docker-on-quit', '设置 Docker 退出设置失败', {}, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 通知托盘菜单设置已变更
  ipcMain.handle('notify-settings-changed', async () => {
    try {
      windowManager.notifyTrayMenuSettingsChanged();
      return { success: true };
    } catch (error) {
      log.error('notify-settings-changed', '通知托盘菜单设置变更失败', {}, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 注册 ASR WebSocket IPC 处理器
  registerASRWebSocketHandlers();

  log.info('setupIPCHandlers', 'IPC 通信处理器设置完成');
}
