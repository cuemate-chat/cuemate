export const version = 7;
export const name = '007_models';

/**
 * 模型与参数表
 * - models：一条记录代表一个可用模型（包含提供商、可见性、公私/本地、基础信息、认证信息）
 * - model_params：同一模型的可配置参数（如 temperature、max_tokens 等）
 */
export function up(db: any): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,                   -- 展示名称
      provider TEXT NOT NULL,               -- 供应商标识，如 openai/deepseek/azure/ollama 等
      type TEXT NOT NULL DEFAULT 'llm',     -- 模型类型：llm/asr/embedding/vision
      scope TEXT NOT NULL DEFAULT 'public', -- public / private
      model_name TEXT NOT NULL,             -- 具体模型与版本，如 deepseek-r1:1.5b / gpt-4o-mini 等
      icon TEXT,                            -- 图标（可选，SVG 文本或 URL）
      version TEXT,                         -- 版本号（可选）
      base_url TEXT,                        -- 兼容 OpenAI API 的 Base URL（部分厂商必填）
      api_url TEXT,                         -- 非 OpenAI 兼容时的专有地址（预留）
      api_key TEXT,                         -- 认证密钥（明文存储，生产建议加密/通过密钥管理）
      created_by TEXT,                      -- 创建者用户 ID
      is_enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS model_params (
      id TEXT PRIMARY KEY,
      model_id TEXT NOT NULL,
      label TEXT,                           -- 显示名称：温度、最大输出 Token 等
      param_key TEXT NOT NULL,              -- 参数键：temperature、max_tokens、top_p 等
      ui_type TEXT DEFAULT 'slider',        -- UI 类型：slider/input/switch/select
      value TEXT,                           -- 当前值（字符串，前端按类型解析）
      default_value TEXT,                   -- 默认值
      required INTEGER NOT NULL DEFAULT 0,
      extra JSON,                           -- 预留：最小最大值、步长、选项等
      created_at INTEGER NOT NULL,
      updated_at INTEGER,
      FOREIGN KEY(model_id) REFERENCES models(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_models_provider ON models(provider);
    CREATE INDEX IF NOT EXISTS idx_models_scope ON models(scope);
    CREATE INDEX IF NOT EXISTS idx_model_params_model ON model_params(model_id);
  `);
}
