import type { FastifyInstance, FastifyRequest } from 'fastify';
import { MenuType, ResourceType, type OperationLogData } from './operation-logger.js';

/**
 * 获取当前用户信息（用于操作记录）
 */
export async function getCurrentUserInfo(
  req: FastifyRequest,
): Promise<{ userId?: string; userName?: string }> {
  try {
    const payload = await (req as any).jwtVerify();
    const db = (req.server as any).db;
    const userRow = db.prepare('SELECT name FROM users WHERE id=?').get(payload.uid);
    return {
      userId: payload.uid,
      userName: userRow?.name,
    };
  } catch {
    return {
      userId: 'admin',
      userName: '管理员',
    };
  }
}

/**
 * 记录操作日志的辅助函数
 */
export async function logOperation(
  app: FastifyInstance,
  req: FastifyRequest,
  data: Omit<OperationLogData, 'userId' | 'userName'> & {
    userId?: string;
    userName?: string;
    autoGetUser?: boolean;
  },
): Promise<void> {
  try {
    let { userId, userName, autoGetUser = true, ...logData } = data;

    // 如果没有提供用户信息且需要自动获取，则尝试获取
    if (autoGetUser && (!userId || !userName)) {
      const userInfo = await getCurrentUserInfo(req);
      userId = userId || userInfo.userId;
      userName = userName || userInfo.userName;
    }

    await app.operationLogger.log(req, {
      ...logData,
      userId,
      userName,
    });
  } catch (logError) {
    app.log.warn({ err: logError }, '记录操作日志失败');
  }
}

/**
 * 常用的操作类型和菜单类型映射
 */
export const OPERATION_MAPPING = {
  // 认证相关
  AUTH: {
    menu: MenuType.ACCOUNT_SETTINGS,
    type: ResourceType.USER,
  },
  // 模型管理
  MODEL: {
    menu: MenuType.MODEL_SETTINGS,
    type: ResourceType.MODEL,
  },
  // 面试任务
  JOB: {
    menu: MenuType.JOB_LIST,
    type: ResourceType.JOB,
  },
  // 题库管理
  QUESTION: {
    menu: MenuType.PRESET_QUESTION_BANK,
    type: ResourceType.QUESTION,
  },
  // 预设问题
  PRESET_QUESTION: {
    menu: MenuType.PRESET_QUESTION_BANK,
    type: ResourceType.PRESET_QUESTION,
  },
  // 面试评价
  REVIEW: {
    menu: MenuType.INTERVIEW_REVIEW,
    type: ResourceType.REVIEW,
  },
  // ASR设置
  ASR: {
    menu: MenuType.VOICE_SETTINGS,
    type: ResourceType.ASR_CONFIG,
  },
  // 向量知识库
  VECTOR: {
    menu: MenuType.VECTOR_KNOWLEDGE_BASE,
    type: ResourceType.VECTOR,
  },
  // 许可证管理
  LICENSE: {
    menu: MenuType.LICENSE_MANAGEMENT,
    type: ResourceType.LICENSE,
  },
  // 广告管理
  ADS: {
    menu: MenuType.ADS_MANAGEMENT,
    type: ResourceType.ADS,
  },
  // 系统设置
  SYSTEM: {
    menu: MenuType.ACCOUNT_SETTINGS,
    type: ResourceType.SYSTEM,
  },
  // AI对话
  AI_CONVERSATION: {
    menu: '智能AI',
    type: 'ai_conversation',
  },
} as const;
