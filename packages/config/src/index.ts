/**
 * CueMate 统一配置
 * 所有共享的配置项应在此文件中定义
 */

/**
 * COS 存储服务基础 URL
 * 用于存储和获取版本更新文件、预置题库等资源
 */
export const COS_BASE_URL = 'https://cos.cuemate.chat';

/**
 * COS 版本文件目录路径
 */
export const COS_VERSION_PATH = 'cuemate-version';

/**
 * 完整的 COS 版本 URL
 */
export const COS_VERSION_URL = `${COS_BASE_URL}/${COS_VERSION_PATH}`;

/**
 * Docker 容器内的路径配置
 * 这些路径在 docker-compose.yml 中通过 volume 挂载
 * 注意：这些是容器内的路径，不是宿主机路径
 */

/**
 * 容器内基础目录
 */
export const CONTAINER_BASE_DIR = '/opt/cuemate';

/**
 * 容器内 PDF 文件存储目录
 * 用于存储用户上传的简历、岗位描述等 PDF 文件
 */
export const CONTAINER_PDF_DIR = `${CONTAINER_BASE_DIR}/pdf`;

/**
 * 容器内图片文件存储目录
 * 用于存储用户上传的图片文件
 */
export const CONTAINER_IMAGES_DIR = `${CONTAINER_BASE_DIR}/images`;

/**
 * 容器内数据库存储目录
 */
export const CONTAINER_DATA_DIR = `${CONTAINER_BASE_DIR}/data`;

/**
 * 容器内 SQLite 数据库目录
 */
export const CONTAINER_SQLITE_DIR = `${CONTAINER_DATA_DIR}/sqlite`;

/**
 * 容器内 SQLite 数据库文件完整路径
 */
export const CONTAINER_SQLITE_PATH = `${CONTAINER_SQLITE_DIR}/cuemate.db`;

/**
 * 容器内日志目录
 */
export const CONTAINER_LOGS_DIR = `${CONTAINER_BASE_DIR}/logs`;

/**
 * 容器内模型存储目录
 */
export const CONTAINER_MODELS_DIR = `${CONTAINER_BASE_DIR}/models`;

/**
 * 容器内 FastEmbed 模型缓存目录
 */
export const CONTAINER_FASTEMBED_DIR = `${CONTAINER_MODELS_DIR}/fastembed`;

// ============================================================
// 数据转换工具函数
// 用于在 snake_case (数据库/后端) 和 camelCase (前端) 之间转换
// ============================================================

/**
 * 将 snake_case 字符串转换为 camelCase
 * @example snakeToCamel('user_id') // 'userId'
 * @example snakeToCamel('created_at') // 'createdAt'
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * 将 camelCase 字符串转换为 snake_case
 * @example camelToSnake('userId') // 'user_id'
 * @example camelToSnake('createdAt') // 'created_at'
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * 递归将对象的所有 key 从 snake_case 转换为 camelCase
 * 用于将数据库返回的数据转换为前端期望的格式
 */
export function toCamelCase<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => toCamelCase(item)) as T;
  }

  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = snakeToCamel(key);
      result[camelKey] = toCamelCase(value);
    }
    return result as T;
  }

  return obj;
}

/**
 * 递归将对象的所有 key 从 camelCase 转换为 snake_case
 * 用于将前端传入的数据转换为数据库期望的格式
 */
export function toSnakeCase<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => toSnakeCase(item)) as T;
  }

  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = camelToSnake(key);
      result[snakeKey] = toSnakeCase(value);
    }
    return result as T;
  }

  return obj;
}
