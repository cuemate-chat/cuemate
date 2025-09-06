/**
 * 应用配置
 */

// 环境变量接口定义（用于类型检查）
declare global {
  interface ImportMetaEnv {
    readonly VITE_WEB_API_BASE?: string;
    readonly VITE_APP_TITLE?: string;
    readonly VITE_APP_VERSION?: string;
    readonly VITE_ENABLE_MOCK?: string;
    readonly VITE_RAG_SERVICE_URL?: string;
    readonly VITE_LLM_ROUTER_URL?: string;
    readonly VITE_ASR_USER_WS_URL?: string;
    readonly VITE_ASR_INTERVIEWER_WS_URL?: string;
  }
}

// 应用配置
export const config = {
  // API 基础地址
  API_BASE: import.meta.env.VITE_WEB_API_BASE || 'http://localhost:3001',

  // RAG 服务地址
  RAG_SERVICE_URL: import.meta.env.VITE_RAG_SERVICE_URL || 'http://localhost:3003',

  // LLM Router 服务地址
  LLM_ROUTER_URL: import.meta.env.VITE_LLM_ROUTER_URL || 'http://localhost:3002',

  // ASR WebSocket 服务地址
  ASR_USER_WS_URL: import.meta.env.VITE_ASR_USER_WS_URL || 'ws://localhost:8001/asr',
  ASR_INTERVIEWER_WS_URL: import.meta.env.VITE_ASR_INTERVIEWER_WS_URL || 'ws://localhost:8002/asr',

  // 应用信息
  APP_TITLE: import.meta.env.VITE_APP_TITLE || 'CueMate',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '0.1.0',

  // 功能开关
  ENABLE_MOCK: import.meta.env.VITE_ENABLE_MOCK === 'true',

  // 开发环境判断
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;

// 导出兼容性别名
export const WEB_API_BASE = config.API_BASE;
