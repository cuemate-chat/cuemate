import type { FastifyRequest } from 'fastify';

export interface OperationLogData {
  menu: string; // 操作菜单：用户管理/模型管理/ASR设置等
  type: string; // 资源类型：user/model/asr_config/job等
  resourceId?: string; // 资源ID
  resourceName?: string; // 资源名称
  operation:
    | 'login'
    | 'create'
    | 'update'
    | 'delete'
    | 'view'
    | 'export'
    | 'import'
    | 'backup'
    | 'restore';
  message?: string; // 操作信息
  status?: 'success' | 'failed'; // 操作状态
  errorMessage?: string; // 错误信息
  userId?: string; // 操作用户ID
  userName?: string; // 操作用户名
}

export class OperationLogger {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  /**
   * 记录操作日志
   */
  async log(req: FastifyRequest, data: OperationLogData) {
    try {
      // 获取请求信息
      const sourceIp = this.getClientIp(req);
      const userAgent = req.headers['user-agent'] || '';
      const requestMethod = req.method;
      const requestUrl = req.url;
      const timestamp = Math.floor(Date.now() / 1000);

      // 准备插入数据
      const insertData = {
        menu: data.menu,
        type: data.type,
        resource_id: data.resourceId || null,
        resource_name: data.resourceName || null,
        operation: data.operation,
        time: timestamp,
        message: data.message || null,
        source_ip: sourceIp,
        user_id: data.userId || null,
        user_name: data.userName || null,
        request_method: requestMethod,
        request_url: requestUrl,
        user_agent: userAgent,
        status: data.status || 'success',
        error_message: data.errorMessage || null,
        created_at: timestamp,
        updated_at: timestamp,
      };

      // 插入数据库
      const stmt = this.db.prepare(`
        INSERT INTO operation_logs (
          menu, type, resource_id, resource_name, operation, time,
          message, source_ip, user_id, user_name, request_method,
          request_url, user_agent, status, error_message, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `);

      const result = stmt.run(
        insertData.menu,
        insertData.type,
        insertData.resource_id,
        insertData.resource_name,
        insertData.operation,
        insertData.time,
        insertData.message,
        insertData.source_ip,
        insertData.user_id,
        insertData.user_name,
        insertData.request_method,
        insertData.request_url,
        insertData.user_agent,
        insertData.status,
        insertData.error_message,
        insertData.created_at,
        insertData.updated_at,
      );

      req.log.info(
        {
          operationLogId: result.lastInsertRowid,
          menu: data.menu,
          operation: data.operation,
          type: data.type,
          resourceId: data.resourceId,
          userId: data.userId,
          sourceIp,
        },
        '操作记录已保存',
      );

      return result.lastInsertRowid;
    } catch (error) {
      req.log.error({ error, data }, '保存操作记录失败');
      // 不抛出错误，避免影响主业务流程
      return null;
    }
  }

  /**
   * 批量记录操作日志
   */
  async logBatch(req: FastifyRequest, logs: OperationLogData[]) {
    const results = [];
    for (const logData of logs) {
      const result = await this.log(req, logData);
      results.push(result);
    }
    return results;
  }

  /**
   * 获取客户端真实IP
   */
  private getClientIp(req: FastifyRequest): string {
    // 尝试从各种请求头中获取真实IP
    const forwarded = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];
    const clientIp = req.headers['x-client-ip'];

    if (typeof forwarded === 'string') {
      // X-Forwarded-For 可能包含多个IP，取第一个
      return forwarded.split(',')[0].trim();
    }

    if (typeof realIp === 'string') {
      return realIp;
    }

    if (typeof clientIp === 'string') {
      return clientIp;
    }

    // 默认使用连接IP
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }
}

/**
 * 操作类型枚举
 */
export const OperationType = {
  LOGIN: 'login' as const,
  CREATE: 'create' as const,
  UPDATE: 'update' as const,
  DELETE: 'delete' as const,
  VIEW: 'view' as const,
  EXPORT: 'export' as const,
  IMPORT: 'import' as const,
  BACKUP: 'backup' as const,
  RESTORE: 'restore' as const,
};

/**
 * 菜单类型枚举
 */
export const MenuType = {
  HOME: '主页',
  CREATE_JOB: '新建岗位',
  JOB_LIST: '岗位列表',
  INTERVIEW_PREDICTION: '面试押题',
  INTERVIEW_REVIEW: '面试复盘',
  HELP_CENTER: '帮助中心',
  ACCOUNT_SETTINGS: '账户设置',
  MODEL_SETTINGS: '模型设置',
  VOICE_SETTINGS: '语音设置',
  LOG_MANAGEMENT: '日志管理',
  OPERATION_LOGS: '操作记录',
  PRESET_QUESTION_BANK: '预置题库',
  VECTOR_KNOWLEDGE_BASE: '向量知识库',
  PIXEL_ADS: '像素广告',
  ADS_MANAGEMENT: '广告管理',
  LICENSE_MANAGEMENT: 'License 管理',
} as const;

/**
 * 资源类型枚举
 */
export const ResourceType = {
  USER: 'user',
  MODEL: 'model',
  ASR_CONFIG: 'asr_config',
  JOB: 'job',
  QUESTION: 'question',
  PRESET_QUESTION: 'preset_question',
  REVIEW: 'review',
  LOG: 'log',
  LICENSE: 'license',
  VECTOR: 'vector',
  ADS: 'ads',
  SYSTEM: 'system',
} as const;
