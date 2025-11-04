export const version = 14;
export const name = '014_create_asr_settings';

export function up(db: any): void {
  db.exec(`
    -- ASR 配置表（全局唯一配置）
    CREATE TABLE IF NOT EXISTS asr_config (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      name TEXT NOT NULL DEFAULT 'ASR-Gateway',
      language TEXT NOT NULL DEFAULT 'zh',
      model TEXT NOT NULL DEFAULT 'small',
      backend TEXT NOT NULL DEFAULT 'simulstreaming' CHECK(backend IN ('faster-whisper', 'whisper_timestamped', 'mlx-whisper', 'openai-api', 'simulstreaming')),
      task TEXT NOT NULL DEFAULT 'transcribe' CHECK(task IN ('transcribe', 'translate')),
      min_chunk_size REAL DEFAULT 1.0,
      no_vad BOOLEAN DEFAULT false,
      no_vac BOOLEAN DEFAULT false,
      vac_chunk_size REAL DEFAULT 1.0,
      confidence_validation BOOLEAN DEFAULT false,
      diarization BOOLEAN DEFAULT false,
      punctuation_split BOOLEAN DEFAULT true,
      diarization_backend TEXT DEFAULT 'sortformer' CHECK(diarization_backend IN ('sortformer', 'diart')),
      buffer_trimming TEXT DEFAULT 'segment' CHECK(buffer_trimming IN ('sentence', 'segment')),
      buffer_trimming_sec REAL DEFAULT 5.0,
      log_level TEXT DEFAULT 'INFO' CHECK(log_level IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')),
      frame_threshold INTEGER DEFAULT 25,
      beams INTEGER DEFAULT 1,
      decoder TEXT DEFAULT 'auto' CHECK(decoder IN ('beam', 'greedy', 'auto')),
      audio_max_len REAL DEFAULT 30.0,
      audio_min_len REAL DEFAULT 0.0,
      never_fire BOOLEAN DEFAULT false,
      init_prompt TEXT DEFAULT '',
      static_init_prompt TEXT DEFAULT '',
      max_context_tokens INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    -- 插入唯一的默认配置
    INSERT OR IGNORE INTO asr_config (
      id, name, language, model, backend, task, min_chunk_size, no_vad, no_vac, 
      vac_chunk_size, confidence_validation, diarization, punctuation_split, 
      diarization_backend, buffer_trimming, buffer_trimming_sec, log_level, 
      frame_threshold, beams, decoder, audio_max_len, audio_min_len, never_fire, 
      init_prompt, static_init_prompt, max_context_tokens
    ) VALUES (
      1, 'ASR-Gateway', 'zh', 'small', 'simulstreaming', 'transcribe', 1.0, false, false,
      1.0, false, false, true,
      'sortformer', 'segment', 5.0, 'INFO',
      25, 1, 'auto', 30.0, 0.5, false,
      '技术面试常用词汇：算法、数据结构、架构设计、性能优化、代码重构、系统设计、API 接口、数据库、缓存、消息队列、微服务、容器化、云计算、人工智能、机器学习、前端开发、后端开发、全栈开发。', '请准确识别并转录音频内容，保持语言的自然流畅性，注意专业术语的准确性。对于技术讨论，请特别关注代码逻辑、系统架构和性能分析等内容的准确转录。', 10000
    );
  `);
}
