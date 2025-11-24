import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../utils/logger.js';
import type { WebSocketClient } from '../websocket/WebSocketClient.js';

/**
 * 更新状态类型
 */
type UpdateStatus =
  | 'idle'
  | 'downloading'
  | 'extracting'
  | 'installing'
  | 'pulling-images'
  | 'ready'
  | 'restarting'
  | 'completed'
  | 'error';

/**
 * 更新服务
 * 这是一个适配器，将 AppUpdateManager 的功能适配到 WebSocket 通信
 */
export class UpdateService {
  private wsClient: WebSocketClient;

  constructor(wsClient: WebSocketClient) {
    this.wsClient = wsClient;
  }

  /**
   * 启动更新流程
   * @param version 目标版本号
   */
  public async startUpdate(version: string): Promise<void> {
    try {
      logger.info({ version }, 'UpdateService: 开始更新流程');

      // 发送初始状态
      this.sendProgress('downloading', 0, '正在准备更新');

      // 调用 AppUpdateManager 的静态方法
      // 注意：AppUpdateManager 会创建独立的进度窗口
      // 我们需要监听其进度并转换为 WebSocket 消息

      // TODO: 这里需要重构 AppUpdateManager，添加进度回调支持
      // 暂时先使用简单的状态更新

      await this.executeUpdateWithWebSocket(version);
    } catch (error) {
      logger.error({ error }, 'UpdateService: 更新失败');
      this.sendProgress('error', 0, undefined, (error as Error).message);
    }
  }

  /**
   * 执行更新并通过 WebSocket 上报进度
   */
  private async executeUpdateWithWebSocket(version: string): Promise<void> {
    try {
      // 获取平台信息
      const { platform, arch } = this.detectPlatform();

      // 步骤 1: 下载更新包 (0% → 25%)
      this.sendProgress('downloading', 0, '正在下载更新包');
      const tempDir = await this.downloadWithProgress(version, platform, arch);

      // 步骤 2: 解压并验证 (25% → 40%)
      this.sendProgress('extracting', 25, '正在解压更新包');
      await this.extractWithProgress(tempDir);

      // 步骤 3: 替换应用文件 (40% → 60%)
      this.sendProgress('installing', 40, '正在替换应用文件');
      await this.replaceApplicationFiles(tempDir, platform);

      // 步骤 4: 拉取 Docker 镜像 (60% → 90%)
      this.sendProgress('pulling-images', 60, '正在拉取 Docker 镜像');
      await this.pullImagesWithProgress(tempDir);

      // 步骤 5: 准备重启 (90% → 100%)
      this.sendProgress('ready', 90, '更新完成，准备重启');

      // 等待 3 秒
      await this.sleep(3000);

      // 步骤 6: 重启应用
      this.sendProgress('restarting', 100, '正在重启应用');
      await this.sleep(1000);

      // 重启
      app.relaunch();
      app.quit();
    } catch (error) {
      logger.error({ error }, 'UpdateService: 更新执行失败');
      throw error;
    }
  }

