import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { app } from 'electron';

/**
 * 获取当前模块目录，兼容 CommonJS 和 ESM
 */
function getCurrentDir(): string {
  // 在 CommonJS 中使用 __dirname
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }

  // 在 ESM 中使用 import.meta.url（通过运行时求值避免 CJS 构建告警）
  try {
    const getUrl = new Function(
      'try { return (typeof import !== "undefined" && import.meta && import.meta.url) || undefined } catch { return undefined }',
    ) as () => string | undefined;
    const metaUrl = getUrl();
    if (metaUrl) {
      return dirname(fileURLToPath(metaUrl));
    }
  } catch {}

  // 回退方案
  return process.cwd();
}

/**
 * ES 模块兼容的__dirname 和__filename
 */
export function getDirname(importMetaUrl: string): string {
  return dirname(fileURLToPath(importMetaUrl));
}

export function getFilename(importMetaUrl: string): string {
  return fileURLToPath(importMetaUrl);
}

/**
 * 获取项目根目录
 */
export function getProjectRoot(): string {
  // 在构建后，当前文件位于 dist/main/*.js
  // 需要回到项目根目录 desktop-client
  const currentDir = getCurrentDir();
  // 从 dist/main 向上 2 级到 desktop-client 根目录
  return join(currentDir, '../../');
}

/**
 * 获取主进程目录
 */
export function getMainDir(): string {
  const currentDir = getCurrentDir();
  // 从 utils 向上 1 级到 main 目录
  return join(currentDir, '../');
}

/**
 * 获取预加载脚本路径
 */
export function getPreloadPath(scriptName: string): string {
  // 预加载脚本位于 dist/main/preload/ 目录下
  const currentDir = getCurrentDir();
  return join(currentDir, 'preload', `${scriptName}.js`);
}

/**
 * 获取渲染进程 HTML 路径
 */
export function getRendererPath(htmlName: string): string {
  // Vite 构建后的 HTML 文件实际位于 dist/src/renderer/
  const currentDir = getCurrentDir();
  const distDir = join(currentDir, '../');
  return join(distDir, 'src', 'renderer', htmlName, 'index.html');
}

/**
 * 获取应用图标路径 (用于 dock、任务栏等系统级显示)
 */
export function getAppIconPath(): string {
  const isDevelopment = !app.isPackaged;

  if (process.platform === 'darwin') {
    // macOS Tray 图标必须使用 PNG 格式
    if (isDevelopment) {
      const projectRoot = getProjectRoot();
      return join(projectRoot, 'assets', 'logo-icon.png');
    } else {
      // 生产环境：从打包的 resources 目录获取
      return join(process.resourcesPath, 'resources', 'logo-icon.png');
    }
  }
  if (process.platform === 'win32') {
    // Windows 使用 ico，用于任务栏和标题栏
    if (isDevelopment) {
      const projectRoot = getProjectRoot();
      return join(projectRoot, 'assets', 'icon.ico');
    } else {
      return join(process.resourcesPath, 'icon.ico');
    }
  }

  throw new Error(`Unsupported platform: ${process.platform}`);
}

/**
 * 获取窗口图标路径 (用于窗口标题栏显示)
 */
export function getWindowIconPath(): string {
  const projectRoot = getProjectRoot();
  return join(projectRoot, 'src', 'assets', 'CueMate.png');
}

/**
 * 获取应用根目录（CueMate 项目根目录）
 * 开发环境: /Users/xxx/chain/CueMate
 * 生产环境: ~/Library/Application Support/cuemate-desktop-client
 */
export function getAppRoot(): string {
  if (!app.isPackaged) {
    // 开发环境：使用项目根目录
    const projectRoot = getProjectRoot();
    // 从 desktop-client 向上到 CueMate 根目录
    return join(projectRoot, '../../');
  } else {
    // 生产环境：使用 Electron userData 目录
    return app.getPath('userData');
  }
}

/**
 * 获取日志目录
 * 统一使用 cuemate-desktop-client 的日志目录，与容器服务共享
 */
export function getLogsDir(): string {
  if (process.platform === 'darwin') {
    // macOS: ~/Library/Application Support/cuemate-desktop-client/data/logs
    const homeDir = app.getPath('home');
    return join(homeDir, 'Library', 'Application Support', 'cuemate-desktop-client', 'data', 'logs');
  } else if (process.platform === 'win32') {
    // Windows: %APPDATA%/cuemate-desktop-client/data/logs
    const appData = app.getPath('appData');
    return join(appData, 'cuemate-desktop-client', 'data', 'logs');
  } else {
    // Linux: ~/.local/share/cuemate-desktop-client/data/logs
    const homeDir = app.getPath('home');
    return join(homeDir, '.local', 'share', 'cuemate-desktop-client', 'data', 'logs');
  }
}

/**
 * 获取数据目录
 */
export function getDataDir(): string {
  return join(getAppRoot(), 'data');
}
