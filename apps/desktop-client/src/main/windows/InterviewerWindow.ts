import { BrowserWindow, screen } from 'electron';
import type { WindowConfig } from '../../shared/types.js';
import { logger } from '../../utils/logger.js';
import { getPreloadPath, getRendererPath, getWindowIconPath } from '../utils/paths.js';

export class InterviewerWindow {
  private window: BrowserWindow | null = null;
  private isDevelopment: boolean;

  private readonly config: WindowConfig = {
    id: 'interviewer',
    label: 'interviewer',
    width: 100, // 实际宽度由 WindowManager 按"左侧10px+剩余70%"动态设置
    height: 100, // 实际高度由 WindowManager 同步 AI 窗口高度
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    skipTaskbar: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    focusable: true,
    show: false,
    center: false,
  };

  constructor(isDevelopment: boolean = false) {
    this.isDevelopment = isDevelopment;
  }

  public async create(): Promise<void> {
    if (this.window) {
      logger.info('interviewer 窗口已存在，跳过创建');
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
        title: 'CueMate Interviewer',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: !this.isDevelopment,
          devTools: true, // 语音识别窗口始终允许开发者工具
          preload: getPreloadPath('interviewer'),
        },
      });

      this.window.setAlwaysOnTop(true, 'screen-saver');
      this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      this.window.setFullScreenable(false);

      if (this.isDevelopment) {
        await this.window.loadURL('http://localhost:3000/src/renderer/interviewer/');
      } else {
        await this.window.loadFile(getRendererPath('interviewer'));
      }

      this.setupEvents();

      // 语音识别窗口始终打开独立的 DevTools 用于调试音频功能
      this.window.webContents.openDevTools({ mode: 'detach' });

      logger.info('interviewer 窗口创建成功');
    } catch (error) {
      logger.error({ error }, '创建 interviewer 窗口失败');
      throw error;
    }
  }

  private setupEvents(): void {
    if (!this.window) return;

    this.window.on('close', (event) => {
      // 面试官窗口允许关闭为隐藏
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
      logger.info('interviewer 窗口已销毁');
    }
  }
}
