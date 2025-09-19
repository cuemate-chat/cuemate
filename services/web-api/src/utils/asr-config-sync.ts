import type { FastifyInstance } from 'fastify';

export interface ASRConfigSyncResult {
  success: boolean;
  message: string;
  syncResults: Array<{
    service: string;
    success: boolean;
    result?: any;
    error?: string;
  }>;
}

/**
 * 独立的ASR配置同步方法
 * 从数据库读取配置并同步到所有ASR服务
 */
export async function syncASRConfig(app: FastifyInstance): Promise<ASRConfigSyncResult> {
  try {
    // 1. 从数据库获取当前配置
    const stmt = (app as any).db.prepare('SELECT * FROM asr_config WHERE id = 1');
    const rawConfig = stmt.get();

    if (!rawConfig) {
      return {
        success: false,
        message: '数据库中未找到ASR配置',
        syncResults: []
      };
    }

    // 2. 转换配置格式
    const config = {
      ...rawConfig,
      no_vad: Boolean(rawConfig.no_vad),
      no_vac: Boolean(rawConfig.no_vac),
      confidence_validation: Boolean(rawConfig.confidence_validation),
      diarization: Boolean(rawConfig.diarization),
      punctuation_split: Boolean(rawConfig.punctuation_split),
      never_fire: Boolean(rawConfig.never_fire),
    };

    // 3. 构建WhisperLiveKit配置
    const whisperConfig = {
      diarization: config.diarization,
      punctuation_split: config.punctuation_split,
      min_chunk_size: config.min_chunk_size,
      model: config.model,
      lan: config.language, // WhisperLiveKit 使用 lan 而不是 language
      task: config.task,
      backend: config.backend,
      vac: !config.no_vac, // 注意布尔值转换
      vac_chunk_size: config.vac_chunk_size,
      log_level: config.log_level,
      transcription: true, // 始终启用转录
      vad: !config.no_vad, // 注意布尔值转换
      buffer_trimming: config.buffer_trimming,
      confidence_validation: config.confidence_validation,
      buffer_trimming_sec: config.buffer_trimming_sec,
      frame_threshold: config.frame_threshold,
      beams: config.beams,
      decoder_type: config.decoder,
      audio_max_len: config.audio_max_len,
      audio_min_len: config.audio_min_len,
      never_fire: config.never_fire,
      init_prompt: config.init_prompt,
      static_init_prompt: config.static_init_prompt,
      max_context_tokens: config.max_context_tokens,
      diarization_backend: config.diarization_backend,
    };

    // 4. 同步配置到ASR服务
    const asrServiceUrls = [
      'http://cuemate-asr:10095',
    ];

    const syncResults = [];

    for (const serviceUrl of asrServiceUrls) {
      try {
        const response = await fetch(`${serviceUrl}/config`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(whisperConfig),
          signal: AbortSignal.timeout(5000), // 5秒超时
        });

        if (response.ok) {
          const result = await response.json();
          syncResults.push({
            service: serviceUrl,
            success: true,
            result: result,
          });
          app.log.info(`ASR配置同步到 ${serviceUrl} 成功`);
        } else {
          const error = await response.text();
          syncResults.push({
            service: serviceUrl,
            success: false,
            error: error,
          });
          app.log.warn(`ASR配置同步到 ${serviceUrl} 失败: ${error}`);
        }
      } catch (error: any) {
        syncResults.push({
          service: serviceUrl,
          success: false,
          error: error.message,
        });
        app.log.error(`连接ASR服务 ${serviceUrl} 失败: ${error.message}`);
      }
    }

    // 5. 返回同步结果
    const successCount = syncResults.filter((r) => r.success).length;
    const message = successCount > 0
      ? `配置同步完成，${successCount}/${asrServiceUrls.length} 个服务同步成功`
      : '配置同步失败，所有服务均无法连接';

    return {
      success: successCount > 0,
      message,
      syncResults,
    };

  } catch (error: any) {
    app.log.error('ASR配置同步过程中发生错误:', error);
    return {
      success: false,
      message: `配置同步失败: ${error.message}`,
      syncResults: [],
    };
  }
}

/**
 * 带重试机制的配置同步
 */
export async function syncASRConfigWithRetry(
  app: FastifyInstance,
  maxRetries: number = 3,
  retryDelay: number = 2000
): Promise<ASRConfigSyncResult> {
  let lastResult: ASRConfigSyncResult | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    app.log.info(`ASR配置同步尝试 ${attempt}/${maxRetries}`);

    lastResult = await syncASRConfig(app);

    if (lastResult.success) {
      app.log.info(`ASR配置同步成功 (第${attempt}次尝试)`);
      return lastResult;
    }

    if (attempt < maxRetries) {
      app.log.warn(`ASR配置同步失败，${retryDelay}ms后重试...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  app.log.error(`ASR配置同步最终失败，已重试${maxRetries}次`);
  return lastResult!;
}