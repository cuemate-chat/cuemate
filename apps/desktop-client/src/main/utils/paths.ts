import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

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
 * ES模块兼容的__dirname和__filename
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
  // 从 dist/main 向上2级到 desktop-client 根目录
  return join(currentDir, '../../');
}

/**
 * 获取主进程目录
 */
export function getMainDir(): string {
  const currentDir = getCurrentDir();
  // 从 utils 向上1级到 main 目录
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
 * 获取渲染进程HTML路径
 */
export function getRendererPath(htmlName: string): string {
  // Vite 构建后的 HTML 文件实际位于 dist/src/renderer/
  const currentDir = getCurrentDir();
  const distDir = join(currentDir, '../');
  return join(distDir, 'src', 'renderer', htmlName, 'index.html');
}

/**
 * 获取应用图标路径 (用于dock、任务栏等系统级显示)
 */
export function getAppIconPath(): string {
  const projectRoot = getProjectRoot();
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (process.platform === 'darwin') {
    // 开发环境使用 PNG，生产环境使用 icns
    return isDevelopment
      ? join(projectRoot, 'assets', 'logo-icon.png')
      : join(projectRoot, 'assets', 'icon.icns');
  }
  if (process.platform === 'win32') {
    // Windows 使用 ico，用于任务栏和标题栏
    return join(projectRoot, 'assets', 'icon.ico');
  }
  // Linux/其他平台：使用 png（多尺寸由桌面环境处理）
  return join(projectRoot, 'assets', 'logo-icon.png');
}

/**
 * 获取窗口图标路径 (用于窗口标题栏显示)
 */
export function getWindowIconPath(): string {
  const projectRoot = getProjectRoot();
  return join(projectRoot, 'src', 'assets', 'CueMate.png');
}
