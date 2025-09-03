import { createLogger } from '@cuemate/logger';
import path from 'path';

// 获取 Electron 应用的用户数据目录作为日志目录
const getLogDir = () => {
  // 开发环境使用项目根目录下的 data/logs
  if (process.env.NODE_ENV === 'development') {
    return path.join(process.cwd(), 'data', 'logs');
  }

  // 生产环境使用 /opt/cuemate/logs，与其他服务保持一致
  return '/opt/cuemate/logs';
};

export const logger = createLogger({
  service: 'desktop-client',
  baseDir: getLogDir(),
});
