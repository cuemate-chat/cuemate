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

// ============================================================================
// 面试 ID 持久化存储（用于恢复面试）
// 路径：resuming_interviews/interviewId.json
// 格式：{ mockInterviewId: string, trainingInterviewId: string }
// ============================================================================

/**
 * 面试 ID 存储格式
 */
export interface ResumingInterviewIds {
  mockInterviewId: string;      // 模拟面试 ID，空字符串表示无
  trainingInterviewId: string;  // 面试训练 ID，空字符串表示无
}

/**
 * 默认值（空字符串，不用 null）
 */
const defaultResumingInterviewIds: ResumingInterviewIds = {
  mockInterviewId: '',
  trainingInterviewId: '',
};

/**
 * 获取 interviewId 文件路径
 */
export function getInterviewIdFilePath(): string {
  return path.join(app.getPath('userData'), 'resuming_interviews', 'interviewId.json');
}

/**
 * 加载面试 ID
 */
export function loadResumingInterviewIds(): ResumingInterviewIds {
  try {
    const file = getInterviewIdFilePath();
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf-8');
      const json = JSON.parse(raw || '{}');
      return {
        mockInterviewId: json.mockInterviewId || '',
        trainingInterviewId: json.trainingInterviewId || '',
      };
    }
  } catch {
    // 读取失败时返回默认值
  }
  return { ...defaultResumingInterviewIds };
}

/**
 * 保存面试 ID（完整覆盖）
 */
export function saveResumingInterviewIds(ids: ResumingInterviewIds): void {
  try {
    const file = getInterviewIdFilePath();
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(file, JSON.stringify(ids, null, 2));
  } catch {
    // 保存失败时忽略
  }
}

/**
 * 保存模拟面试 ID
 */
export function saveMockInterviewId(mockInterviewId: string): void {
  const current = loadResumingInterviewIds();
  current.mockInterviewId = mockInterviewId || '';
  saveResumingInterviewIds(current);
}

/**
 * 保存面试训练 ID
 */
export function saveTrainingInterviewId(trainingInterviewId: string): void {
  const current = loadResumingInterviewIds();
  current.trainingInterviewId = trainingInterviewId || '';
  saveResumingInterviewIds(current);
}

/**
 * 清除模拟面试 ID
 */
export function clearMockInterviewId(): void {
  saveMockInterviewId('');
}

/**
 * 清除面试训练 ID
 */
export function clearTrainingInterviewId(): void {
  saveTrainingInterviewId('');
}

/**
 * 清除所有面试 ID
 */
export function clearAllInterviewIds(): void {
  saveResumingInterviewIds({ ...defaultResumingInterviewIds });
}

// ============================================================================
// 兼容旧 API（逐步废弃）
// ============================================================================

/**
 * @deprecated 使用 loadResumingInterviewIds 代替
 */
export function loadInterviewId(): string | null {
  const ids = loadResumingInterviewIds();
  // 优先返回模拟面试 ID，兼容旧逻辑
  return ids.mockInterviewId || ids.trainingInterviewId || null;
}

/**
 * @deprecated 使用 saveMockInterviewId 或 saveTrainingInterviewId 代替
 */
export function saveInterviewId(interviewId: string | null): void {
  // 兼容旧逻辑：保存到 mockInterviewId
  saveMockInterviewId(interviewId || '');
}

/**
 * @deprecated 使用 clearMockInterviewId 或 clearTrainingInterviewId 代替
 */
export function clearInterviewId(): void {
  clearMockInterviewId();
}
