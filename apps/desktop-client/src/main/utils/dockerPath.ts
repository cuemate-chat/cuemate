/**
 * 获取包含 Docker 路径的环境变量对象
 *
 * 策略：
 * 1. 保留用户原有的 PATH 环境变量
 * 2. 将 Docker 常见安装路径追加到 PATH 中
 * 3. 确保能找到 docker 命令，无论安装在哪里
 *
 * process.platform 可能的值：
 * - 'darwin': macOS
 * - 'win32': Windows（包括 64 位，历史命名）
 * - 'linux': Linux
 */
export function getDockerEnv(): NodeJS.ProcessEnv {
  const currentPath = process.env.PATH || '';
  const platform = process.platform;
  const pathSeparator = platform === 'win32' ? ';' : ':';

  // Docker 常见安装路径（根据操作系统）
  let dockerPaths: string[];

  switch (platform) {
    case 'darwin':
      // macOS
      dockerPaths = [
        '/usr/local/bin',           // Docker Desktop 默认路径
        '/opt/homebrew/bin',        // Homebrew on Apple Silicon
        '/usr/bin',
        '/bin',
        '/usr/sbin',
        '/sbin',
      ];
      break;
    case 'win32':
      // Windows（包括 64 位）
      dockerPaths = [
        'C:\\Program Files\\Docker\\Docker\\resources\\bin',
        'C:\\ProgramData\\DockerDesktop\\version-bin',
      ];
      break;
    case 'linux':
      // Linux
      dockerPaths = [
        '/usr/local/bin',
        '/usr/bin',
        '/bin',
        '/usr/sbin',
        '/sbin',
      ];
      break;
    default:
      dockerPaths = [];
  }

  // 将 docker 路径追加到现有 PATH 中（去重）
  const pathParts = currentPath ? currentPath.split(pathSeparator) : [];
  const allPaths = [...pathParts, ...dockerPaths];

  // 去重，保持顺序
  const uniquePaths = Array.from(new Set(allPaths));
  const finalPath = uniquePaths.join(pathSeparator);

  return {
    ...process.env,
    PATH: finalPath,
  };
}
