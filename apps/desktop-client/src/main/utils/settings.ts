import { app } from 'electron';
import fs from 'fs';
import path from 'path';

/**
 * 应用设置接口
 */
export interface AppSettings {
  stealthModeEnabled: boolean;
  clickThroughEnabled: boolean;
  dockIconVisible: boolean;
  stopDockerOnQuit: boolean;
}

/**
 * 默认设置
 */
const defaultSettings: AppSettings = {
  stealthModeEnabled: false,
  clickThroughEnabled: false,
  dockIconVisible: false,
  stopDockerOnQuit: false,
};

/**
 * 获取设置文件路径
 */
export function getSettingsFilePath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

/**
 * 加载设置
 */
export function loadSettings(): AppSettings {
  try {
    const file = getSettingsFilePath();
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf-8');
      const json = JSON.parse(raw || '{}');
      return {
        stealthModeEnabled: !!json.stealthModeEnabled,
        clickThroughEnabled: !!json.clickThroughEnabled,
        dockIconVisible: !!json.dockIconVisible,
        stopDockerOnQuit: !!json.stopDockerOnQuit,
      };
    }
  } catch {
    // 读取失败时返回默认设置
  }
  return { ...defaultSettings };
}

/**
 * 保存设置
 */
export function saveSettings(settings: AppSettings): void {
  try {
    const file = getSettingsFilePath();
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(file, JSON.stringify(settings, null, 2));
  } catch {
    // 保存失败时忽略
  }
}
