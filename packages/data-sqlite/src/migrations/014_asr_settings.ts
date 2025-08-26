export const version = 14;
export const name = '014_asr_settings';

export function up(db: any): void {
  // 给用户表添加ASR提供商选择字段和ASR配置字段
  try {
    db.exec(`ALTER TABLE users ADD COLUMN selected_asr_provider_id TEXT DEFAULT 'deepgram';`);
  } catch {}

  db.exec(`
    -- ASR提供商表，存储各种ASR提供商的基本信息和默认配置
    CREATE TABLE IF NOT EXISTS asr_providers (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      provider_type TEXT NOT NULL CHECK(provider_type IN ('deepgram', 'openai_whisper', 'vosk')),
      description TEXT,
      default_config TEXT NOT NULL, -- 默认配置(JSON格式)
      required_fields TEXT NOT NULL, -- 用户必须配置的字段(JSON数组)，如["apiKey"]
      status BOOLEAN DEFAULT false, -- 是否可用
      is_enabled BOOLEAN DEFAULT true,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- 插入ASR提供商定义
    INSERT OR IGNORE INTO asr_providers (id, name, provider_type, description, default_config, required_fields, is_enabled, created_at, updated_at) VALUES
      ('deepgram', 'Deepgram', 'deepgram', 'Deepgram实时语音识别服务', 
        '{"model":"nova-2","language":"zh","punctuate":true,"profanity_filter":false,"redact":false,"diarize":false,"numerals":true,"endpointing":400,"interim_results":true,"utterance_end_ms":1000, "apiKey": ""}',
        '["apiKey"]',
        false, true, ${Date.now()}, ${Date.now()}),
      ('openai_whisper', 'OpenAI Whisper', 'openai_whisper', 'OpenAI Whisper语音识别服务',
        '{"model":"whisper-1","language":"zh","temperature":0,"response_format":"json", "apiKey": ""}',
        '["apiKey"]',
        false, true, ${Date.now()}, ${Date.now()}),
      ('vosk', 'Vosk', 'vosk', 'Vosk本地语音识别服务',
        '{"language":"zh","sample_rate":16000,"model_path":"./models/vosk"}',
        '["model_path"]',
        false, true, ${Date.now()}, ${Date.now()});

    -- 索引
    CREATE INDEX IF NOT EXISTS idx_asr_providers_type ON asr_providers(provider_type);
    CREATE INDEX IF NOT EXISTS idx_asr_providers_enabled ON asr_providers(is_enabled);
  `);
}
