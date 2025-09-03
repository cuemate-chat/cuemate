/**
 * 应用常量定义
 */

// API 相关常量
export const API_ENDPOINTS = {
  AUTH: {
    SIGNIN: '/auth/signin',
    ME: '/auth/me',
    UPDATE_SETTINGS: '/auth/update-setting',
    CHANGE_PASSWORD: '/auth/change-password',
  },
  JOBS: {
    LIST: '/jobs',
    CREATE: '/jobs',
    UPDATE: (id: string) => `/jobs/${id}`,
    DELETE: (id: string) => `/jobs/${id}`,
    DETAIL: (id: string) => `/jobs/${id}`,
  },
  QUESTIONS: {
    LIST: '/questions',
    CREATE: '/questions',
    UPDATE: (id: string) => `/questions/${id}`,
    DELETE: (id: string) => `/questions/${id}`,
  },
  REVIEWS: {
    LIST: '/reviews',
    DETAIL: (id: string) => `/reviews/${id}`,
  },
  MODELS: {
    LIST: '/models',
    UPDATE: '/models',
  },
  LOGS: {
    LIST: '/logs',
  },
  VECTORS: {
    LIST: '/vectors',
    UPLOAD: '/vectors/upload',
    DELETE: (id: string) => `/vectors/${id}`,
  },
} as const;

// 路由路径常量
export const ROUTES = {
  LOGIN: '/login',
  HOME: '/home',
  JOBS: {
    LIST: '/jobs',
    NEW: '/jobs/new',
  },
  QUESTIONS: '/questions',
  REVIEWS: {
    LIST: '/reviews',
    DETAIL: (id: string) => `/reviews/${id}`,
  },
  HELP: '/help',
  SETTINGS: {
    BASE: '/settings',
    MODELS: '/settings/models',
    LOGS: '/settings/logs',
    VECTOR_KNOWLEDGE: '/settings/vector-knowledge',
  },
  LEGAL: {
    USER_AGREEMENT: '/legal/user-agreement',
    PRIVACY: '/legal/privacy',
  },
} as const;

// 本地存储键名
export const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'auth_user',
  REMEMBER_ACCOUNT: 'remember_account',
  REMEMBER_PASSWORD: 'remember_password',
  REMEMBER_ENABLED: 'remember_enabled',
  THEME: 'app_theme',
  LANGUAGE: 'app_language',
} as const;

// 主题配置
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

// 语言配置
export const LANGUAGES = {
  ZH_CN: 'zh-CN',
  EN_US: 'en-US',
} as const;

// 分页配置
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

// 表单验证规则
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 128,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 32,
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/,
} as const;

// 文件上传配置
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: {
    DOCUMENT: ['.pdf', '.doc', '.docx', '.txt', '.md'],
    IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  },
} as const;

// 消息类型
export const MESSAGE_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
} as const;

// 状态类型
export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  PROCESSING: 'processing',
  FAILED: 'failed',
} as const;

// 问题类型
export const QUESTION_TYPES = {
  BEHAVIORAL: 'behavioral',
  TECHNICAL: 'technical',
  SITUATIONAL: 'situational',
} as const;

// 难度级别
export const DIFFICULTY_LEVELS = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
} as const;

// 日志级别
export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;
