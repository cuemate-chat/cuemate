/**
 * 获取包含 Docker 路径的环境变量对象
 *
 * 策略：
 * 1. 保留用户原有的 PATH 环境变量
 * 2. 将 Docker 常见安装路径追加到 PATH 中
 * 3. 确保能找到 docker 命令，无论安装在哪里
 */
export function getDockerEnv() {
  const currentPath = process.env.PATH || '';

  // Docker 常见安装路径
  const dockerPaths = [
    '/usr/local/bin',           // Docker Desktop 默认路径
    '/opt/homebrew/bin',        // Homebrew on Apple Silicon
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
  ];

  // 将 docker 路径追加到现有 PATH 中（去重）
  const pathParts = currentPath ? currentPath.split(':') : [];
  const allPaths = [...pathParts, ...dockerPaths];

  // 去重，保持顺序
  const uniquePaths = Array.from(new Set(allPaths));
  const finalPath = uniquePaths.join(':');

  return {
    ...process.env,
    PATH: finalPath,
  };
}
