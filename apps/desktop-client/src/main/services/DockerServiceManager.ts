import { execSync } from 'child_process';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('DockerServiceManager');
import { getDockerEnv } from '../utils/dockerPath.js';
import { getDataDir } from '../utils/paths.js';

/**
 * Docker 服务管理器
 * 负责管理 CueMate 相关 Docker 容器的启动和停止
 */
export class DockerServiceManager {
  private static readonly CONTAINER_PREFIX = 'cuemate';
  private static readonly PROJECT_NAME = 'cuemate';
  private static readonly REGISTRY =
    process.env.REGISTRY || 'registry.cn-beijing.aliyuncs.com/cuemate';

  /**
   * 获取当前应用版本
   * 优先使用环境变量，否则从 app.getVersion() 获取
   */
  private static getVersion(): string {
    if (process.env.VERSION) {
      return process.env.VERSION;
    }
    // app.getVersion() 返回 "0.1.1"，需要加上 "v" 前缀
    const appVersion = app.getVersion();
    return appVersion.startsWith('v') ? appVersion : `v${appVersion}`;
  }

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
        log.info('getDockerComposeDir', '开发环境：使用项目 infra/docker 目录', { devDir });
        return devDir;
      }
    }

    // 3. 生产环境：检查用户数据目录
    const userDataDir = path.join(app.getPath('userData'), 'docker');
    const userComposePath = path.join(userDataDir, 'docker-compose.yml');

    // 如果用户数据目录没有 docker-compose.yml，尝试从应用资源目录复制
    if (!fs.existsSync(userComposePath)) {
      const appResourcesDir = path.join(app.getAppPath(), 'resources', 'docker');
      const appComposePath = path.join(appResourcesDir, 'docker-compose.yml');

      if (fs.existsSync(appComposePath)) {
        log.info('getDockerComposeDir', '首次初始化：复制 docker-compose.yml 到用户数据目录', { from: appResourcesDir, to: userDataDir });
        // 确保目录存在
        if (!fs.existsSync(userDataDir)) {
          fs.mkdirSync(userDataDir, { recursive: true });
        }
        // 复制文件
        fs.copyFileSync(appComposePath, userComposePath);
        log.info('getDockerComposeDir', 'docker-compose.yml 复制成功');
      } else {
        throw new Error(`找不到 docker-compose.yml 文件，应用资源目录: ${appResourcesDir}`);
      }
    }

    // 返回用户数据目录
    log.info('getDockerComposeDir', '生产环境：使用用户数据目录', { userDataDir });
    return userDataDir;
  }

  /**
   * 检查所有 CueMate 相关容器是否正在运行
   */
  private static areAllContainersRunning(): boolean {
    try {
      const command = `docker ps --filter "name=${this.CONTAINER_PREFIX}" --filter "status=running" --format "{{.Names}}"`;
      log.debug('areAllContainersRunning', 'Docker: 检查容器运行状态', { command });

      const output = execSync(command, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: getDockerEnv()
      }).trim();

      if (!output) {
        return false;
      }

      const runningContainers = output.split('\n');

      // 必须的 6 个核心容器
      const requiredContainers = [
        'cuemate-chroma',
        'cuemate-asr',
        'cuemate-web-api',
        'cuemate-llm-router',
        'cuemate-rag-service',
        'cuemate-web',
      ];

      // 检查所有必需容器是否都在运行
      const allRunning = requiredContainers.every(required =>
        runningContainers.some(running => running === required)
      );

      if (!allRunning) {
        const missingContainers = requiredContainers.filter(required =>
          !runningContainers.some(running => running === required)
        );
        log.warn('areAllContainersRunning', '部分容器未运行', { missingContainers, runningContainers });
      }

      return allRunning;
    } catch (error: any) {
      log.warn('areAllContainersRunning', 'Docker 容器状态检查失败', {
        stderr: error.stderr?.toString(),
        stdout: error.stdout?.toString()
      }, error);
      return false;
    }
  }

  /**
   * 检查容器是否存在（无论是否运行）
   */
  private static areContainersExist(): boolean {
    try {
      const command = `docker ps -a --filter "name=${this.CONTAINER_PREFIX}-" --format "{{.Names}}"`;
      log.debug('areContainersExist', 'Docker: 检查容器是否存在', { command });

      const output = execSync(command, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: getDockerEnv()
      }).trim();

      if (!output) {
        return false;
      }

      // 必须的 6 个核心容器
      const requiredContainers = [
        'cuemate-chroma',
        'cuemate-asr',
        'cuemate-web-api',
        'cuemate-llm-router',
        'cuemate-rag-service',
        'cuemate-web',
      ];

      const existingContainers = output.split('\n');

      // 检查是否至少有一个必需容器存在
      const hasAnyRequired = requiredContainers.some(required =>
        existingContainers.some(existing => existing === required)
      );

      return hasAnyRequired;
    } catch (error: any) {
      log.warn('areContainersExist', 'Docker 容器存在性检查失败', {
        stderr: error.stderr?.toString(),
        stdout: error.stdout?.toString()
      }, error);
      return false;
    }
  }

  /**
   * 获取现有容器的镜像版本
   * 通过检查容器的镜像标签来获取版本
   */
  private static getContainerImageVersion(): string | null {
    try {
      // 检查 cuemate-web-api 容器的镜像版本作为参考
      const command = `docker inspect --format='{{.Config.Image}}' cuemate-web-api`;
      const output = execSync(command, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: getDockerEnv()
      }).trim();

      if (!output) {
        return null;
      }

      // 镜像格式: registry.cn-beijing.aliyuncs.com/cuemate/cuemate-web-api:v0.1.0
      // 提取版本号
      const versionMatch = output.match(/:([^:]+)$/);
      if (versionMatch) {
        return versionMatch[1];
      }
      return null;
    } catch (error: any) {
      log.debug('getContainerImageVersion', '获取容器镜像版本失败', {
        stderr: error.stderr?.toString()
      });
      return null;
    }
  }

  /**
   * 删除所有 CueMate 容器（用于版本升级时重建）
   */
  private static removeContainers(dockerComposeDir: string, composeEnv: Record<string, string>): void {
    try {
      log.info('removeContainers', '正在删除旧版本容器...');
      const command = `docker compose -p ${this.PROJECT_NAME} -f docker-compose.yml down`;

      execSync(command, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: dockerComposeDir,
        env: composeEnv
      });

      log.info('removeContainers', '旧版本容器删除成功');
    } catch (error: any) {
      log.error('removeContainers', '删除容器失败', {
        stderr: error.stderr?.toString(),
        stdout: error.stdout?.toString()
      }, error);
      throw error;
    }
  }

  /**
   * 启动 Docker 服务
   */
  public static async start(): Promise<void> {
    try {
      log.info('start', '开始启动 Docker 服务...', {
        cwd: process.cwd(),
        cwdExists: fs.existsSync(process.cwd())
      });

      // 检查容器是否已经在运行
      if (this.areAllContainersRunning()) {
        log.info('start', 'Docker 服务已在运行，无需重复启动');
        return;
      }

      // 获取 docker-compose 目录
      const dockerComposeDir = this.getDockerComposeDir();
      log.info('start', '使用 docker-compose 目录', { dockerComposeDir });

      // 使用统一的数据目录
      const dataDir = getDataDir();
      const currentVersion = this.getVersion();
      const envVars = `VERSION=${currentVersion} REGISTRY=${this.REGISTRY} DATA_DIR="${dataDir}"`;

      // 验证目录存在
      if (!fs.existsSync(dockerComposeDir)) {
        throw new Error(`Docker compose 目录不存在: ${dockerComposeDir}`);
      }

      // 构建环境变量（合并 Docker PATH 和 compose 变量）
      const composeEnv = {
        ...getDockerEnv(),
        VERSION: currentVersion,
        REGISTRY: this.REGISTRY,
        DATA_DIR: dataDir
      };

      // 检查容器是否存在
      let containersExist = this.areContainersExist();

      // 如果容器存在，检查版本是否匹配
      if (containersExist) {
        const containerVersion = this.getContainerImageVersion();
        if (containerVersion && containerVersion !== currentVersion) {
          // 版本不匹配，需要删除旧容器重建
          log.info('start', '检测到版本变化，需要重建容器', {
            containerVersion,
            currentVersion
          });
          this.removeContainers(dockerComposeDir, composeEnv);
          containersExist = false; // 容器已删除，标记为不存在
        }
      }

      if (containersExist) {
        // 容器已存在且版本匹配，使用 docker compose start
        log.info('start', 'Docker 容器已存在，正在启动...', { dockerComposeDir, envVars, composeEnv });
        const command = `docker compose -p ${this.PROJECT_NAME} -f docker-compose.yml start`;
        log.debug('start', 'Docker: 执行启动命令', { command, cwd: dockerComposeDir });

        try {
          const output = execSync(command, {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: dockerComposeDir,
            env: composeEnv
          });
          if (output) {
            log.info('start', 'Docker compose start 输出', { output: output.trim() });
          }
        } catch (error: any) {
          log.error('start', 'Docker compose start 失败', {
            stderr: error.stderr?.toString(),
            stdout: error.stdout?.toString(),
            cwd: dockerComposeDir
          }, error);
          throw error;
        }
      } else {
        // 容器不存在或已被删除（版本升级），使用 docker compose up -d
        log.info('start', 'Docker 容器不存在，正在创建并启动...', { dockerComposeDir, envVars, composeEnv });
        const command = `docker compose -p ${this.PROJECT_NAME} -f docker-compose.yml up -d`;
        log.debug('start', 'Docker: 执行创建命令', { command, cwd: dockerComposeDir });

        try {
          const output = execSync(command, {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: dockerComposeDir,
            env: composeEnv
          });
          if (output) {
            log.info('start', 'Docker compose up 输出', { output: output.trim() });
          }
        } catch (error: any) {
          log.error('start', 'Docker compose up 失败', {
            stderr: error.stderr?.toString(),
            stdout: error.stdout?.toString(),
            cwd: dockerComposeDir
          }, error);
          throw error;
        }
      }

      log.info('start', 'Docker 服务启动成功');
    } catch (error) {
      log.error('start', 'Docker 服务启动失败', {}, error);
      throw error;
    }
  }

  /**
   * 停止 Docker 服务
   */
  public static async stop(): Promise<void> {
    try {
      log.info('stop', '开始停止 Docker 服务...');

      // 检查是否有容器存在（无论是否全部运行）
      if (!this.areContainersExist()) {
        log.info('stop', 'Docker 容器不存在，无需停止');
        return;
      }

      // 获取 docker-compose 目录
      const dockerComposeDir = this.getDockerComposeDir();

      // 验证目录存在
      if (!fs.existsSync(dockerComposeDir)) {
        log.warn('stop', 'Docker compose 目录不存在，跳过停止', { dockerComposeDir });
        return;
      }

      // 构建环境变量（合并 Docker PATH 和 compose 变量）
      const composeEnv = {
        ...getDockerEnv(),
        VERSION: this.getVersion(),
        REGISTRY: this.REGISTRY
      };

      // 停止容器
      log.info('stop', '正在停止 Docker 服务...', { dockerComposeDir, composeEnv });
      const command = `docker compose -p ${this.PROJECT_NAME} -f docker-compose.yml stop`;
      log.debug('stop', 'Docker: 执行停止命令', { command, cwd: dockerComposeDir });

      try {
        const output = execSync(command, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: dockerComposeDir,
          env: composeEnv
        });
        if (output) {
          log.info('stop', 'Docker compose stop 输出', { output: output.trim() });
        }
      } catch (error: any) {
        log.error('stop', 'Docker compose stop 失败', {
          stderr: error.stderr?.toString(),
          stdout: error.stdout?.toString(),
          cwd: dockerComposeDir
        }, error);
        throw error;
      }

      log.info('stop', 'Docker 服务停止成功');
    } catch (error) {
      log.error('stop', 'Docker 服务停止失败', {}, error);
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
