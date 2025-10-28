/**
 * 获取包含 Docker 路径的环境变量对象
 *
 * 策略：
 * 1. 优先保留用户原有的 PATH 环境变量
 * 2. 如果没有 PATH，则设置常用的系统路径
 * 3. 确保包含 Docker 常见安装路径（/usr/local/bin, /opt/homebrew/bin）
 */
export function getDockerEnv() {
  const currentPath = process.env.PATH || '';

  // 常见的系统路径（作为后备）
  const standardPaths = [
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
    '/opt/homebrew/bin', // Homebrew on Apple Silicon
  ];

  // 如果已有 PATH，直接使用（Docker Desktop 会自动添加到系统 PATH）
  // 如果没有 PATH，使用标准路径
  const finalPath = currentPath || standardPaths.join(':');

  return {
    ...process.env,
    PATH: finalPath,
  };
}
