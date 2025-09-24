import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import WebSocket from 'ws';
import type { FrontendLogMessage } from '../../shared/types.js';
import { logger } from '../../utils/logger.js';
import { PiperTTS } from '../audio/PiperTTS.js';
import { SystemAudioCapture } from '../audio/SystemAudioCapture.js';
import { WindowManager } from '../windows/WindowManager.js';

/**
 * 设置 IPC 通信处理器
 * command 系统，处理前端和后端之间的通信
 */
export function setupIPC(windowManager: WindowManager): void {
  // 全局缓存用户数据和token
  let cachedUserData: any = null;
  let cachedToken: string | null = null;
  // 全局缓存 ASR 配置
  let asrConfigCache: any | null = null;

  async function fetchAsrConfigFromServer(): Promise<any | null> {
    try {
      const response = await fetch('http://127.0.0.1:3001/asr/config', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        logger.warn({ status: response.status }, 'IPC: 获取 ASR 配置失败');
        return null;
      }
      const data = await response.json();
      return data?.config ?? null;
    } catch (error) {
      logger.error({ error }, 'IPC: 拉取 ASR 配置异常');
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
   * 显示浮动窗口
   */
  ipcMain.handle('show-floating-windows', async () => {
    try {
      windowManager.showFloatingWindows();
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 显示浮动窗口失败');
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
      logger.error({ error }, 'IPC: 隐藏浮动窗口失败');
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
      logger.error({ error }, 'IPC: 切换浮动窗口失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 设置AI窗口高度百分比
   */
  ipcMain.handle('set-ai-window-height', async (_event, percentage: number) => {
    try {
      windowManager.setAIWindowHeightPercentage(percentage);
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 设置AI窗口高度失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 获取AI窗口高度百分比
   */
  ipcMain.handle('get-ai-window-height', async () => {
    try {
      const percentage = windowManager.getAIWindowHeightPercentage();
      return { success: true, percentage };
    } catch (error) {
      logger.error({ error }, 'IPC: 获取AI窗口高度失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 切换AI窗口模式
   */
  ipcMain.handle(
    'switch-to-mode',
    async (_event, mode: 'voice-qa' | 'mock-interview' | 'interview-training') => {
      try {
        windowManager.switchToMode(mode);
        return { success: true };
      } catch (error) {
        logger.error({ error }, 'IPC: 切换AI窗口模式失败');
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
      logger.error({ error }, 'IPC: 设置提问AI按钮禁用状态失败');
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
      logger.error({ error }, 'IPC: 显示关闭按钮失败');
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
      logger.error({ error }, 'IPC: 隐藏关闭按钮失败');
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
      logger.error({ error }, 'IPC: 显示主内容窗口失败');
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
      logger.error({ error }, 'IPC: 隐藏主内容窗口失败');
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
      logger.error({ error }, 'IPC: 切换主内容窗口失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 显示AI问答窗口
   */
  ipcMain.handle('show-ai-question', async () => {
    try {
      windowManager.showAIQuestion();
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 显示AI问答窗口失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 隐藏AI问答窗口
   */
  ipcMain.handle('hide-ai-question', async () => {
    try {
      windowManager.hideAIQuestion();
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 隐藏AI问答窗口失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 切换AI问答窗口显示状态
   */
  ipcMain.handle('toggle-ai-question', async () => {
    try {
      windowManager.toggleAIQuestion();
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 切换AI问答窗口失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // 历史窗口相关 IPC
  ipcMain.handle('show-ai-question-history', async () => {
    try {
      windowManager.showAIQuestionHistoryNextToAI();
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 显示AI问答历史窗口失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('hide-ai-question-history', async () => {
    try {
      windowManager.hideAIQuestionHistory();
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 隐藏AI问答历史窗口失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('toggle-ai-question-history', async () => {
    try {
      windowManager.toggleAIQuestionHistoryNextToAI();
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 切换AI问答历史窗口失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Interviewer窗口相关 IPC
  ipcMain.handle('show-interviewer', async () => {
    try {
      windowManager.showInterviewerNextToAI();
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 显示Interviewer窗口失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('hide-interviewer', async () => {
    try {
      windowManager.hideInterviewer();
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 隐藏Interviewer窗口失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('toggle-interviewer', async () => {
    try {
      windowManager.toggleInterviewerNextToAI();
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 切换Interviewer窗口失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 获取应用状态
   */
  ipcMain.handle('get-app-state', async () => {
    try {
      const appState = windowManager.getAppState();
      return { success: true, data: appState };
    } catch (error) {
      logger.error({ error }, 'IPC: 获取应用状态失败');
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
      logger.error({ error }, 'IPC: 退出应用失败');
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
      logger.error({ error }, 'IPC: 重启应用失败');
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
      logger.error({ error }, 'IPC: 获取应用信息失败');
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
      logger.error({ error }, 'IPC: 打开外部链接失败');
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
      logger.error({ error }, 'IPC: 文件夹对话框失败');
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
      logger.error({ error }, 'IPC: 文件对话框失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // === 日志相关 IPC 处理器 ===

  /**
   * 检查用户登录状态
   */
  ipcMain.handle('check-login-status', async () => {
    try {
      // 调用 web-api 检查登录状态
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

        // 缓存用户数据和token到全局变量
        if (data.isLoggedIn && data.user) {
          cachedUserData = data.user;
          cachedToken = data.token;
        } else {
          cachedUserData = null;
          cachedToken = null;
          logger.info('IPC: 用户未登录，清空缓存');
        }

        return {
          success: true,
          isLoggedIn: data.isLoggedIn,
          user: data.user,
        };
      } else if (response.status === 401) {
        logger.info('IPC: 用户未登录');
        cachedUserData = null; // 清空缓存
        cachedToken = null; // 清空token缓存
        return {
          success: true,
          isLoggedIn: false,
        };
      } else {
        logger.warn({ status: response.status }, 'IPC: 登录检查返回异常状态码');
        // 不误判为未登录：仅返回失败，不改变状态
        return {
          success: false,
          isLoggedIn: false,
        };
      }
    } catch (error) {
      logger.error({ error }, 'IPC: 登录状态检查失败');
      cachedUserData = null; // 清空缓存
      // 不误判为未登录
      return {
        success: false,
        isLoggedIn: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  /**
   * 前端日志处理
   */
  ipcMain.handle('frontend-log', async (_event, logMessage: FrontendLogMessage) => {
    try {
      const { level, message, timestamp } = logMessage;
      const time = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();
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
      logger.error({ error }, 'IPC: 前端日志处理失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // === 鼠标和键盘事件相关 IPC 处理器 ===

  /**
   * 处理关闭按钮点击事件
   */
  ipcMain.handle('close-button-clicked', async () => {
    try {
      logger.debug('IPC: 关闭按钮被点击');
      // 隐藏所有浮动窗口
      windowManager.hideFloatingWindows();
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 关闭按钮点击处理失败');
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
        logger.debug({ windowId }, 'IPC: 尝试为窗口打开开发者工具（功能待实现）');
      } else {
        // 为发送请求的窗口打开开发者工具
        event.sender.openDevTools();
        logger.debug('IPC: 为当前窗口打开开发者工具');
      }
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 打开开发者工具失败');
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
      logger.error({ error }, 'IPC: 获取 ASR 配置失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(
    'asr-config-update-devices',
    async (
      _event,
      partial: {
        microphone_device_id?: string;
        microphone_device_name?: string;
        speaker_device_id?: string;
        speaker_device_name?: string;
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
        logger.error({ error }, 'IPC: 更新 ASR 设备配置失败');
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  );

  /**
   * 加载对话到AI问答窗口
   */
  ipcMain.handle('load-conversation', async (_event, conversationData: any) => {
    try {
      logger.info('IPC: 收到加载对话命令', conversationData);

      // 获取AI问答窗口实例
      const aiQuestionWindow = windowManager.getAIQuestionWindow();
      const browserWindow = aiQuestionWindow.getBrowserWindow();
      if (browserWindow) {
        // 发送对话数据到AI问答窗口
        browserWindow.webContents.send('load-conversation-data', conversationData);
        logger.info('IPC: 对话数据已发送到AI问答窗口');
        return { success: true };
      } else {
        logger.warn('IPC: AI问答窗口未找到或未创建');
        return { success: false, error: 'AI问答窗口未找到' };
      }
    } catch (error) {
      logger.error({ error }, 'IPC: 加载对话失败');
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
          model_params: cachedUserData.model_params,
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
        logger.debug('开始系统音频扬声器捕获');

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
          logger.error('系统音频扬声器捕获错误:', error);
          event.sender.send('system-audio-error', error.message);
        });

        // 启动捕获
        await systemAudioCapture.startCapture();

        return { success: true };
      } catch (error) {
        logger.error({ error }, 'IPC: 开始系统音频扬声器捕获失败');
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
        logger.debug('系统音频扬声器捕获已停止');
        return { success: true };
      } else {
        return { success: false, error: '没有正在进行的系统音频扬声器捕获任务' };
      }
    } catch (error) {
      logger.error({ error }, 'IPC: 停止系统音频扬声器捕获失败');
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
      logger.error({ error }, 'IPC: 检查系统音频扬声器捕获可用性失败');
      return false;
    }
  });

  // ASR WebSocket 连接管理
  let micAsrWebSocket: WebSocket | null = null;

  /**
   * 麦克风测试 - 30秒采集 + 真实 ASR 识别
   */
  ipcMain.handle('mic-test-start', async (event, _options?: { deviceId?: string }) => {
    try {
      logger.debug('开始麦克风测试');

      logger.debug('开始麦克风测试，连接 cuemate-asr 服务');

      // 创建到 ASR 服务的 WebSocket 连接
      const asrServiceUrl = 'ws://localhost:10095';
      micAsrWebSocket = new WebSocket(asrServiceUrl);

      micAsrWebSocket!.on('open', () => {
        logger.debug('麦克风 ASR 服务连接成功');
        // 不发送状态消息，只记录日志
      });

      micAsrWebSocket!.on('message', (data: any) => {
        try {
          const result = JSON.parse(data.toString());
          logger.debug('麦克风 ASR 识别结果:', result);

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
          logger.error('处理麦克风 ASR 结果失败:', error);
        }
      });

      micAsrWebSocket!.on('error', (error: any) => {
        logger.error('麦克风 ASR WebSocket 错误:', error);
        event.sender.send('mic-test-result', {
          success: false,
          error: '连接麦克风识别服务失败，请确保 cuemate-asr 服务已启动',
        });
      });

      micAsrWebSocket!.on('close', () => {
        logger.debug('麦克风 ASR WebSocket 连接关闭');
        micAsrWebSocket = null;
      });

      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 麦克风测试启动失败');
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
      logger.error({ error }, 'IPC: 发送麦克风音频数据失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 扬声器测试 - 只做音频捕获，发送数据到渲染进程
   */
  ipcMain.handle('speaker-test-start', async (event, _options?: { deviceId?: string }) => {
    try {
      logger.debug('开始扬声器音频捕获');

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

      logger.debug('speaker-test pipeline ready');
      // 设置错误回调
      systemAudioCapture.onError((error: Error) => {
        logger.error('扬声器测试音频捕获错误:', error);
        event.sender.send('speaker-test-result', {
          success: false,
          error: `音频捕获失败: ${error.message}`,
        });
      });

      logger.debug('speaker-test startCapture');
      // 启动捕获
      await systemAudioCapture.startCapture();

      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 扬声器测试启动失败');
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
        logger.debug('音频测试已停止');
      }
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 停止测试失败');
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
      logger.error({ error }, 'IPC: 获取系统音频扬声器捕获状态失败');
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
      logger.error({ error }, 'IPC: 获取音频设备列表失败');
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        devices: [],
      };
    }
  });

  /**
   * 保存音频文件到data目录
   */
  ipcMain.handle('save-audio-file', async (_event, audioData: Uint8Array, fileName: string) => {
    try {
      const fs = require('fs');
      const path = require('path');

      // 创建data目录（如果不存在）
      const dataDir = path.join(process.cwd(), 'data', 'audio-debug');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // 保存文件
      const filePath = path.join(dataDir, fileName);
      fs.writeFileSync(filePath, Buffer.from(audioData));

      logger.debug(`音频文件已保存: ${filePath}, ${audioData.length} 字节`);
      return { success: true, filePath, size: audioData.length };
    } catch (error) {
      logger.error({ error }, 'IPC: 保存音频文件失败');
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // === Piper TTS 相关 IPC 处理器 ===
  let piperTTS: PiperTTS | null = null;

  /**
   * 获取可用的 Piper TTS 语音模型
   */
  ipcMain.handle('piper-get-voices', async () => {
    try {
      if (!piperTTS) {
        piperTTS = new PiperTTS();
      }
      const voices = piperTTS.getAvailableVoices();
      return { success: true, voices };
    } catch (error) {
      logger.error({ error }, 'IPC: 获取 Piper TTS 语音模型失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 检查 Piper TTS 是否可用
   */
  ipcMain.handle('piper-is-available', async () => {
    try {
      if (!piperTTS) {
        piperTTS = new PiperTTS();
      }
      const available = await piperTTS.isAvailable();
      return { success: true, available };
    } catch (error) {
      logger.error({ error }, 'IPC: 检查 Piper TTS 可用性失败');
      return { success: false, available: false };
    }
  });

  /**
   * 使用 Piper TTS 语音合成
   */
  ipcMain.handle('piper-synthesize', async (_event, text: string, options?: any) => {
    try {
      if (!piperTTS) {
        piperTTS = new PiperTTS();
      }
      const audioData = await piperTTS.synthesize(text, options);
      return { success: true, audioData: audioData.toString('base64') };
    } catch (error) {
      logger.error({ error }, 'IPC: Piper TTS 语音合成失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 使用 Piper TTS 语音播放
   */
  ipcMain.handle('piper-speak', async (_event, text: string, options?: any) => {
    try {
      if (!piperTTS) {
        piperTTS = new PiperTTS();
      }
      await piperTTS.speak(text, options);
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: Piper TTS 语音播放失败');
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
        if (!piperTTS) {
          piperTTS = new PiperTTS();
        }
        const audioData = Buffer.from(audioDataBase64, 'base64');
        await piperTTS.playToDevice(audioData, deviceId);
        return { success: true };
      } catch (error) {
        logger.error({ error }, 'IPC: Piper TTS 播放音频失败');
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  );

  logger.debug('IPC 通信处理器设置完成');
}
