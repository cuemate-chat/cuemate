import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
  const currentDir = getDirname(import.meta.url);
  // 从 dist/main 向上2级到 desktop-client 根目录
  return join(currentDir, '../../');
}

/**
 * 获取主进程目录
 */
export function getMainDir(): string {
  const currentDir = getDirname(import.meta.url);
  // 从 utils 向上1级到 main 目录
  return join(currentDir, '../');
}

/**
 * 获取预加载脚本路径
 */
export function getPreloadPath(scriptName: string): string {
  const mainDir = getMainDir();
  return join(mainDir, 'preload', `${scriptName}.js`);
}

/**
 * 获取渲染进程HTML路径
 */
export function getRendererPath(htmlName: string): string {
  // 在生产模式下，从 dist/main 目录向上2级到项目根目录，然后到src/renderer
  const projectRoot = getProjectRoot();
  return join(projectRoot, 'src', 'renderer', htmlName, 'index.html');
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