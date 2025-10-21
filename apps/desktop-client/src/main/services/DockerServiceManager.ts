import { execSync } from 'child_process';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../../utils/logger.js';

/**
 * Docker 服务管理器
 * 负责管理 CueMate 相关 Docker 容器的启动和停止
 */
export class DockerServiceManager {
  private static readonly CONTAINER_PREFIX = 'cuemate';
  private static readonly VERSION = process.env.VERSION || 'v0.1.0';

  /**
   * 获取 docker-compose 文件所在目录
   * 优先级：
   * 1. 环境变量 CUEMATE_DOCKER_DIR
   * 2. 开发环境：使用项目 infra/docker 目录
   * 3. 生产环境：用户数据目录 ~/Library/Application Support/CueMate/docker (macOS)
   * 4. 生产环境：应用资源目录（打包在应用内）
   */
  private static getDockerComposeDir(): string {
    // 1. 检查环境变量（最高优先级）
    if (process.env.CUEMATE_DOCKER_DIR) {
      return process.env.CUEMATE_DOCKER_DIR;
    }

    // 2. 开发环境：优先使用项目 infra/docker 目录
    if (process.env.NODE_ENV === 'development') {
      const devDir = path.resolve(app.getAppPath(), '../../infra/docker');
      if (fs.existsSync(path.join(devDir, 'docker-compose.yml'))) {
        logger.info({ devDir }, '开发环境：使用项目 infra/docker 目录');
        return devDir;
      }
    }

    // 3. 生产环境：检查用户数据目录
    const userDataDir = path.join(app.getPath('userData'), 'docker');
    const userComposePath = path.join(userDataDir, 'docker-compose.yml');
    if (fs.existsSync(userComposePath)) {
      logger.info({ userDataDir }, '生产环境：使用用户数据目录');
      return userDataDir;
    }

    // 4. 生产环境：检查应用资源目录
    const appResourcesDir = path.join(app.getAppPath(), 'resources', 'docker');
    const appComposePath = path.join(appResourcesDir, 'docker-compose.yml');
    if (fs.existsSync(appComposePath)) {
      logger.info({ appResourcesDir }, '生产环境：使用应用资源目录');
      return appResourcesDir;
    }

    throw new Error('找不到 docker-compose.yml 文件');
  }

  /**
   * 检查所有 CueMate 相关容器是否正在运行
   */
  private static areAllContainersRunning(): boolean {
    try {
      const output = execSync(
        `docker ps --filter "name=${this.CONTAINER_PREFIX}" --filter "status=running" --format "{{.Names}}"`,
        { encoding: 'utf-8', stdio: 'pipe' }
      ).trim();

      if (!output) {
        return false;
      }

      const runningContainers = output.split('\n');
      // 至少应该有几个核心容器在运行
      return runningContainers.length >= 3;
    } catch (error) {
      logger.warn({ error }, 'Docker 容器状态检查失败');
      return false;
    }
  }

  /**
   * 检查容器是否存在（无论是否运行）
   */
  private static areContainersExist(): boolean {
    try {
      const output = execSync(
        `docker ps -a --filter "name=${this.CONTAINER_PREFIX}" --format "{{.Names}}"`,
        { encoding: 'utf-8', stdio: 'pipe' }
      ).trim();

      return output.length > 0;
    } catch (error) {
      logger.warn({ error }, 'Docker 容器存在性检查失败');
      return false;
    }
  }

  /**
   * 启动 Docker 服务
   */
  public static async start(): Promise<void> {
    try {
      logger.info('开始启动 Docker 服务...');

      // 检查容器是否已经在运行
      if (this.areAllContainersRunning()) {
        logger.info('Docker 服务已在运行，无需重复启动');
        return;
      }

      // 获取 docker-compose 目录
      const dockerComposeDir = this.getDockerComposeDir();
      logger.info({ dockerComposeDir }, '使用 docker-compose 目录');

      // 检查容器是否存在
      const containersExist = this.areContainersExist();

      if (containersExist) {
        // 容器已存在但未运行，使用 docker compose start
        logger.info('Docker 容器已存在，正在启动...');
        execSync(
          `cd "${dockerComposeDir}" && env VERSION=${this.VERSION} docker compose -f docker-compose.yml start`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      } else {
        // 容器不存在，使用 docker compose up -d
        logger.info('Docker 容器不存在，正在创建并启动...');
        execSync(
          `cd "${dockerComposeDir}" && env VERSION=${this.VERSION} docker compose -f docker-compose.yml up -d`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
      }

      logger.info('Docker 服务启动成功');
    } catch (error) {
      logger.error({ error }, 'Docker 服务启动失败');
      throw error;
    }
  }

  /**
   * 停止 Docker 服务
   */
  public static async stop(): Promise<void> {
    try {
      logger.info('开始停止 Docker 服务...');

      // 检查容器是否在运行
      if (!this.areAllContainersRunning()) {
        logger.info('Docker 服务未运行，无需停止');
        return;
      }

      // 检查容器是否存在
      if (!this.areContainersExist()) {
        logger.info('Docker 容器不存在，无需停止');
        return;
      }

      // 获取 docker-compose 目录
      const dockerComposeDir = this.getDockerComposeDir();

      // 停止容器
      logger.info('正在停止 Docker 服务...');
      execSync(
        `cd "${dockerComposeDir}" && env VERSION=${this.VERSION} docker compose -f docker-compose.yml stop`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );

      logger.info('Docker 服务停止成功');
    } catch (error) {
      logger.error({ error }, 'Docker 服务停止失败');
      // 停止失败不抛出异常，避免阻塞应用退出
    }
  }

  /**
   * 获取服务状态
   */
  public static getStatus(): {
    running: boolean;
    exists: boolean;
  } {
    return {
      running: this.areAllContainersRunning(),
      exists: this.areContainersExist(),
    };
  }
}
