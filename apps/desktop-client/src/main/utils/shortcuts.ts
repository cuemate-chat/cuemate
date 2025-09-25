import { globalShortcut } from 'electron';
import type { ShortcutConfig } from '../../shared/types.js';
import { logger } from '../../utils/logger.js';
import { WindowManager } from '../windows/WindowManager.js';

/**
 * 设置全局快捷键
 * 替代 Tauri 的全局快捷键功能
 */
export function setupGlobalShortcuts(windowManager: WindowManager): void {
  // 简化日志：不输出批量注册信息

  // 快捷键配置列表
  const shortcuts: ShortcutConfig[] = [
    {
      accelerator: 'CommandOrControl+\\',
      callback: () => {
        windowManager.toggleFloatingWindows();
      },
    },
    {
      accelerator: 'CommandOrControl+J',
      callback: () => {
        windowManager.toggleMainContent();
      },
    },
    {
      accelerator: 'CommandOrControl+Return',
      callback: () => {
        windowManager.toggleAIQuestion();
      },
    },
    {
      accelerator: 'CommandOrControl+Alt+Q',
      callback: () => {
        windowManager.hideFloatingWindows();
      },
    },
    {
      accelerator: 'CommandOrControl+Alt+S',
      callback: () => {
        windowManager.showFloatingWindows();
      },
    },
    {
      accelerator: 'CommandOrControl+Shift+H',
      callback: () => {
        // 隐藏浮动窗口和主内容窗口，但不影响AI问答窗口的独立状态
        windowManager.hideFloatingWindows();
        windowManager.hideMainContent();
      },
    },
  ];

  // 注册快捷键
  let registeredCount = 0;
  let failedCount = 0;

  shortcuts.forEach((shortcut) => {
    try {
      const success = globalShortcut.register(shortcut.accelerator, shortcut.callback);

      if (success) {
        registeredCount++;
      } else {
        logger.error(`快捷键注册失败: ${shortcut.accelerator} (可能已被其他应用占用)`);
        failedCount++;
      }
    } catch (error) {
      logger.error({ error }, `快捷键注册异常: ${shortcut.accelerator}`);
      failedCount++;
    }
  });

  // 不输出“注册完成”统计，避免 info 刷屏
}

/**
 * 注册单个快捷键
 */
export function registerShortcut(accelerator: string, callback: () => void): boolean {
  try {
    const success = globalShortcut.register(accelerator, callback);
    if (!success) logger.error(`动态注册快捷键失败: ${accelerator}`);
    return success;
  } catch (error) {
    logger.error({ error }, `动态注册快捷键异常: ${accelerator}`);
    return false;
  }
}

/**
 * 注销单个快捷键
 */
export function unregisterShortcut(accelerator: string): void {
  try {
    globalShortcut.unregister(accelerator);
  } catch (error) {
    logger.error({ error }, `注销快捷键失败: ${accelerator}`);
  }
}

/**
 * 注销所有快捷键
 */
export function unregisterAllShortcuts(): void {
  try {
    globalShortcut.unregisterAll();
  } catch (error) {
    logger.error({ error }, '注销所有快捷键失败');
  }
}

/**
 * 检查快捷键是否已注册
 */
export function isShortcutRegistered(accelerator: string): boolean {
  try {
    return globalShortcut.isRegistered(accelerator);
  } catch (error) {
    logger.error({ error }, `检查快捷键注册状态失败: ${accelerator}`);
    return false;
  }
}

/**
 * 获取所有可用的快捷键修饰符组合
 * macOS 系统下的快捷键说明
 */
export function getShortcutInfo(): Record<string, string> {
  return {
    CommandOrControl: 'macOS 下为 Cmd 键，Windows/Linux 下为 Ctrl 键',
    Alt: 'Option 键 (macOS) 或 Alt 键 (Windows/Linux)',
    Shift: 'Shift 键',
    Super: 'Windows 键 (Windows/Linux) 或 Cmd 键 (macOS)',
    Meta: '等同于 Super 键',
    '\\': '反斜杠键',
    Plus: '加号键',
    Space: '空格键',
    Tab: 'Tab 键',
    Backspace: '退格键',
    Delete: '删除键',
    Insert: '插入键',
    Return: 'Enter 键',
    Up: '上方向键',
    Down: '下方向键',
    Left: '左方向键',
    Right: '右方向键',
    Home: 'Home 键',
    End: 'End 键',
    PageUp: 'PageUp 键',
    PageDown: 'PageDown 键',
    Escape: 'Esc 键',
    VolumeUp: '音量增加键',
    VolumeDown: '音量减少键',
    VolumeMute: '静音键',
    MediaNextTrack: '下一曲键',
    MediaPreviousTrack: '上一曲键',
    MediaStop: '停止键',
    MediaPlayPause: '播放/暂停键',
  };
}

/**
 * 验证快捷键格式是否正确
 */
export function validateShortcut(accelerator: string): boolean {
  try {
    // 使用 Electron 的内部验证机制
    // 尝试注册然后立即注销来验证格式
    const testCallback = () => {};
    const canRegister = globalShortcut.register(accelerator, testCallback);

    if (canRegister) {
      globalShortcut.unregister(accelerator);
      return true;
    }
    return false;
  } catch (error) {
    logger.error({ error }, `快捷键格式验证失败: ${accelerator}`);
    return false;
  }
}

/**
 * 获取当前已注册的快捷键列表
 * 注意: Electron 不提供直接获取已注册快捷键的 API
 * 这里返回我们应用中定义的快捷键列表
 */
export function getRegisteredShortcuts(): string[] {
  const shortcuts = [
    'CommandOrControl+\\',
    'CommandOrControl+J',
    'CommandOrControl+Return',
    'CommandOrControl+Alt+Q',
    'CommandOrControl+Alt+S',
    'CommandOrControl+Shift+H',
    'CommandOrControl+Shift+A',
  ];

  return shortcuts.filter((shortcut) => globalShortcut.isRegistered(shortcut));
}
