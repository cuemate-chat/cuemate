import { app, nativeImage } from 'electron';
import { logger } from '../../utils/logger.js';
import { getAppIconPath, getProjectRoot } from './paths.js';

let lastEnsureAt = 0;

/**
 * 幂等保证：保持 ActivationPolicy 为 regular，显示 Dock，并设置自定义图标。
 * - 仅在 macOS 生效
 * - 多次调用无副作用
 */
export function ensureDockActiveAndIcon(reason: string = 'ensure'): void {
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

    // 设置 Dock 图标（使用 NativeImage，避免回落默认图标）
    try {
      const iconPath = getAppIconPath();
      const img = nativeImage.createFromPath(iconPath);

      if (!img || img.isEmpty()) {
        // 回退 png（开发环境可能使用 png）
        const path = require('path');
        const pngPath = path.join(getProjectRoot(), 'assets', 'logo-icon.png');
        const pngImg = nativeImage.createFromPath(pngPath);
        if (pngImg && !pngImg.isEmpty()) {
          app.dock.setIcon(pngImg);
          logger.debug({ reason, pngPath }, 'Dock 图标已设置（fallback png）');
          return;
        }
        logger.warn({ iconPath }, '无法加载 Dock 图标，可能回退为默认');
        return;
      }

      app.dock.setIcon(img);
      logger.debug({ reason, iconPath }, 'Dock 图标已设置');
    } catch (e) {
      logger.warn({ e }, '设置 Dock 图标失败');
    }
  } catch (error) {
    logger.warn({ error }, 'ensureDockActiveAndIcon 执行异常');
  }
}
