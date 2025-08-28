import { config } from '../config';

/**
 * ASR 服务配置工具
 */

export interface AsrService {
  name: string;
  url: string;
  displayName: string;
  description: string;
}

/**
 * 获取标准化的ASR服务列表
 */
export function getAsrServices(): AsrService[] {
  return [
    {
      name: 'asr-user',
      url: config.ASR_USER_WS_URL,
      displayName: '面试者语音识别',
      description: '麦克风输入'
    },
    {
      name: 'asr-interviewer', 
      url: config.ASR_INTERVIEWER_WS_URL,
      displayName: '面试官语音识别',
      description: '系统音频输出'
    }
  ];
}

/**
 * 规范化WebSocket URL
 * @param serviceUrl 原始服务URL
 * @param serviceName 服务名称
 */
export function normalizeWebSocketUrl(serviceUrl: string, serviceName: string): string {
  try {
    // 如果是浏览器环境且访问localhost，使用配置中的默认地址
    if (typeof window !== 'undefined') {
      const isLocalhost = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
      
      if (isLocalhost) {
        return serviceName === 'asr-interviewer' 
          ? config.ASR_INTERVIEWER_WS_URL 
          : config.ASR_USER_WS_URL;
      }
    }

    // 检查URL是否包含容器名或错误端口
    const url = new URL(serviceUrl);
    if (url.hostname.startsWith('cuemate-asr-') || url.port === '8000') {
      const port = serviceName === 'asr-interviewer' ? '8002' : '8001';
      const hostname = typeof window !== 'undefined' 
        ? window.location.hostname 
        : url.hostname;
      return `${url.protocol}//${hostname}:${port}${url.pathname}`;
    }
    
    return serviceUrl;
  } catch {
    // 解析失败时使用默认值
    return serviceName === 'asr-interviewer'
      ? config.ASR_INTERVIEWER_WS_URL
      : config.ASR_USER_WS_URL;
  }
}

/**
 * 检查WebSocket服务是否可用
 */
export function checkWebSocketHealth(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(url);
      const timeout = setTimeout(() => {
        ws.close();
        resolve(false);
      }, 3000);

      ws.onopen = () => {
        clearTimeout(timeout);
        ws.close();
        resolve(true);
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };
    } catch {
      resolve(false);
    }
  });
}