export const version = 17;
export const name = '017_alter_asr_config';

export function up(db: any): void {
  db.exec(`
    -- 删除旧的WhisperLiveKit字段，添加FunASR/AudioTee/PiperTTS相关字段
    CREATE TABLE IF NOT EXISTS asr_config_new (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      name TEXT NOT NULL DEFAULT 'ASR-Gateway',

      -- FunASR WebSocket配置
      funasr_host TEXT NOT NULL DEFAULT 'localhost',
      funasr_port INTEGER NOT NULL DEFAULT 10095,
      funasr_chunk_interval INTEGER NOT NULL DEFAULT 5,
      funasr_chunk_size_start INTEGER NOT NULL DEFAULT 5,
      funasr_chunk_size_middle INTEGER NOT NULL DEFAULT 10,
      funasr_chunk_size_end INTEGER NOT NULL DEFAULT 5,
      funasr_mode TEXT NOT NULL DEFAULT 'online' CHECK(funasr_mode IN ('online', 'offline', '2pass')),
      funasr_sample_rate INTEGER NOT NULL DEFAULT 16000,

      -- AudioTee配置
      audiotee_sample_rate INTEGER NOT NULL DEFAULT 16000 CHECK(audiotee_sample_rate IN (8000, 16000, 22050, 24000, 32000, 44100, 48000)),
      audiotee_chunk_duration REAL NOT NULL DEFAULT 0.2,
      audiotee_include_processes TEXT DEFAULT '[]',
      audiotee_exclude_processes TEXT DEFAULT '[]',
      audiotee_mute_processes BOOLEAN DEFAULT false,

      -- PiperTTS配置
      piper_default_language TEXT NOT NULL DEFAULT 'zh-CN' CHECK(piper_default_language IN ('zh-CN', 'en-US')),
      piper_speech_speed REAL DEFAULT 1.0 CHECK(piper_speech_speed >= 0.5 AND piper_speech_speed <= 2.0),
      piper_python_path TEXT DEFAULT 'python3',

      -- 设备持久化配置
      microphone_device_id TEXT DEFAULT '',
      microphone_device_name TEXT DEFAULT '默认麦克风',
      speaker_device_id TEXT DEFAULT '',
      speaker_device_name TEXT DEFAULT '默认扬声器',

      -- 测试配置
      test_duration_seconds INTEGER DEFAULT 60,
      recognition_timeout_seconds INTEGER DEFAULT 15,
      min_recognition_length INTEGER DEFAULT 5,
      max_recognition_length INTEGER DEFAULT 30,

      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    -- 迁移数据（保留基本信息）
    INSERT INTO asr_config_new (id, name, created_at)
    SELECT id, name, created_at FROM asr_config WHERE id = 1
    UNION ALL
    SELECT 1, 'ASR-Gateway', strftime('%s', 'now') WHERE NOT EXISTS (SELECT 1 FROM asr_config WHERE id = 1);

    -- 替换旧表
    DROP TABLE asr_config;
    ALTER TABLE asr_config_new RENAME TO asr_config;

    -- 确保有默认配置
    INSERT OR IGNORE INTO asr_config (
      id, name, funasr_host, funasr_port, funasr_chunk_interval,
      funasr_chunk_size_start, funasr_chunk_size_middle, funasr_chunk_size_end,
      funasr_mode, funasr_sample_rate, audiotee_sample_rate, audiotee_chunk_duration,
      audiotee_include_processes, audiotee_exclude_processes, audiotee_mute_processes,
      piper_default_language, piper_speech_speed, piper_python_path,
      microphone_device_id, microphone_device_name, speaker_device_id, speaker_device_name,
      test_duration_seconds, recognition_timeout_seconds, min_recognition_length, max_recognition_length
    ) VALUES (
      1, 'ASR-Gateway', 'localhost', 10095, 5, 5, 10, 5, 'online', 16000,
      16000, 0.2, '[]', '[]', false, 'zh-CN', 1.0, 'python3',
      '', '默认麦克风', '', '默认扬声器', 60, 15, 5, 30
    );

    -- 为users表添加悬浮窗口相关字段
    ALTER TABLE users ADD COLUMN floating_window_visible INTEGER DEFAULT 1 CHECK(floating_window_visible IN (0, 1));
    ALTER TABLE users ADD COLUMN floating_window_height INTEGER DEFAULT 75 CHECK(floating_window_height IN (50, 75, 100));
  `);
}
