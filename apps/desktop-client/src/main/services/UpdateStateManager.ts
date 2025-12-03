import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('UpdateStateManager');

interface UpdateState {
  version: string;
  currentStep: string;
  startTime: number;
  backups: {
    dockerCompose?: string;
    appPath?: string;
  };
  platform: string;
  arch: string;
}

/**
 * 更新状态管理器
 * 用于记录更新状态和支持回滚
 */
export class UpdateStateManager {
  private static readonly STATE_FILE = path.join(app.getPath('userData'), 'update-state.json');

  /**
   * 保存更新状态
   */
  public static saveState(state: UpdateState): void {
    try {
      fs.writeFileSync(this.STATE_FILE, JSON.stringify(state, null, 2));
      log.info('saveState', '更新状态已保存', { ...state });
    } catch (error) {
      log.error('saveState', '保存更新状态失败', {}, error);
    }
  }

  /**
   * 读取更新状态
   */
  public static loadState(): UpdateState | null {
    try {
      if (fs.existsSync(this.STATE_FILE)) {
        const content = fs.readFileSync(this.STATE_FILE, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      log.error('loadState', '读取更新状态失败', {}, error);
    }
    return null;
  }

  /**
   * 清除更新状态
   */
  public static clearState(): void {
    try {
      if (fs.existsSync(this.STATE_FILE)) {
        fs.unlinkSync(this.STATE_FILE);
        log.info('clearState', '更新状态已清除');
      }
    } catch (error) {
      log.error('clearState', '清除更新状态失败', {}, error);
    }
  }

  /**
   * 检查是否有未完成的更新
   */
  public static hasIncompleteUpdate(): boolean {
    return fs.existsSync(this.STATE_FILE);
  }

  /**
   * 获取备份目录
   */
  public static getBackupDir(): string {
    return path.join(app.getPath('userData'), 'backup');
  }

  /**
   * 创建备份目录
   */
  public static ensureBackupDir(): void {
    const backupDir = this.getBackupDir();
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
  }
}