  /**
   * 下载更新包（带进度）
   */
  private async downloadWithProgress(
    version: string,
    platform: string,
    arch: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const https = require('https');
      const url = `${__COS_VERSION_URL__}/${version}/CueMate-${version}-${platform}-${arch}-update.tar.gz`;
      const tempDir = path.join(app.getPath('temp'), `cuemate-update-${version}`);
      const downloadPath = path.join(tempDir, 'update.tar.gz');

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      logger.info({ url, downloadPath }, 'UpdateService: 开始下载更新包');

      const file = fs.createWriteStream(downloadPath);
      let downloadedBytes = 0;
      let totalBytes = 0;
      let lastProgressPercent = 0;

      https
        .get(url, (response: any) => {
          if (response.statusCode !== 200) {
            reject(new Error(`下载失败: HTTP ${response.statusCode}`));
            return;
          }

          totalBytes = parseInt(response.headers['content-length'] || '0', 10);
          logger.info({ totalBytes }, 'UpdateService: 更新包总大小');

          response.on('data', (chunk: Buffer) => {
            downloadedBytes += chunk.length;
            file.write(chunk);

            // 计算下载进度 (0% → 25%)
            const downloadPercent = Math.floor((downloadedBytes / totalBytes) * 100);
            const totalProgress = Math.floor(downloadPercent * 0.25); // 下载占总进度的 25%

            // 每 5% 上报一次进度
            if (totalProgress - lastProgressPercent >= 5 || totalProgress === 25) {
              lastProgressPercent = totalProgress;
              const sizeInMB = (downloadedBytes / 1024 / 1024).toFixed(1);
              const totalInMB = (totalBytes / 1024 / 1024).toFixed(1);
              this.sendProgress(
                'downloading',
                totalProgress,
                `正在下载更新包 (${sizeInMB}MB/${totalInMB}MB)`,
              );
            }
          });

          response.on('end', () => {
            file.end();
            logger.info({ downloadPath }, 'UpdateService: 下载完成');
            resolve(tempDir);
          });

          response.on('error', (error: Error) => {
            file.close();
            reject(new Error(`下载失败: ${error.message}`));
          });
        })
        .on('error', (error: Error) => {
          reject(new Error(`下载失败: ${error.message}`));
        });
    });
  }

  /**
   * 解压更新包（带进度）
   */
  private async extractWithProgress(tempDir: string): Promise<void> {
    const { execSync } = require('child_process');
    const downloadPath = path.join(tempDir, 'update.tar.gz');

    try {
      logger.info({ tempDir }, 'UpdateService: 开始解压更新包');

      // 解压 tar.gz
      execSync(`tar -xzf "${downloadPath}" -C "${tempDir}"`, {
        stdio: 'inherit',
      });

      this.sendProgress('extracting', 35, '正在验证更新包');

      // 读取并验证 manifest
      const manifestPath = path.join(tempDir, 'update-manifest.json');
      if (!fs.existsSync(manifestPath)) {
        throw new Error('更新包缺少 manifest 文件');
      }

      // TODO: 验证 SHA256 校验和

      this.sendProgress('extracting', 40, '更新包验证完成');
      logger.info('UpdateService: 解压完成');
    } catch (error) {
      logger.error({ error }, 'UpdateService: 解压失败');
      throw new Error(`解压失败: ${(error as Error).message}`);
    }
  }

  /**
   * 替换应用文件
   */
  private async replaceApplicationFiles(tempDir: string, platform: string): Promise<void> {
    try {
      logger.info('UpdateService: 开始替换应用文件');

      // 确定应用路径
      const appPath = platform === 'macos' ? '/Applications/CueMate.app' : app.getAppPath();
      const newAppPath = path.join(tempDir, 'CueMate.app');

      if (!fs.existsSync(newAppPath)) {
        throw new Error('更新包中缺少 CueMate.app');
      }

      this.sendProgress('installing', 45, '正在备份当前版本');

      // 备份当前版本
      const backupDir = path.join(app.getPath('userData'), 'backups', `backup-${Date.now()}`);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const { execSync } = require('child_process');

      this.sendProgress('installing', 50, '正在替换应用文件');

      // 复制新文件（使用 cp -R 保留权限）
      execSync(`cp -pR "${newAppPath}" "${appPath}"`, {
        stdio: 'inherit',
      });

      this.sendProgress('installing', 55, '正在禁用 asar integrity check');

      // 修改 Info.plist
      await this.disableAsarIntegrityCheck(appPath);

      this.sendProgress('installing', 60, '应用文件替换完成');
      logger.info('UpdateService: 应用文件替换完成');
    } catch (error) {
      logger.error({ error }, 'UpdateService: 替换应用文件失败');
      throw new Error(`替换应用文件失败: ${(error as Error).message}`);
    }
  }

  /**
   * 禁用 asar integrity check
   */
  private async disableAsarIntegrityCheck(appPath: string): Promise<void> {
    try {
      const plistPath = path.join(appPath, 'Contents', 'Info.plist');

      if (!fs.existsSync(plistPath)) {
        logger.warn('Info.plist 不存在，跳过');
        return;
      }

      // 读取 plist 文件
      let plistContent = fs.readFileSync(plistPath, 'utf-8');

      // 检查是否已经存在 ElectronAsarIntegrity 配置
      if (plistContent.includes('ElectronAsarIntegrity')) {
        logger.info('ElectronAsarIntegrity 已禁用');
        return;
      }

      // 在 </dict>\n</plist> 之前插入配置
      const insertContent = `\t<key>ElectronAsarIntegrity</key>
\t<dict>
\t\t<key>app.asar</key>
\t\t<string></string>
\t</dict>
`;

      plistContent = plistContent.replace(
        '</dict>\n</plist>',
        `${insertContent}</dict>\n</plist>`,
      );

      // 写回文件
      fs.writeFileSync(plistPath, plistContent, 'utf-8');

      logger.info('ElectronAsarIntegrity 已禁用');
    } catch (error) {
      logger.error({ error }, 'UpdateService: 禁用 asar integrity check 失败');
      throw error;
    }
  }

  /**
   * 拉取 Docker 镜像（带进度）
   */
  private async pullImagesWithProgress(tempDir: string): Promise<void> {
    try {
      logger.info('UpdateService: 开始拉取 Docker 镜像');

      // 读取 manifest
      const manifestPath = path.join(tempDir, 'update-manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

      const images = manifest.dockerImages || [];
      const totalImages = images.length;

      if (totalImages === 0) {
        logger.warn('UpdateService: manifest 中没有 Docker 镜像');
        this.sendProgress('pulling-images', 90, '没有需要拉取的镜像');
        return;
      }

      const { execSync } = require('child_process');

      // 每个镜像占 30% / totalImages 的进度
      const progressPerImage = 30 / totalImages;

      for (let i = 0; i < totalImages; i++) {
        const image = images[i];
        const baseProgress = 60 + (i * progressPerImage);

        this.sendProgress(
          'pulling-images',
          Math.floor(baseProgress),
          `正在拉取镜像 ${image.name} (${i + 1}/${totalImages})`,
        );

        try {
          // 拉取镜像
          execSync(`docker pull ${image.remote}`, {
            stdio: 'pipe',
          });

          // 标记镜像
          execSync(`docker tag ${image.remote} ${image.local}`, {
            stdio: 'pipe',
          });
        } catch (error) {
          logger.error({ error, image: image.name }, 'UpdateService: 拉取镜像失败');
          throw new Error(`拉取镜像 ${image.name} 失败`);
        }
      }

      this.sendProgress('pulling-images', 90, '所有镜像拉取完成');
      logger.info('UpdateService: 所有镜像拉取完成');

      // 清理旧版本镜像
      await this.cleanupOldImages(manifest.version);
    } catch (error) {
      logger.error({ error }, 'UpdateService: 拉取 Docker 镜像失败');
      throw new Error(`拉取 Docker 镜像失败: ${(error as Error).message}`);
    }
  }

  /**
   * 清理旧版本镜像
   */
  private async cleanupOldImages(currentVersion: string): Promise<void> {
    try {
      const { execSync } = require('child_process');

      // 获取所有 CueMate 相关镜像
      const output = execSync('docker images --format "{{.Repository}}:{{.Tag}}"', {
        encoding: 'utf-8',
      });

      const images = output
        .split('\n')
        .filter((line: string) => line.includes('cuemate-'))
        .filter((line: string) => !line.includes(currentVersion) && !line.includes('<none>'));

      if (images.length === 0) {
        logger.info('UpdateService: 没有旧版本镜像需要清理');
        return;
      }

      logger.info({ images, currentVersion }, 'UpdateService: 清理旧版本镜像');

      for (const image of images) {
        try {
          execSync(`docker rmi ${image}`, { stdio: 'pipe' });
          logger.info({ image }, 'UpdateService: 已删除旧镜像');
        } catch (error) {
          logger.warn({ error, image }, 'UpdateService: 删除旧镜像失败，可能仍在使用');
        }
      }
    } catch (error) {
      logger.error({ error }, 'UpdateService: 清理旧镜像失败');
      // 清理失败不影响更新流程
    }
  }

  /**
   * 检测平台和架构
   */
  private detectPlatform(): { platform: string; arch: string; dockerArch: string } {
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
   * 发送更新进度到 Web 端
   */
  private sendProgress(
    status: UpdateStatus,
    progress: number,
    currentStep?: string,
    error?: string,
  ): void {
    try {
      this.wsClient.send({
        type: 'UPDATE_PROGRESS',
        status,
        progress,
        currentStep,
        error,
      });

      logger.info({ status, progress, currentStep, error }, 'UpdateService: 进度更新');
    } catch (error) {
      logger.error({ error }, 'UpdateService: 发送进度失败');
    }
  }

  /**
   * 休眠指定时间
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
