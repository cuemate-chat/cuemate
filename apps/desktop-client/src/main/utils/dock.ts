import { app, nativeImage } from 'electron';
import { logger } from '../../utils/logger.js';
import { getAppIconPath } from './paths.js';

let lastEnsureAt = 0;

/**
 * 幂等保证：保持 ActivationPolicy 为 regular，显示 Dock，并设置自定义图标。
 * - 仅在 macOS 生效
 * - 多次调用无副作用
 */
export async function ensureDockActiveAndIcon(_reason: string = 'ensure'): Promise<void> {
  if (process.platform !== 'darwin' || !app.dock) return;

  // 轻量节流，避免同一时刻重复触发
  const now = Date.now();
  if (now - lastEnsureAt < 150) return;
  lastEnsureAt = now;

  try {
    // 显示 Dock（返回 Promise，需要 await）
    try {
      await app.dock.show();
    } catch (e) {
      logger.debug({ e }, 'app.dock.show 失败（可忽略）');
    }

    // macOS 激活策略（必须在 dock.show 之后设置，否则会被 LSUIElement 覆盖）：
    // - 'regular': 普通应用模式，Dock 显示图标 + 黑点（表示运行中）
    // - 'accessory': 辅助应用模式，Dock 不显示图标（等同于 LSUIElement=1）
    try {
      if (typeof (app as any).setActivationPolicy === 'function') {
        (app as any).setActivationPolicy('regular');
      }
    } catch (e) {
      logger.debug({ e }, 'setActivationPolicy 失败（可忽略）');
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
