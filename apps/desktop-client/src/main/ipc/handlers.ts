import { app, dialog, ipcMain, shell } from 'electron';
import WebSocket from 'ws';
import type { FrontendLogMessage } from '../../shared/types.js';
import { logger } from '../../utils/logger.js';
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
   * 获取 macOS 系统可用的声音列表
   */
  ipcMain.handle('get-available-voices', async () => {
    try {
      if (process.platform !== 'darwin') {
        return { success: false, error: 'get-available-voices only supported on macOS' };
      }
      const { exec } = await import('node:child_process');
      const voices = await new Promise<string>((resolve, reject) => {
        exec('say -v ?', (error, stdout) => {
          if (error) return reject(error);
          resolve(stdout);
        });
      });

      // 解析声音列表
      const voiceLines = voices.split('\n').filter((line) => line.trim());
      const voiceList = voiceLines
        .map((line) => {
          // 解析格式: "VoiceName              locale    # Description"
          const match = line.match(/^([^#]+?)\s+([a-z]{2}_[A-Z]{2})\s+#\s*(.+)$/);
          if (match) {
            const [, name, locale, description] = match;
            const cleanName = name.trim();
            const [lang, region] = locale.trim().split('_');
            const language = getLanguageName(lang);
            const regionName = getRegionName(region);

            // 生成显示名称
            let displayName = cleanName;

            // 特殊处理：Tingting 显示为婷婷
            if (cleanName.toLowerCase() === 'tingting') {
              displayName = '婷婷';
            }

            // 给所有声音加上语言和地区信息
            displayName = `${displayName} (${language}（${regionName}）)`;

            return {
              commandName: cleanName, // 用于执行命令的纯英文名称
              displayName: displayName, // 用于显示的带语言信息名称
              locale: locale.trim(),
              description: description.trim(),
            };
          }
          return null;
        })
        .filter(Boolean);

      // 按照自定义的四级分类方式分组
      const categorizedVoices = voiceList.reduce(
        (categories, voice) => {
          if (!voice) return categories;

          const [lang, region] = voice.locale.split('_');
          const language = getLanguageName(lang);
          const regionName = getRegionName(region);

          // 判断声音类型
          let category: string;
          if (voice.commandName.toLowerCase().includes('siri')) {
            category = 'Siri';
          } else if (lang === 'zh') {
            category = '中文';
          } else if (lang === 'en') {
            category = '英文';
          } else {
            category = '其他';
          }

          const subCategory = `${language}(${regionName})`;

          if (!categories[category]) {
            categories[category] = {};
          }
          if (!categories[category][subCategory]) {
            categories[category][subCategory] = [];
          }
          categories[category][subCategory].push(voice);

          return categories;
        },
        {} as Record<string, Record<string, any[]>>,
      );

      // 按优先级排序：中文 > 英文 > Siri > 其他
      const sortedCategories = Object.entries(categorizedVoices).sort(([a], [b]) => {
        const order = ['中文', '英文', 'Siri', '其他'];
        return order.indexOf(a) - order.indexOf(b);
      });

      // 在每个分类内，按语言排序子分类，并让 Tingting 排在第一位
      const finalCategories = sortedCategories.map(([category, subCategories]) => [
        category,
        Object.entries(subCategories)
          .map(([subCategoryName, voices]) => [
            subCategoryName,
            voices.sort((a, b) => {
              // Tingting 始终排在第一位
              if (
                a.commandName.toLowerCase().includes('tingting') &&
                !b.commandName.toLowerCase().includes('tingting')
              )
                return -1;
              if (
                !a.commandName.toLowerCase().includes('tingting') &&
                b.commandName.toLowerCase().includes('tingting')
              )
                return 1;
              // 其他按字母顺序
              return a.commandName.localeCompare(b.commandName);
            }),
          ])
          .sort((a, b) => {
            const aName = a[0] as string;
            const bName = b[0] as string;

            // 普通话（中国大陆）必须排在第一位
            if (aName.includes('普通话(中国大陆)') && !bName.includes('普通话(中国大陆)'))
              return -1;
            if (!aName.includes('普通话(中国大陆)') && bName.includes('普通话(中国大陆)')) return 1;

            // 其他中文子分类优先
            if (aName.includes('中文') && !bName.includes('中文')) return -1;
            if (!aName.includes('中文') && bName.includes('中文')) return 1;

            return aName.localeCompare(bName);
          }),
      ]);

      return { success: true, voiceCategories: finalCategories };
    } catch (error) {
      logger.error({ error }, 'IPC: get-available-voices failed');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // 语言代码到语言名称的映射
  function getLanguageName(langCode: string): string {
    const languageMap: Record<string, string> = {
      en: '英语',
      zh: '普通话',
      ja: '日语',
      ko: '韩语',
      fr: '法语',
      de: '德语',
      es: '西班牙语',
      it: '意大利语',
      pt: '葡萄牙语',
      ru: '俄语',
      ar: '阿拉伯语',
      hi: '印地语',
      th: '泰语',
      vi: '越南语',
      nl: '荷兰语',
      sv: '瑞典语',
      da: '丹麦语',
      no: '挪威语',
      fi: '芬兰语',
      pl: '波兰语',
      tr: '土耳其语',
      he: '希伯来语',
      el: '希腊语',
      cs: '捷克语',
      sk: '斯洛伐克语',
      hu: '匈牙利语',
      ro: '罗马尼亚语',
      bg: '保加利亚语',
      hr: '克罗地亚语',
      sl: '斯洛文尼亚语',
      et: '爱沙尼亚语',
      lv: '拉脱维亚语',
      lt: '立陶宛语',
      uk: '乌克兰语',
      ca: '加泰罗尼亚语',
      ms: '马来语',
      id: '印尼语',
      ta: '泰米尔语',
      te: '泰卢固语',
      kn: '卡纳达语',
      ml: '马拉雅拉姆语',
      gu: '古吉拉特语',
      pa: '旁遮普语',
      bn: '孟加拉语',
      ur: '乌尔都语',
    };

    return languageMap[langCode] || langCode.toUpperCase();
  }

  // 地区代码到地区名称的映射
  function getRegionName(regionCode: string): string {
    const regionMap: Record<string, string> = {
      CN: '中国大陆',
      TW: '台湾',
      HK: '香港',
      US: '美国',
      GB: '英国',
      AU: '澳大利亚',
      CA: '加拿大',
      FR: '法国',
      DE: '德国',
      ES: '西班牙',
      IT: '意大利',
      JP: '日本',
      KR: '韩国',
      RU: '俄罗斯',
      BR: '巴西',
      MX: '墨西哥',
      IN: '印度',
      TH: '泰国',
      VN: '越南',
      NL: '荷兰',
      SE: '瑞典',
      DK: '丹麦',
      NO: '挪威',
      FI: '芬兰',
      PL: '波兰',
      TR: '土耳其',
      IL: '以色列',
      GR: '希腊',
      CZ: '捷克',
      SK: '斯洛伐克',
      HU: '匈牙利',
      RO: '罗马尼亚',
      BG: '保加利亚',
      HR: '克罗地亚',
      SI: '斯洛文尼亚',
      EE: '爱沙尼亚',
      LV: '拉脱维亚',
      LT: '立陶宛',
      UA: '乌克兰',
      SA: '沙特阿拉伯',
      AE: '阿联酋',
      EG: '埃及',
      ZA: '南非',
      NZ: '新西兰',
      SG: '新加坡',
      MY: '马来西亚',
      ID: '印尼',
      PH: '菲律宾',
    };

    return regionMap[regionCode] || regionCode;
  }

  /**
   * 使用 macOS 本地 say 命令发声
   */
  ipcMain.handle('speak-text', async (_event, args: { voice: string; text: string }) => {
    try {
      const { voice, text } = args || { voice: '', text: '' };
      if (process.platform !== 'darwin') {
        return { success: false, error: 'speak-text only supported on macOS' };
      }
      const { exec } = await import('node:child_process');
      const safeVoice = voice?.replace(/[^\w\- ]/g, '') || 'Alex';
      const safeText = text?.replace(/"/g, '\\"') || '';
      await new Promise<void>((resolve, reject) => {
        exec(`say -v ${safeVoice} "${safeText}"`, (error) => {
          if (error) return reject(error);
          resolve();
        });
      });
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: speak-text failed');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

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
        logger.debug('开始系统音频扬声器捕获，先同步ASR配置');

        // 1. 先同步ASR配置
        const configSynced = await syncASRConfig();
        if (!configSynced) {
          logger.warn('ASR配置同步失败，但继续音频捕获流程');
        }

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
   * 同步ASR配置到服务
   */
  async function syncASRConfig(): Promise<boolean> {
    try {
      logger.debug('同步ASR配置到服务');
      const response = await fetch('http://localhost:3001/asr/sync-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10秒超时
      });

      if (response.ok) {
        const result = await response.json();
        logger.debug('ASR配置同步成功:', result);
        return true;
      } else {
        const error = await response.text();
        logger.warn('ASR配置同步失败:', error);
        return false;
      }
    } catch (error) {
      logger.error('ASR配置同步过程中发生错误:', error);
      return false;
    }
  }

  /**
   * 麦克风测试 - 30秒采集 + 真实 ASR 识别
   */
  ipcMain.handle('mic-test-start', async (event, _options?: { deviceId?: string }) => {
    try {
      logger.debug('开始麦克风测试，先同步ASR配置');

      // 1. 先同步ASR配置
      const configSynced = await syncASRConfig();
      if (!configSynced) {
        logger.warn('ASR配置同步失败，但继续测试流程');
      }

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

  logger.debug('IPC 通信处理器设置完成');
}
