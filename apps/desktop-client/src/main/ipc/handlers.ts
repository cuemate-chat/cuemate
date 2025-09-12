import { app, dialog, ipcMain, shell } from 'electron';
import * as path from 'path';
import type { FrontendLogMessage } from '../../shared/types.js';
import { logger } from '../../utils/logger.js';
import { SystemAudioCapture } from '../audio/SystemAudioCapture.js';
import { WindowManager } from '../windows/WindowManager.js';

/**
 * 设置 IPC 通信处理器
 * command 系统，处理前端和后端之间的通信
 */
export function setupIPC(windowManager: WindowManager): void {
  logger.info('设置 IPC 通信处理器');

  // 全局缓存用户数据和token
  let cachedUserData: any = null;
  let cachedToken: string | null = null;

  /**
   * 显示浮动窗口
   */
  ipcMain.handle('show-floating-windows', async () => {
    try {
      windowManager.showFloatingWindows();
      logger.info('IPC: 显示浮动窗口命令已执行');
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
      logger.info('IPC: 隐藏浮动窗口命令已执行');
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
      logger.info('IPC: 切换浮动窗口命令已执行');
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 切换浮动窗口失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 显示关闭按钮 - 由控制条组件内部管理
   */
  ipcMain.handle('show-close-button', async () => {
    try {
      windowManager.showCloseButton();
      logger.info('IPC: 显示关闭按钮');
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
      logger.info('IPC: 隐藏关闭按钮');
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
      logger.info('IPC: 显示主内容窗口命令已执行');
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
      logger.info('IPC: 隐藏主内容窗口命令已执行');
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
      logger.info('IPC: 切换主内容窗口命令已执行');
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
      logger.info('IPC: 显示AI问答窗口命令已执行');
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
      logger.info('IPC: 隐藏AI问答窗口命令已执行');
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
      logger.info('IPC: 切换AI问答窗口命令已执行');
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
      logger.info('IPC: 显示AI问答历史窗口命令已执行');
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 显示AI问答历史窗口失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('hide-ai-question-history', async () => {
    try {
      windowManager.hideAIQuestionHistory();
      logger.info('IPC: 隐藏AI问答历史窗口命令已执行');
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 隐藏AI问答历史窗口失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('toggle-ai-question-history', async () => {
    try {
      windowManager.toggleAIQuestionHistoryNextToAI();
      logger.info('IPC: 切换AI问答历史窗口命令已执行');
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
      logger.info('IPC: 显示Interviewer窗口命令已执行');
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 显示Interviewer窗口失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('hide-interviewer', async () => {
    try {
      windowManager.hideInterviewer();
      logger.info('IPC: 隐藏Interviewer窗口命令已执行');
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 隐藏Interviewer窗口失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('toggle-interviewer', async () => {
    try {
      windowManager.toggleInterviewerNextToAI();
      logger.info('IPC: 切换Interviewer窗口命令已执行');
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
      logger.info({ appState }, 'IPC: 获取应用状态');
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
      logger.info('IPC: 收到退出应用命令');
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
      logger.info('IPC: 收到重启应用命令');
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
      logger.info({ appInfo }, 'IPC: 获取应用信息');
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
      logger.info({ url }, 'IPC: 打开外部链接');
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

      logger.info({ result }, 'IPC: 文件夹对话框结果');
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
      logger.info({ result }, 'IPC: 文件对话框结果');

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
      logger.info('IPC: 检查用户登录状态');

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
          logger.info('IPC: 用户数据和token已缓存');
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
          logger.info(`${prefix} ${message}`);
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
      logger.info('IPC: 关闭按钮被点击');
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
        logger.info({ windowId }, 'IPC: 尝试为窗口打开开发者工具（功能待实现）');
      } else {
        // 为发送请求的窗口打开开发者工具
        event.sender.openDevTools();
        logger.info('IPC: 为当前窗口打开开发者工具');
      }
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 打开开发者工具失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

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
    logger.info('IPC: 获取缓存的用户数据');
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

  // === 本地语音识别 API ===
  let speechRecognitionModule: any = null;
  let speechRecognizer: any = null;

  // 加载语音识别模块
  const loadSpeechRecognitionModule = () => {
    if (speechRecognitionModule) return speechRecognitionModule;
    try {
      let modulePath: string;
      if (process.env.NODE_ENV === 'development') {
        modulePath = path.join(__dirname, '../../src/main/native/speech_recognition');
      } else {
        modulePath = path.join(__dirname, '../native/speech_recognition/index.node');
      }

      logger.info(`尝试加载语音识别模块：${modulePath}`);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      speechRecognitionModule = require(modulePath);
      logger.info('语音识别原生模块加载成功');
      return speechRecognitionModule;
    } catch (error) {
      logger.error({ error }, '语音识别原生模块加载失败');
      throw error;
    }
  };

  /**
   * 检查本地语音识别是否可用
   */
  ipcMain.handle('speech-recognition-available', async () => {
    try {
      // 避免为可用性检查而提前加载原生模块，防止在 dev 环境触发系统框架/TCC
      const available = process.platform === 'darwin';
      return { success: true, available };
    } catch (error) {
      logger.error({ error }, 'IPC: 检查语音识别可用性失败');
      return {
        success: false,
        available: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  /**
   * 请求语音识别权限
   */
  ipcMain.handle('speech-recognition-request-permission', async () => {
    return new Promise((resolve) => {
      try {
        const module = loadSpeechRecognitionModule();
        const recognizer = new module.SpeechRecognition();

        recognizer.requestPermission((result: any) => {
          logger.info('语音识别权限结果:', result);
          resolve({ success: true, ...result });
        });
      } catch (error) {
        logger.error({ error }, 'IPC: 请求语音识别权限失败');
        resolve({ success: false, error: error instanceof Error ? error.message : String(error) });
      }
    });
  });

  /**
   * 开始语音识别
   */
  ipcMain.handle('speech-recognition-start', async (event) => {
    return new Promise((resolve) => {
      try {
        const isDev = process.env.NODE_ENV === 'development';
        if (isDev && process.platform === 'darwin') {
          // 在开发模式下先显式请求权限，避免因 Info.plist 不完整导致 TCC 触发异常
          try {
            const moduleForPerm = loadSpeechRecognitionModule();
            const tmp = new moduleForPerm.SpeechRecognition();
            tmp.requestPermission((perm: any) => {
              logger.info('开发模式下权限检查结果:', perm);
            });
          } catch (e) {
            logger.warn('开发模式下权限预检查失败（可忽略）:', e);
          }
        }

        const module = loadSpeechRecognitionModule();

        // 停止之前的识别任务
        if (speechRecognizer) {
          try {
            speechRecognizer.stopRecognition();
          } catch (e) {
            logger.warn('停止之前的识别任务时出错:', e);
          }
        }

        speechRecognizer = new module.SpeechRecognition();

        speechRecognizer.startRecognition((result: any) => {
          logger.info('语音识别结果:', result);

          // 发送结果到渲染进程
          event.sender.send('speech-recognition-result', result);

          if (result.success && result.isFinal) {
            resolve({ success: true, text: result.text });
          } else if (!result.success) {
            resolve({ success: false, error: result.error });
          }
        });

        logger.info('语音识别已开始');
      } catch (error) {
        logger.error({ error }, 'IPC: 开始语音识别失败');
        resolve({ success: false, error: error instanceof Error ? error.message : String(error) });
      }
    });
  });

  /**
   * 停止语音识别
   */
  ipcMain.handle('speech-recognition-stop', async () => {
    try {
      if (speechRecognizer) {
        speechRecognizer.stopRecognition();
        speechRecognizer = null;
        logger.info('语音识别已停止');
        return { success: true };
      } else {
        return { success: false, error: '没有正在进行的语音识别任务' };
      }
    } catch (error) {
      logger.error({ error }, 'IPC: 停止语音识别失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
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
        logger.info('开始系统音频扬声器捕获');

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
        logger.info('系统音频扬声器捕获已停止');
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

  logger.info('IPC 通信处理器设置完成');
}
