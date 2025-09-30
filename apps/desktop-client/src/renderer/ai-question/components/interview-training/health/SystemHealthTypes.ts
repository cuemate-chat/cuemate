/**
 * 系统健康检查类型定义
 * 简化版本，不包含具体的测试实现
 */

export interface SystemHealthReport {
  overall: 'healthy' | 'degraded' | 'critical';
  services: {
    asr: 'online' | 'offline' | 'error';
    llm: 'online' | 'offline' | 'error';
    rag: 'online' | 'offline' | 'error';
    audio: 'ready' | 'error' | 'permission_denied';
  };
  timestamp: number;
  details?: Record<string, any>;
}

export class SystemHealthCheck extends EventTarget {
  constructor() {
    super();
  }

  async runFullHealthCheck(): Promise<SystemHealthReport> {
    // 简化的健康检查实现
    const report: SystemHealthReport = {
      overall: 'healthy',
      services: {
        asr: 'online',
        llm: 'online',
        rag: 'online',
        audio: 'ready'
      },
      timestamp: Date.now()
    };

    // 分发事件
    const event = new CustomEvent('healthCheckCompleted', { detail: report });
    this.dispatchEvent(event);

    return report;
  }

  destroy() {
    // 清理资源
  }
}