import { BrowserWindow, screen } from 'electron';
import type { WindowConfig } from '../../shared/types.js';
import { createLogger } from '../../utils/logger.js';
import { getPreloadPath, getRendererPath, getWindowIconPath } from '../utils/paths.js';

const log = createLogger('InterviewerWindow');

export class InterviewerWindow {
  private window: BrowserWindow | null = null;
  private isDevelopment: boolean;
  private parentWindow: BrowserWindow | null = null;

  private readonly config: WindowConfig = {
    id: 'interviewer',
    label: 'interviewer',
    width: 100, // 实际宽度由 WindowManager 按"左侧 10px+剩余 70%"动态设置
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
    if (this.window) return;
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
        title: 'CueMate Interviewer',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: false, // 禁用以允许 WebSocket 连接到 localhost ASR 服务
          devTools: this.isDevelopment,
          preload: getPreloadPath('interviewer'),
        },
      });

      // 根据全局隐身状态应用内容保护
      try {
        const enabled = !!(global as any).stealthModeEnabled;
        this.window.setContentProtection(enabled);
      } catch {}

      this.window.setAlwaysOnTop(true, 'screen-saver');
      this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      this.window.setFullScreenable(false);

      if (this.isDevelopment) {
        await this.window.loadURL('http://localhost:3000/src/renderer/interviewer/');
      } else {
        await this.window.loadFile(getRendererPath('interviewer'));
      }

      this.setupEvents();

      // 语音识别窗口始终打开开发者工具（用于调试音频问题）
      this.window.webContents.openDevTools({ mode: 'detach' });
    } catch (error) {
      log.error('create', '创建 interviewer 窗口失败', {}, error);
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
    // 通知 control-bar 窗口可见性变化
    this.notifyVisibilityChange(true);
  }

  public hide(): void {
    if (!this.window) return;
    if (this.window.isVisible()) {
      this.window.hide();
      // 通知 control-bar 窗口可见性变化
      this.notifyVisibilityChange(false);
    }
  }

  /**
   * 通知父窗口（control-bar）interviewer 窗口可见性变化
   */
  private notifyVisibilityChange(isVisible: boolean): void {
    if (this.parentWindow && !this.parentWindow.isDestroyed()) {
      this.parentWindow.webContents.send('interviewer-visibility-changed', isVisible);
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
