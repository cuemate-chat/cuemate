import { BrowserWindow, screen } from 'electron';
import type { WindowConfig } from '../../shared/types.js';
import { logger } from '../../utils/logger.js';
import { getPreloadPath, getRendererPath, getWindowIconPath } from '../utils/paths.js';

export class AIQuestionHistoryWindow {
  private window: BrowserWindow | null = null;
  private isDevelopment: boolean;
  private parentWindow: BrowserWindow | null = null;

  private readonly config: WindowConfig = {
    id: 'ai-question-history',
    label: 'ai-question-history',
    width: 100, // 实际宽度由 WindowManager 按“右侧10px+剩余70%”动态设置
    height: 100, // 实际高度由 WindowManager 同步 AI 窗口高度
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    skipTaskbar: true, // 子窗口不在任务栏显示
    resizable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    focusable: true,
    show: false,
    center: false,
  };

  constructor(isDevelopment: boolean = false, parentWindow: BrowserWindow | null = null) {
    this.isDevelopment = isDevelopment;
    this.parentWindow = parentWindow;
  }

  public async create(): Promise<void> {
    if (this.window) {
      return;
    }
    try {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { x: displayX, y: displayY } = primaryDisplay.workArea;

      this.window = new BrowserWindow({
        width: this.config.width,
        height: this.config.height,
        x: displayX + 100,
        y: displayY + 100,
        icon: getWindowIconPath(),
        parent: this.parentWindow || undefined, // 设置父窗口
        alwaysOnTop: this.config.alwaysOnTop,
        frame: this.config.frame,
        transparent: this.config.transparent,
        skipTaskbar: this.config.skipTaskbar,
        resizable: this.config.resizable,
        minimizable: this.config.minimizable,
        maximizable: this.config.maximizable,
        closable: this.config.closable,
        focusable: this.config.focusable,
        show: this.config.show,
        title: 'CueMate AI Question History',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: !this.isDevelopment,
          devTools: this.isDevelopment,
          preload: getPreloadPath('aiQuestionHistory'),
        },
      });

      this.window.setAlwaysOnTop(true, 'screen-saver');
      this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      this.window.setFullScreenable(false);

      if (this.isDevelopment) {
        await this.window.loadURL('http://localhost:3000/src/renderer/ai-question-history/');
      } else {
        await this.window.loadFile(getRendererPath('ai-question-history'));
      }

      this.setupEvents();

      // 开发环境下打开独立的 DevTools
      // if (this.isDevelopment) {
      //   this.window.webContents.openDevTools({ mode: 'detach' });
      // }
    } catch (error) {
      logger.error({ error }, '创建 ai-question-history 窗口失败');
      throw error;
    }
  }

  private setupEvents(): void {
    if (!this.window) return;

    this.window.on('close', (event) => {
      // 历史窗口允许关闭为隐藏
      event.preventDefault();
      this.hide();
    });
  }

  public show(): void {
    if (!this.window) return;
    this.window.show();
    this.window.focus();
    this.window.setAlwaysOnTop(true, 'screen-saver');
    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    this.window.setFullScreenable(false);
    this.window.moveTop();
  }

  public hide(): void {
    if (!this.window) return;
    if (this.window.isVisible()) {
      this.window.hide();
    }
  }

  public setBounds(bounds: Electron.Rectangle): void {
    if (!this.window) return;
    this.window.setBounds(bounds);
  }

  public getBrowserWindow(): BrowserWindow | null {
    return this.window;
  }

  public destroy(): void {
    if (this.window) {
      this.window.destroy();
      this.window = null;
    }
  }
}
