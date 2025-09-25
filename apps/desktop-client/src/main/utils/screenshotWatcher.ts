import { execFile } from 'child_process';
import { logger } from '../../utils/logger.js';

export type ScreenshotStateListener = (isCapturing: boolean) => void;

/**
 * macOS 系统截图进程检测
 * 只检测系统自带的截图工具进程
 */
export class ScreenshotWatcher {
  private timer: NodeJS.Timeout | null = null;
  private isCapturing: boolean = false;
  private listeners = new Set<ScreenshotStateListener>();

  public start(pollMs: number = 250): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.poll(), pollMs);
  }

  public stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  public onChange(listener: ScreenshotStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(next: boolean): void {
    if (next === this.isCapturing) return;
    this.isCapturing = next;
    for (const l of this.listeners) {
      try {
        l(this.isCapturing);
      } catch {}
    }
  }

  private poll(): void {
    if (process.platform !== 'darwin') return;

    try {
      // 检测系统截图进程
      execFile(
        'pgrep',
        ['-laf', 'screencapture|screencaptureui|ScreenShotUIServer'],
        (err, stdout) => {
          if (err && (err as any).code !== 1) {
            logger.debug({ err }, 'ScreenshotWatcher: pgrep system error');
          }
          const hasSystemCapture = typeof stdout === 'string' && stdout.trim().length > 0;

          if (hasSystemCapture) {
            logger.debug('System screenshot process detected');
            this.emit(true);
          } else {
            this.emit(false);
          }
        },
      );
    } catch (error) {
      logger.debug({ error }, 'ScreenshotWatcher: poll failed');
      this.emit(false);
    }
  }

}
