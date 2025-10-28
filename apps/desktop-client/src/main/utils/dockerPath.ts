import { execSync } from 'child_process';

/**
 * 获取 Docker 可执行文件的完整路径
 */
export function getDockerPath(): string {
  const possiblePaths = [
    '/usr/local/bin/docker',
    '/usr/bin/docker',
    '/opt/homebrew/bin/docker',
  ];

  for (const dockerPath of possiblePaths) {
    try {
      execSync(`test -x ${dockerPath}`, { stdio: 'ignore' });
      return dockerPath;
    } catch {
      continue;
    }
  }

  try {
    const result = execSync('which docker', {
      encoding: 'utf-8',
      env: {
        ...process.env,
        PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin'
      }
    });
    return result.trim();
  } catch {
    return '/usr/local/bin/docker';
  }
}

/**
 * 获取包含 Docker 路径的环境变量对象
 */
export function getDockerEnv() {
  return {
    ...process.env,
    PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin'
  };
}
