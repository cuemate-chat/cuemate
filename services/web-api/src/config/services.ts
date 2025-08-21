/**
 * 外部服务配置
 * 统一管理所有微服务的URL配置，避免硬编码
 */

export const SERVICE_CONFIG = {
  // LLM Router 服务
  LLM_ROUTER: {
    URL: process.env.LLM_ROUTER_URL || 'http://llm-router:3002',
    ENDPOINTS: {
      PROBE: '/providers/probe',
    },
  },

  // RAG Service 服务
  RAG_SERVICE: {
    URL: process.env.RAG_SERVICE_URL || 'http://rag-service:3003',
    ENDPOINTS: {
      HEALTH: '/health',
      JOBS_PROCESS: '/jobs/process',
      JOBS_DELETE: '/jobs',
      QUESTIONS_PROCESS: '/questions/process',
      QUESTIONS_DELETE: '/questions',
      DELETE_BY_FILTER: '/delete/by-filter',
      CLEAN_ALL: '/clean-all',
      SEARCH_QUESTIONS: '/search/questions',
    },
  },
} as const;

/**
 * 获取完整的服务URL
 */
export function getServiceUrl(service: keyof typeof SERVICE_CONFIG, endpoint?: string): string {
  const serviceConfig = SERVICE_CONFIG[service];
  if (endpoint) {
    return `${serviceConfig.URL}${endpoint}`;
  }
  return serviceConfig.URL;
}

/**
 * 获取LLM Router的完整URL
 */
export function getLlmRouterUrl(endpoint?: string): string {
  return getServiceUrl('LLM_ROUTER', endpoint);
}

/**
 * 获取RAG Service的完整URL
 */
export function getRagServiceUrl(endpoint?: string): string {
  return getServiceUrl('RAG_SERVICE', endpoint);
}
