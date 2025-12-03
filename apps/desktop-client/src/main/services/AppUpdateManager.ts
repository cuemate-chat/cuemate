import { execSync } from 'child_process';
import { app, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('AppUpdateManager');
import { getDockerEnv } from '../utils/dockerPath.js';
import type { WindowManager } from '../windows/WindowManager.js';
import { DockerServiceManager } from './DockerServiceManager.js';
import { UpdateStateManager } from './UpdateStateManager.js';

interface UpdateProgress {
  stepId: string;
  stage: string;
  percent: number;
  message: string;
  targetVersion?: string;
  stepDetail?: string;
}

interface UpdateManifest {
  version: string;
  platform: string;
  dockerArch: string;
  dockerImages: Array<{
    name: string;
    remote: string;
    local: string;
  }>;
  checksums: {
    app: string;
    compose: string;
  };
  releaseNotes: string;
  updateTime: string;
}

/**
 * 应用更新管理器
 */
export class AppUpdateManager {
  private static progressWindow: BrowserWindow | null = null;
  private static updateState: any = null;

  /**
   * 启动更新流程
   */
  public static async startUpdate(version: string, _windowManager: WindowManager): Promise<void> {
    try {
      log.info('startUpdate', '开始更新流程', { version });

      // 1. 创建独立的更新进度窗口
      this.createProgressWindow();

      // 2. 隐藏其他窗口
      // WindowManager 会在更新完成后恢复
      // 注意: 目前不主动隐藏窗口，更新窗口置顶即可

      // 3. 初始化更新状态
      const { platform, arch, dockerArch } = this.detectPlatform();
      this.updateState = {
        version,
        currentStep: 'init',
        startTime: Date.now(),
        backups: {},
        platform,
        arch,
      };
      UpdateStateManager.saveState(this.updateState);

      // 4. 执行更新
      await this.executeUpdate(version, platform, arch, dockerArch);

      // 5. 成功后清除状态
      UpdateStateManager.clearState();
    } catch (error) {
      log.error('startUpdate', '更新失败，开始回滚', {}, error);
      await this.rollback();
      this.showError(error);
    }
  }

  /**
   * 创建独立的更新进度窗口
   */
  private static createProgressWindow(): void {
    this.progressWindow = new BrowserWindow({
      width: 700,
      height: 600,
      resizable: false,
      frame: true,
      alwaysOnTop: true,
      title: 'CueMate 更新中',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // 加载更新进度页面
    const htmlPath = path.join(
      process.env.NODE_ENV === 'development' ? process.cwd() : app.getAppPath(),
      'resources/update-progress/index.html',
    );
    this.progressWindow.loadFile(htmlPath);

    // 防止窗口被关闭
    this.progressWindow.on('close', (event) => {
      event.preventDefault();
    });
  }

  /**
   * 检测平台和架构
   */
  private static detectPlatform(): { platform: string; arch: string; dockerArch: string } {
    const platformMap: Record<string, string> = {
      darwin: 'macos',
      win32: 'windows',
    };

    const archMap: Record<string, { arch: string; dockerArch: string }> = {
      arm64: { arch: 'arm64', dockerArch: 'arm64' },
      x64: { arch: 'x64', dockerArch: 'amd64' },
    };

    return {
      platform: platformMap[process.platform] || 'unknown',
      ...(archMap[process.arch] || { arch: 'unknown', dockerArch: 'amd64' }),
    };
  }

  /**
   * 更新进度
   */
  private static updateProgress(data: UpdateProgress): void {
    if (this.progressWindow && !this.progressWindow.isDestroyed()) {
      this.progressWindow.webContents.executeJavaScript(
        `window.updateProgress(${JSON.stringify(data)})`,
      );
    }
    log.info('updateProgress', '更新进度', { ...data });
  }

  /**
   * 更新当前步骤
   */
  private static updateStep(stepId: string): void {
    this.updateState.currentStep = stepId;
    UpdateStateManager.saveState(this.updateState);
  }

  /**
   * 执行完整的更新流程
   */
  private static async executeUpdate(
    version: string,
    platform: string,
    arch: string,
    dockerArch: string,
  ): Promise<void> {
    // Step 1: 检测环境
    this.updateProgress({
      stepId: 'detect',
      stage: '检测系统环境',
      percent: 5,
      message: `平台: ${platform}-${arch}, Docker: ${dockerArch}`,
      targetVersion: version,
    });
    await this.sleep(500);

    // Step 2: 下载更新包
    this.updateStep('download');
    const tempDir = await this.downloadUpdatePackage(version, platform, arch);

    // Step 3: 解压
    this.updateStep('extract');
    const extractDir = await this.extractUpdatePackage(tempDir);
    const manifest = this.readManifest(extractDir);

    // Step 4: 备份当前配置
    this.updateStep('backup');
    await this.createBackup();

    // Step 5: 拉取镜像
    this.updateStep('pull-images');
    await this.pullDockerImages(manifest);

    // Step 6: 停止 Docker
    this.updateStep('stop-docker');
    await this.stopDockerServices();

    // Step 7: 替换应用
    this.updateStep('replace-app');
    await this.replaceApplication(extractDir, platform);

    // Step 8: 启动 Docker
    this.updateStep('start-docker');
    await this.startDockerServices(manifest.version);

    // Step 9: 更新数据库
    this.updateStep('update-db');
    await this.updateDatabaseVersion(version);

    // Step 10: 清理
    this.updateStep('cleanup');
    this.cleanup(tempDir);

    // 完成
    this.updateProgress({
      stepId: 'cleanup',
      stage: '更新完成',
      percent: 100,
      message: '应用将在 3 秒后重启',
      targetVersion: version,
    });

    setTimeout(() => {
      app.relaunch();
      app.quit();
    }, 3000);
  }

  /**
   * 下载更新包
   */
  private static async downloadUpdatePackage(
    version: string,
    platform: string,
    arch: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // 更新包现在按版本目录组织: cuemate-version/v0.1.0/CueMate-v0.1.0-macos-arm64-update.tar.gz
      const url = `${__COS_VERSION_URL__}/${version}/CueMate-${version}-${platform}-${arch}-update.tar.gz`;
      const tempDir = path.join(app.getPath('temp'), `cuemate-update-${version}`);
      const downloadPath = path.join(tempDir, 'update.tar.gz');

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      log.info('downloadUpdatePackage', '开始下载更新包', { url, downloadPath });

      const file = fs.createWriteStream(downloadPath);
      let downloadedBytes = 0;
      let totalBytes = 0;

      https
        .get(url, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`下载失败: HTTP ${response.statusCode}`));
            return;
          }

          totalBytes = parseInt(response.headers['content-length'] || '0', 10);

          response.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            const percent =
              totalBytes > 0 ? 10 + Math.floor((downloadedBytes / totalBytes) * 20) : 10;

            this.updateProgress({
              stepId: 'download',
              stage: '下载更新包',
              percent,
              message: `已下载 ${Math.floor(downloadedBytes / 1024 / 1024)}MB / ${Math.floor(totalBytes / 1024 / 1024)}MB`,
            });
          });

          response.pipe(file);

          file.on('finish', () => {
            file.close();
            log.info('downloadUpdatePackage', '更新包下载完成');
            resolve(tempDir);
          });
        })
        .on('error', (error) => {
          fs.unlinkSync(downloadPath);
          reject(error);
        });
    });
  }

  /**
   * 解压更新包
   */
  private static async extractUpdatePackage(tempDir: string): Promise<string> {
    this.updateProgress({
      stepId: 'extract',
      stage: '解压更新包',
      percent: 35,
      message: '正在解压更新文件...',
    });

    const tarPath = path.join(tempDir, 'update.tar.gz');
    const extractDir = path.join(tempDir, 'extracted');

    // 使用 tar 命令解压
    execSync(`mkdir -p "${extractDir}" && tar -xzf "${tarPath}" -C "${extractDir}"`, {
      stdio: 'pipe',
    });

    this.updateProgress({
      stepId: 'extract',
      stage: '解压更新包',
      percent: 40,
      message: '解压完成',
    });

    return extractDir;
  }

  /**
   * 读取 manifest
   */
  private static readManifest(extractDir: string): UpdateManifest {
    const manifestPath = path.join(extractDir, 'update-manifest.json');
    const content = fs.readFileSync(manifestPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * 创建备份
   */
  private static async createBackup(): Promise<void> {
    this.updateProgress({
      stepId: 'backup',
      stage: '备份当前配置',
      percent: 43,
      message: '正在备份 docker-compose.yml 和应用信息...',
    });

    UpdateStateManager.ensureBackupDir();
    const backupDir = UpdateStateManager.getBackupDir();

    // 备份 docker-compose.yml
    const dockerDir = path.join(app.getPath('userData'), 'docker');
    const composePath = path.join(dockerDir, 'docker-compose.yml');
    if (fs.existsSync(composePath)) {
      const backupComposePath = path.join(backupDir, 'docker-compose.yml.backup');
      fs.copyFileSync(composePath, backupComposePath);
      this.updateState.backups.dockerCompose = backupComposePath;
      UpdateStateManager.saveState(this.updateState);
    }

    // 记录当前应用路径
    if (process.platform === 'darwin') {
      this.updateState.backups.appPath = '/Applications/CueMate.app';
    } else if (process.platform === 'win32') {
      this.updateState.backups.appPath = path.join(
        process.env.PROGRAMFILES || 'C:\\Program Files',
        'CueMate',
      );
    }
    UpdateStateManager.saveState(this.updateState);

    this.updateProgress({
      stepId: 'backup',
      stage: '备份当前配置',
      percent: 45,
      message: '备份完成',
    });
  }

  /**
   * 拉取 Docker 镜像
   */
  private static async pullDockerImages(manifest: UpdateManifest): Promise<void> {
    const totalImages = manifest.dockerImages.length;

    for (let i = 0; i < totalImages; i++) {
      const image = manifest.dockerImages[i];
      const percent = 45 + Math.floor((i / totalImages) * 15);

      this.updateProgress({
        stepId: 'pull-images',
        stage: '拉取 Docker 镜像',
        percent,
        message: `正在拉取镜像 ${image.name} (${i + 1}/${totalImages})`,
      });

      log.info('pullDockerImages', `拉取镜像: ${image.remote}`, { image });

      try {
        // 拉取镜像
        execSync(`docker pull ${image.remote}`, {
          encoding: 'utf-8',
          stdio: 'pipe',
          env: getDockerEnv(),
        });

        // 标记为本地镜像
        execSync(`docker tag ${image.remote} ${image.local}`, {
          encoding: 'utf-8',
          stdio: 'pipe',
          env: getDockerEnv(),
        });

        log.info('pullDockerImages', `镜像拉取并标记成功: ${image.local}`);
      } catch (error) {
        log.error('pullDockerImages', `镜像拉取失败`, { image }, error);
        throw new Error(`镜像 ${image.name} 拉取失败`);
      }
    }

    this.updateProgress({
      stepId: 'pull-images',
      stage: '拉取 Docker 镜像',
      percent: 60,
      message: '所有镜像拉取完成',
    });
  }

  /**
   * 停止 Docker 服务
   */
  private static async stopDockerServices(): Promise<void> {
    this.updateProgress({
      stepId: 'stop-docker',
      stage: '停止 Docker 服务',
      percent: 65,
      message: '正在停止 Docker 服务...',
    });

    await DockerServiceManager.stop();

    this.updateProgress({
      stepId: 'stop-docker',
      stage: '停止 Docker 服务',
      percent: 70,
      message: 'Docker 服务已停止',
    });
  }

  /**
   * 替换应用文件
   */
  private static async replaceApplication(extractDir: string, platform: string): Promise<void> {
    this.updateProgress({
      stepId: 'replace-app',
      stage: '替换应用文件',
      percent: 73,
      message: '正在更新应用文件...',
    });

    if (platform === 'macos') {
      // 只替换应用内部文件，不删除应用本身，保持签名不变
      const newAppPath = path.join(extractDir, 'CueMate.app');
      const installedAppPath = '/Applications/CueMate.app';

      if (fs.existsSync(newAppPath)) {
        log.info('replaceApplication', '更新应用内部文件（保持签名不变）');

        // 1. 替换 app.asar
        const newAsarPath = path.join(newAppPath, 'Contents/Resources/app.asar');
        const installedAsarPath = path.join(installedAppPath, 'Contents/Resources/app.asar');
        if (fs.existsSync(newAsarPath)) {
          log.info('replaceApplication', '替换 app.asar');
          if (fs.existsSync(installedAsarPath)) {
            execSync(`rm -f "${installedAsarPath}"`, { stdio: 'pipe' });
          }
          execSync(`cp "${newAsarPath}" "${installedAsarPath}"`, { stdio: 'pipe' });
        }

        // 2. 替换 app.asar.unpacked
        const newUnpackedPath = path.join(newAppPath, 'Contents/Resources/app.asar.unpacked');
        const installedUnpackedPath = path.join(
          installedAppPath,
          'Contents/Resources/app.asar.unpacked',
        );
        if (fs.existsSync(newUnpackedPath)) {
          log.info('replaceApplication', '替换 app.asar.unpacked');
          if (fs.existsSync(installedUnpackedPath)) {
            execSync(`rm -rf "${installedUnpackedPath}"`, { stdio: 'pipe' });
          }
          execSync(`cp -R "${newUnpackedPath}" "${installedUnpackedPath}"`, { stdio: 'pipe' });
        }

        // 3. 替换 Resources/bin (audiotee)
        const newBinPath = path.join(newAppPath, 'Contents/Resources/bin');
        const installedBinPath = path.join(installedAppPath, 'Contents/Resources/bin');
        if (fs.existsSync(newBinPath)) {
          log.info('replaceApplication', '替换 Resources/bin');
          if (fs.existsSync(installedBinPath)) {
            execSync(`rm -rf "${installedBinPath}"`, { stdio: 'pipe' });
          }
          execSync(`cp -R "${newBinPath}" "${installedBinPath}"`, { stdio: 'pipe' });
        }

        // 4. 替换 Resources/piper (如果存在)
        const newPiperPath = path.join(newAppPath, 'Contents/Resources/piper');
        const installedPiperPath = path.join(installedAppPath, 'Contents/Resources/piper');
        if (fs.existsSync(newPiperPath)) {
          log.info('replaceApplication', '替换 Resources/piper');
          if (fs.existsSync(installedPiperPath)) {
            execSync(`rm -rf "${installedPiperPath}"`, { stdio: 'pipe' });
          }
          execSync(`cp -R "${newPiperPath}" "${installedPiperPath}"`, { stdio: 'pipe' });
        }

        // 5. 禁用 asar 完整性校验
        // 说明：因为替换了 asar 文件但不重新签名，必须禁用完整性校验
        // 否则 Electron 会因为 hash 不匹配而拒绝加载
        const infoPlistPath = path.join(installedAppPath, 'Contents/Info.plist');
        log.info('replaceApplication', '禁用 asar 完整性校验');
        execSync(
          `/usr/libexec/PlistBuddy -c "Delete :ElectronAsarIntegrity" "${infoPlistPath}" 2>/dev/null || true`,
          { stdio: 'pipe' },
        );
      }
    } else if (platform === 'windows') {
    }

    this.updateProgress({
      stepId: 'replace-app',
      stage: '替换应用文件',
      percent: 78,
      message: '应用文件更新完成，正在更新 Docker 配置...',
    });

    // 更新 docker-compose.yml
    const newComposePath = path.join(extractDir, 'docker', 'docker-compose.yml');
    const userDataDir = app.getPath('userData');
    const dockerDir = path.join(userDataDir, 'docker');
    const installedComposePath = path.join(dockerDir, 'docker-compose.yml');

    if (fs.existsSync(newComposePath)) {
      log.info('replaceApplication', '更新 docker-compose.yml');

      // 确保目录存在
      if (!fs.existsSync(dockerDir)) {
        fs.mkdirSync(dockerDir, { recursive: true });
      }

      // 复制新配置
      fs.copyFileSync(newComposePath, installedComposePath);
    }

    this.updateProgress({
      stepId: 'replace-app',
      stage: '替换应用文件',
      percent: 80,
      message: '所有文件更新完成',
    });
  }

  /**
   * 启动 Docker 服务
   */
  private static async startDockerServices(version: string): Promise<void> {
    this.updateProgress({
      stepId: 'start-docker',
      stage: '启动 Docker 服务',
      percent: 83,
      message: '正在启动 Docker 服务...',
    });

    // 更新环境变量中的版本号
    process.env.VERSION = version;

    await DockerServiceManager.start();

    this.updateProgress({
      stepId: 'start-docker',
      stage: '启动 Docker 服务',
      percent: 90,
      message: 'Docker 服务启动成功',
    });
  }

  /**
   * 更新数据库版本字段
   */
  private static async updateDatabaseVersion(version: string): Promise<void> {
    this.updateProgress({
      stepId: 'update-db',
      stage: '更新数据库版本信息',
      percent: 93,
      message: '正在更新数据库版本信息...',
    });

    // 等待 Web API 服务启动
    await this.waitForWebAPI();

    // 调用 Web API 更新版本
    try {
      const response = await fetch('http://localhost:3001/api/system/version', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ version }),
      });

      if (!response.ok) {
        throw new Error(`更新版本失败: ${response.statusText}`);
      }

      log.info('updateDatabaseVersion', '数据库版本更新成功', { version });
    } catch (error) {
      log.error('updateDatabaseVersion', '数据库版本更新失败', {}, error);
      throw error;
    }

    this.updateProgress({
      stepId: 'update-db',
      stage: '更新数据库版本信息',
      percent: 97,
      message: '数据库版本更新成功',
    });
  }

  /**
   * 等待 Web API 服务就绪
   */
  private static async waitForWebAPI(maxRetries = 30): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch('http://localhost:3001/health');
        if (response.ok) {
          log.info('waitForWebAPI', 'Web API 服务已就绪');
          return;
        }
      } catch {
        // 继续重试
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error('Web API 服务启动超时');
  }

  /**
   * 清理临时文件
   */
  private static cleanup(tempDir: string): void {
    this.updateProgress({
      stepId: 'cleanup',
      stage: '清理临时文件',
      percent: 98,
      message: '正在清理临时文件...',
    });

    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      log.error('cleanup', '清理临时文件失败', {}, error);
    }
  }

  /**
   * 回滚
   */
  private static async rollback(): Promise<void> {
    const state = UpdateStateManager.loadState();
    if (!state) {
      log.warn('rollback', '没有找到更新状态，无法回滚');
      return;
    }

    log.info('rollback', '开始回滚更新', { state });

    try {
      // 恢复 docker-compose.yml
      if (state.backups.dockerCompose && fs.existsSync(state.backups.dockerCompose)) {
        const dockerDir = path.join(app.getPath('userData'), 'docker');
        const composePath = path.join(dockerDir, 'docker-compose.yml');
        fs.copyFileSync(state.backups.dockerCompose, composePath);
        log.info('rollback', 'docker-compose.yml 已恢复');
      }

      // 尝试启动 Docker 服务
      try {
        await DockerServiceManager.start();
        log.info('rollback', 'Docker 服务已恢复');
      } catch (error) {
        log.error('rollback', 'Docker 服务恢复失败', {}, error);
      }

      UpdateStateManager.clearState();
      log.info('rollback', '回滚完成');
    } catch (error) {
      log.error('rollback', '回滚失败', {}, error);
    }
  }

  /**
   * 应用启动时检查是否有未完成的更新
   */
  public static async checkIncompleteUpdate(): Promise<void> {
    if (UpdateStateManager.hasIncompleteUpdate()) {
      log.warn('checkIncompleteUpdate', '检测到未完成的更新，开始回滚');
      await this.rollback();
    }
  }

  /**
   * 显示错误
   */
  private static showError(error: any): void {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (this.progressWindow && !this.progressWindow.isDestroyed()) {
      this.progressWindow.webContents.executeJavaScript(
        `window.showError(${JSON.stringify(errorMsg)}, '系统已回滚到更新前的状态，请重试或联系技术支持')`,
      );
    }
  }

  /**
   * 延迟函数
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
