import { execFile } from 'child_process';
import { logger } from '../../utils/logger.js';

export type ScreenshotStateListener = (isCapturing: boolean) => void;

/**
 * macOS 截图/录屏检测（基于进程轮询，覆盖内置截图与多数第三方）
 * - 检测进程：screencapture, screencaptureui, ScreenShotUIServer
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
    // 仅 macOS 需要；其他平台直接忽略
    if (process.platform !== 'darwin') return;

    try {
      // 使用 `pgrep -laf` 检测相关进程是否存在
      execFile(
        'pgrep',
        ['-laf', 'screencapture|screencaptureui|ScreenShotUIServer'],
        (err, stdout) => {
          if (err && (err as any).code !== 1) {
            // code 1 表示未匹配到进程，非错误
            logger.debug({ err }, 'ScreenshotWatcher: pgrep error');
          }
          const hasSystem = typeof stdout === 'string' && stdout.trim().length > 0;
          this.emit(!!hasSystem);
        },
      );
    } catch (error) {
      logger.debug({ error }, 'ScreenshotWatcher: poll failed');
    }
  }
}
