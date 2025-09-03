import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * 获取当前模块目录，兼容 CommonJS 和 ESM
 */
function getCurrentDir(): string {
  // 在 CommonJS 中使用 __dirname
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }
  
  // 在 ESM 中使用 import.meta.url
  if (typeof import.meta !== 'undefined' && import.meta.url) {
    return dirname(fileURLToPath(import.meta.url));
  }
  
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
  return join(projectRoot, 'assets', 'logo-icon.png');
}

/**
 * 获取窗口图标路径 (用于窗口标题栏显示)
 */
export function getWindowIconPath(): string {
  const projectRoot = getProjectRoot();
  return join(projectRoot, 'src', 'assets', 'CueMate.png');
}