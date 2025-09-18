import { app, nativeImage } from 'electron';
import { logger } from '../../utils/logger.js';
import { getAppIconPath } from './paths.js';

let lastEnsureAt = 0;

/**
 * 幂等保证：保持 ActivationPolicy 为 regular，显示 Dock，并设置自定义图标。
 * - 仅在 macOS 生效
 * - 多次调用无副作用
 */
export function ensureDockActiveAndIcon(_reason: string = 'ensure'): void {
  if (process.platform !== 'darwin' || !app.dock) return;

  // 轻量节流，避免同一时刻重复触发
  const now = Date.now();
  if (now - lastEnsureAt < 150) return;
  lastEnsureAt = now;

  try {
    // 确保激活策略为 regular
    try {
      if (typeof (app as any).setActivationPolicy === 'function') {
        (app as any).setActivationPolicy('regular');
      }
    } catch (e) {
      logger.debug({ e }, 'setActivationPolicy regular 失败（可忽略）');
    }

    // 显示 Dock（如果已显示则无视觉变化）
    try {
      app.dock.show();
    } catch (e) {
      logger.debug({ e }, 'app.dock.show 失败（可忽略）');
    }

    // 设置 Dock 图标
    try {
      const iconPath = getAppIconPath();
      const img = nativeImage.createFromPath(iconPath);

      if (!img || img.isEmpty()) {
        logger.warn({ iconPath }, '无法加载 Dock 图标');
        return;
      }

      app.dock.setIcon(img);
    } catch (e) {
      logger.warn({ e }, '设置 Dock 图标失败');
    }
  } catch (error) {
    logger.warn({ error }, 'ensureDockActiveAndIcon 执行异常');
  }
}
