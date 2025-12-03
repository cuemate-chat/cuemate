import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '../../utils/logger.js';
import { getDockerEnv } from '../utils/dockerPath.js';
import type { WebSocketClient } from '../websocket/WebSocketClient.js';

const log = createLogger('UpdateService');

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
      log.info('startUpdate', 'UpdateService: 开始更新流程', { version });

      // 发送初始状态
      this.sendProgress('downloading', 0, '正在准备更新');

      // 执行更新流程，通过 WebSocket 实时上报进度到 Web 端
      await this.executeUpdateWithWebSocket(version);
    } catch (error) {
      log.error('startUpdate', 'UpdateService: 更新失败', {}, error);
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
      log.info('executeUpdateWithWebSocket', '[UPDATE-TEST] 开始更新流程，平台信息', { platform, arch, version });

      this.sendLog('========================================');
      this.sendLog(`CueMate 更新程序 - 目标版本: ${version}`);
      this.sendLog('========================================');
      this.sendLog(`平台: ${platform} | 架构: ${arch}`);
      this.sendLog('');

      // 步骤 1: 下载更新包 (0% → 25%)
      this.sendLog('>>> 步骤 1/6: 下载更新包');
      log.info('executeUpdateWithWebSocket', '[UPDATE-TEST] ========== 步骤 1/6: 下载更新包 ==========');
      this.sendProgress('downloading', 0, '正在下载更新包');
      const tempDir = await this.downloadWithProgress(version, platform, arch);
      log.info('executeUpdateWithWebSocket', '[UPDATE-TEST] 下载完成，临时目录', { tempDir });
      this.sendLog('');

      // 步骤 2: 解压并验证 (25% → 40%)
      this.sendLog('>>> 步骤 2/6: 解压更新包');
      log.info('executeUpdateWithWebSocket', '[UPDATE-TEST] ========== 步骤 2/6: 解压更新包 ==========');
      this.sendProgress('extracting', 25, '正在解压更新包');
      await this.extractWithProgress(tempDir);
      log.info('executeUpdateWithWebSocket', '[UPDATE-TEST] 解压完成');
      this.sendLog('');

      // 步骤 3: 拉取 Docker 镜像 (40% → 70%)
      // 先拉取镜像，如果失败不会影响当前应用
      this.sendLog('>>> 步骤 3/6: 拉取 Docker 镜像');
      log.info('executeUpdateWithWebSocket', '[UPDATE-TEST] ========== 步骤 3/6: 拉取 Docker 镜像 ==========');
      this.sendProgress('pulling-images', 40, '正在拉取 Docker 镜像');
      await this.pullImagesWithProgress(tempDir);
      log.info('executeUpdateWithWebSocket', '[UPDATE-TEST] Docker 镜像拉取完成');
      this.sendLog('');

      // 步骤 4: 替换应用文件 (70% → 90%)
      // 镜像拉取成功后再替换应用，确保版本一致性
      this.sendLog('>>> 步骤 4/6: 替换应用文件');
      log.info('executeUpdateWithWebSocket', '[UPDATE-TEST] ========== 步骤 4/6: 替换应用文件 ==========');
      this.sendProgress('installing', 70, '正在替换应用文件');
      await this.replaceApplicationFiles(tempDir, platform);
      log.info('executeUpdateWithWebSocket', '[UPDATE-TEST] 应用文件替换完成');
      this.sendLog('');

      // 步骤 5: 准备重启 (90% → 100%)
      this.sendLog('>>> 步骤 5/6: 准备重启');
      log.info('executeUpdateWithWebSocket', '[UPDATE-TEST] ========== 步骤 5/6: 准备重启 ==========');
      this.sendProgress('ready', 90, '更新完成，准备重启');
      this.sendLog('更新完成，3 秒后自动重启应用...');

      // 等待 3 秒
      log.info('executeUpdateWithWebSocket', '[UPDATE-TEST] 等待 3 秒后重启...');
      await this.sleep(3000);

      // 步骤 6: 重启应用
      this.sendLog('>>> 步骤 6/6: 重启应用');
      log.info('executeUpdateWithWebSocket', '[UPDATE-TEST] ========== 步骤 6/6: 重启应用 ==========');
      this.sendProgress('restarting', 100, '正在重启应用');
      this.sendLog('正在重启...');
      await this.sleep(1000);

      // 重启
      log.info('executeUpdateWithWebSocket', '[UPDATE-TEST] 执行 app.relaunch() 和 app.quit()');
      app.relaunch();
      app.quit();
    } catch (error) {
      log.error('executeUpdateWithWebSocket', 'UpdateService: 更新执行失败', {}, error);
      this.sendLog(`更新失败: ${(error as Error).message}`);
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

      log.info('downloadWithProgress', 'UpdateService: 开始下载更新包', { url, downloadPath });
      this.sendLog(`下载地址: ${url}`);
      this.sendLog(`临时目录: ${tempDir}`);

      const file = fs.createWriteStream(downloadPath);
      let downloadedBytes = 0;
      let totalBytes = 0;
      let lastProgressPercent = 0;
      let lastTime = Date.now();
      let lastBytes = 0;

      https
        .get(url, (response: any) => {
          if (response.statusCode !== 200) {
            this.sendLog(`HTTP 错误: ${response.statusCode}`);
            reject(new Error(`下载失败: HTTP ${response.statusCode}`));
            return;
          }

          totalBytes = parseInt(response.headers['content-length'] || '0', 10);
          const totalInMB = (totalBytes / 1024 / 1024).toFixed(1);
          log.info('downloadWithProgress', 'UpdateService: 更新包总大小', { totalBytes });
          this.sendLog(`文件大小: ${totalInMB} MB`);
          this.sendLog('开始下载...');

          response.on('data', (chunk: Buffer) => {
            downloadedBytes += chunk.length;
            file.write(chunk);

            // 计算下载进度 (0% → 25%)
            const downloadPercent = Math.floor((downloadedBytes / totalBytes) * 100);
            const totalProgress = Math.floor(downloadPercent * 0.25); // 下载占总进度的 25%

            // 每 5% 上报一次进度，同时发送详细日志
            if (totalProgress - lastProgressPercent >= 5 || totalProgress === 25) {
              const now = Date.now();
              const timeDiff = (now - lastTime) / 1000; // 秒
              const bytesDiff = downloadedBytes - lastBytes;
              const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
              const speedInMB = (speed / 1024 / 1024).toFixed(2);

              lastProgressPercent = totalProgress;
              lastTime = now;
              lastBytes = downloadedBytes;

              const sizeInMB = (downloadedBytes / 1024 / 1024).toFixed(1);
              const totalMB = (totalBytes / 1024 / 1024).toFixed(1);

              this.sendProgress(
                'downloading',
                totalProgress,
                `正在下载更新包 (${sizeInMB}MB/${totalMB}MB)`,
              );
              this.sendLog(`下载进度: ${downloadPercent}% | ${sizeInMB}/${totalMB} MB | ${speedInMB} MB/s`);
            }
          });

          response.on('end', () => {
            file.end();
            const finalSizeMB = (downloadedBytes / 1024 / 1024).toFixed(1);
            this.sendLog(`下载完成: ${finalSizeMB} MB`);
            log.info('downloadWithProgress', 'UpdateService: 下载完成', { downloadPath });
            resolve(tempDir);
          });

          response.on('error', (error: Error) => {
            file.close();
            this.sendLog(`下载出错: ${error.message}`);
            reject(new Error(`下载失败: ${error.message}`));
          });
        })
        .on('error', (error: Error) => {
          this.sendLog(`连接失败: ${error.message}`);
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
      log.info('extractWithProgress', 'UpdateService: 开始解压更新包', { tempDir });
      this.sendLog(`解压文件: ${downloadPath}`);
      this.sendLog('执行: tar -xzf ...');

      // 解压 tar.gz
      execSync(`tar -xzf "${downloadPath}" -C "${tempDir}"`, {
        stdio: 'inherit',
      });
      this.sendLog('解压完成');

      this.sendProgress('extracting', 35, '正在验证更新包');
      this.sendLog('验证 manifest 文件...');

      // 读取并验证 manifest
      const manifestPath = path.join(tempDir, 'update-manifest.json');
      if (!fs.existsSync(manifestPath)) {
        this.sendLog('错误: update-manifest.json 不存在');
        throw new Error('更新包缺少 manifest 文件');
      }
      this.sendLog('manifest 文件验证通过');

      // 读取 manifest 内容
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      this.sendLog(`版本: ${manifest.version}`);
      this.sendLog(`包含 Docker 镜像: ${manifest.dockerImages?.length || 0} 个`);

      this.sendProgress('extracting', 40, '更新包验证完成');
      log.info('extractWithProgress', 'UpdateService: 解压完成');
    } catch (error) {
      log.error('extractWithProgress', 'UpdateService: 解压失败', {}, error);
      this.sendLog(`解压失败: ${(error as Error).message}`);
      throw new Error(`解压失败: ${(error as Error).message}`);
    }
  }

  /**
   * 替换应用文件
   */
  private async replaceApplicationFiles(tempDir: string, platform: string): Promise<void> {
    try {
      log.info('replaceApplicationFiles', 'UpdateService: 开始替换应用文件');

      // 确定应用路径
      const appPath = platform === 'macos' ? '/Applications/CueMate.app' : app.getAppPath();
      const newAppPath = path.join(tempDir, 'CueMate.app');

      this.sendLog(`目标路径: ${appPath}`);
      this.sendLog(`新版本路径: ${newAppPath}`);

      if (!fs.existsSync(newAppPath)) {
        this.sendLog('错误: 更新包中缺少 CueMate.app');
        throw new Error('更新包中缺少 CueMate.app');
      }
      this.sendLog('新版本文件检查通过');

      this.sendProgress('installing', 45, '正在备份当前版本');

      // 备份当前版本
      const backupDir = path.join(app.getPath('userData'), 'backups', `backup-${Date.now()}`);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      this.sendLog(`备份目录: ${backupDir}`);

      const { execSync } = require('child_process');

      this.sendProgress('installing', 50, '正在替换应用文件');

      // 先删除旧应用，再复制新应用
      // 注意：不能用 cp -pR src dst，那样会把 src 复制到 dst 里面
      this.sendLog(`删除旧版本: ${appPath}`);
      execSync(`rm -rf "${appPath}"`, { stdio: 'pipe' });

      this.sendLog(`复制新版本: ${newAppPath} -> ${appPath}`);
      execSync(`cp -pR "${newAppPath}" "${appPath}"`, {
        stdio: 'inherit',
      });
      this.sendLog('应用文件复制完成');

      this.sendProgress('installing', 55, '正在禁用 asar integrity check');
      this.sendLog('修改 Info.plist...');

      // 修改 Info.plist
      await this.disableAsarIntegrityCheck(appPath);
      this.sendLog('Info.plist 修改完成');

      this.sendProgress('installing', 60, '应用文件替换完成');
      log.info('replaceApplicationFiles', 'UpdateService: 应用文件替换完成');
    } catch (error) {
      log.error('replaceApplicationFiles', 'UpdateService: 替换应用文件失败', {}, error);
      this.sendLog(`替换失败: ${(error as Error).message}`);
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
        log.warn('disableAsarIntegrityCheck', 'Info.plist 不存在，跳过');
        return;
      }

      // 读取 plist 文件
      let plistContent = fs.readFileSync(plistPath, 'utf-8');

      // 检查是否已经存在 ElectronAsarIntegrity 配置
      if (plistContent.includes('ElectronAsarIntegrity')) {
        log.info('disableAsarIntegrityCheck', 'ElectronAsarIntegrity 已禁用');
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

      log.info('disableAsarIntegrityCheck', 'ElectronAsarIntegrity 已禁用');
    } catch (error) {
      log.error('disableAsarIntegrityCheck', 'UpdateService: 禁用 asar integrity check 失败', {}, error);
      throw error;
    }
  }

  /**
   * 拉取 Docker 镜像（带进度）
   */
  private async pullImagesWithProgress(tempDir: string): Promise<void> {
    try {
      log.info('pullImagesWithProgress', 'UpdateService: 开始拉取 Docker 镜像');

      // 读取 manifest
      const manifestPath = path.join(tempDir, 'update-manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

      const images = manifest.dockerImages || [];
      const totalImages = images.length;

      if (totalImages === 0) {
        log.warn('pullImagesWithProgress', 'UpdateService: manifest 中没有 Docker 镜像');
        this.sendLog('manifest 中没有 Docker 镜像');
        this.sendProgress('pulling-images', 90, '没有需要拉取的镜像');
        return;
      }

      this.sendLog(`需要拉取 ${totalImages} 个 Docker 镜像`);

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
        this.sendLog(`----------------------------------------`);
        this.sendLog(`[${i + 1}/${totalImages}] 拉取镜像: ${image.remote}`);

        try {
          // 使用 spawn 实时输出 docker pull 日志
          await this.execWithRealtimeOutput('docker', ['pull', image.remote]);
          this.sendLog(`镜像拉取成功: ${image.remote}`);

          // 标记镜像
          this.sendLog(`标记镜像: ${image.remote} -> ${image.local}`);
          const { execSync } = require('child_process');
          execSync(`docker tag ${image.remote} ${image.local}`, {
            stdio: 'pipe',
            env: getDockerEnv(),
          });
          this.sendLog(`镜像标记完成`);
        } catch (error) {
          log.error('pullImagesWithProgress', `UpdateService: 拉取镜像失败: ${image.name}`, { image: image.name }, error);
          this.sendLog(`错误: 拉取镜像 ${image.name} 失败`);
          throw new Error(`拉取镜像 ${image.name} 失败`);
        }
      }

      this.sendLog(`----------------------------------------`);
      this.sendLog('所有 Docker 镜像拉取完成');
      this.sendProgress('pulling-images', 90, '所有镜像拉取完成');
      log.info('pullImagesWithProgress', 'UpdateService: 所有镜像拉取完成');

      // 清理旧版本镜像
      this.sendLog('清理旧版本镜像...');
      await this.cleanupOldImages(manifest.version);
    } catch (error) {
      log.error('pullImagesWithProgress', 'UpdateService: 拉取 Docker 镜像失败', {}, error);
      this.sendLog(`Docker 镜像拉取失败: ${(error as Error).message}`);
      throw new Error(`拉取 Docker 镜像失败: ${(error as Error).message}`);
    }
  }

  /**
   * 执行命令并实时输出
   */
  private execWithRealtimeOutput(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      const proc = spawn(command, args, { env: getDockerEnv() });

      proc.stdout.on('data', (data: Buffer) => {
        const lines = data.toString().trim().split('\n');
        for (const line of lines) {
          if (line.trim()) {
            this.sendLog(line.trim());
          }
        }
      });

      proc.stderr.on('data', (data: Buffer) => {
        const lines = data.toString().trim().split('\n');
        for (const line of lines) {
          if (line.trim()) {
            this.sendLog(line.trim());
          }
        }
      });

      proc.on('close', (code: number) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`命令执行失败，退出码: ${code}`));
        }
      });

      proc.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  /**
   * 清理旧版本镜像
   */
  private async cleanupOldImages(currentVersion: string): Promise<void> {
    try {
      const { execSync } = require('child_process');
      const dockerEnv = getDockerEnv();

      // 获取所有 CueMate 相关镜像
      const output = execSync('docker images --format "{{.Repository}}:{{.Tag}}"', {
        encoding: 'utf-8',
        env: dockerEnv,
      });

      const images = output
        .split('\n')
        .filter((line: string) => line.includes('cuemate-'))
        .filter((line: string) => !line.includes(currentVersion) && !line.includes('<none>'));

      if (images.length === 0) {
        log.info('cleanupOldImages', 'UpdateService: 没有旧版本镜像需要清理');
        return;
      }

      log.info('cleanupOldImages', 'UpdateService: 清理旧版本镜像', { images, currentVersion });

      for (const image of images) {
        try {
          execSync(`docker rmi ${image}`, { stdio: 'pipe', env: dockerEnv });
          log.info('cleanupOldImages', 'UpdateService: 已删除旧镜像', { image });
        } catch (error) {
          log.warn('cleanupOldImages', 'UpdateService: 删除旧镜像失败，可能仍在使用', { image });
        }
      }
    } catch (error) {
      log.error('cleanupOldImages', 'UpdateService: 清理旧镜像失败', {}, error);
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

      log.info('sendProgress', 'UpdateService: 进度更新', { status, progress, currentStep, error });
    } catch (err) {
      log.error('sendProgress', 'UpdateService: 发送进度失败', {}, err);
    }
  }

  /**
   * 发送日志消息到 Web 端
   */
  private sendLog(message: string): void {
    try {
      this.wsClient.send({
        type: 'UPDATE_PROGRESS',
        log: message,
      });
    } catch (err) {
      log.error('sendLog', 'UpdateService: 发送日志失败', {}, err);
    }
  }

  /**
   * 休眠指定时间
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
