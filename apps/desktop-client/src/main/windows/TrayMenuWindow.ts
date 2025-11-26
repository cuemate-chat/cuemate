import { BrowserWindow, screen, Tray } from 'electron';
import type { WindowConfig } from '../../shared/types.js';
import { logger } from '../../utils/logger.js';
import { getPreloadPath, getRendererPath, getWindowIconPath } from '../utils/paths.js';

export class TrayMenuWindow {
  private window: BrowserWindow | null = null;
  private isDevelopment: boolean;

  private readonly config: WindowConfig = {
    id: 'tray-menu',
    label: 'tray-menu',
    width: 400,
    height: 310,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    skipTaskbar: true,
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
    if (this.window) return;

    try {
      this.window = new BrowserWindow({
        width: this.config.width,
        height: this.config.height,
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
        title: 'CueMate Menu',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: true,
          devTools: this.isDevelopment,
          preload: getPreloadPath('tray-menu'),
        },
      });

      // 设置始终在最前
      this.window.setAlwaysOnTop(true, 'pop-up-menu');
      this.window.setVisibleOnAllWorkspaces(true);
      this.window.setFullScreenable(false);

      // 加载页面
      if (this.isDevelopment) {
        await this.window.loadURL('http://localhost:3000/src/renderer/tray-menu/');
      } else {
        await this.window.loadFile(getRendererPath('tray-menu'));
      }

      this.setupEvents();

      logger.info('托盘菜单窗口创建成功');
    } catch (error) {
      logger.error({ error }, '创建托盘菜单窗口失败');
      throw error;
    }
  }

  private setupEvents(): void {
    if (!this.window) return;

    // 点击窗口外部时自动隐藏（标准托盘菜单行为）
    this.window.on('blur', () => {
      this.hide();
    });

    // 关闭时隐藏而非销毁
    this.window.on('close', (event) => {
      event.preventDefault();
      this.hide();
    });
  }

  /**
   * 在托盘图标附近显示菜单
   */
  public showNearTray(tray: Tray | null): void {
    if (!this.window || !tray) return;

    const trayBounds = tray.getBounds();
    const windowBounds = this.window.getBounds();
    // 获取托盘图标所在的显示器，而不是主显示器
    const display = screen.getDisplayMatching(trayBounds);
    const workArea = display.workArea;

    // 计算菜单显示位置
    let x: number;
    let y: number;

    if (process.platform === 'darwin') {
      // macOS: 托盘在顶部状态栏
      x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2);
      y = Math.round(trayBounds.y + trayBounds.height + 8); // 距离托盘图标 8px
    } else if (process.platform === 'win32') {
      // Windows: 托盘在右下角
      x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2);
      y = Math.round(trayBounds.y - windowBounds.height - 8);
    } else {
      // Linux: 根据实际情况调整
      x = Math.round(trayBounds.x);
      y = Math.round(trayBounds.y - windowBounds.height);
    }

    // 确保窗口不会超出屏幕边界
    if (x + windowBounds.width > workArea.x + workArea.width) {
      x = workArea.x + workArea.width - windowBounds.width - 10;
    }
    if (x < workArea.x) {
      x = workArea.x + 10;
    }
    if (y + windowBounds.height > workArea.y + workArea.height) {
      y = workArea.y + workArea.height - windowBounds.height - 10;
    }
    if (y < workArea.y) {
      y = workArea.y + 10;
    }

    this.window.setPosition(x, y, false);
    this.window.show();
    this.window.focus();
    this.window.setAlwaysOnTop(true, 'pop-up-menu');

    // 通知渲染进程托盘菜单已显示，触发数据刷新
    this.window.webContents.send('tray-menu-shown');
  }

  public hide(): void {
    if (!this.window) return;
    if (this.window.isVisible()) {
      this.window.hide();
    }
  }

  public isVisible(): boolean {
    return this.window?.isVisible() ?? false;
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

  /**
   * 通知托盘菜单设置已变更，触发数据刷新
   */
  public notifySettingsChanged(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send('settings-changed');
    }
  }
}
