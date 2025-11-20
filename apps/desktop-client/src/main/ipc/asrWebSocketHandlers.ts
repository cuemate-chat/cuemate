import { ipcMain } from 'electron';
import { asrWebSocketService } from '../services/ASRWebSocketService.js';
import { logger } from '../../utils/logger.js';

/**
 * 注册 ASR WebSocket IPC 处理器
 * 允许渲染进程通过 IPC 使用主进程中的 WebSocket 服务
 */
export function registerASRWebSocketHandlers(): void {
  // 创建 WebSocket 连接
  // 关键修复：在连接时就设置消息转发，避免消息丢失
  ipcMain.handle('asr-websocket:connect', async (event, sessionId: string, url: string) => {
    try {
      // 在连接时立即设置消息回调，将消息转发到渲染进程
      await asrWebSocketService.connect(sessionId, url, (message: string) => {
        event.sender.send(`asr-websocket:message:${sessionId}`, message);
      });
      return { success: true };
    } catch (error) {
      logger.error({ sessionId, error }, '[IPC] ASR WebSocket 连接失败');
      return { success: false, error: String(error) };
    }
  });

  // 发送配置
  ipcMain.handle('asr-websocket:send-config', (_event, sessionId: string, config: any) => {
    try {
      asrWebSocketService.sendConfig(sessionId, config);
      return { success: true };
    } catch (error) {
      logger.error({ sessionId, error }, '[IPC] 发送配置失败');
      return { success: false, error: String(error) };
    }
  });

  // 发送音频数据
  ipcMain.handle('asr-websocket:send-audio', (_event, sessionId: string, audioData: ArrayBuffer) => {
    try {
      logger.info({
        sessionId,
        byteLength: audioData?.byteLength,
        type: typeof audioData,
        isArrayBuffer: audioData instanceof ArrayBuffer,
        constructorName: audioData?.constructor?.name
      }, '[IPC] 收到音频数据发送请求');

      // 验证参数
      if (!sessionId) {
        logger.error({ sessionId, audioData }, '[IPC] sessionId 为空');
        return { success: false, error: 'sessionId 为空' };
      }

      if (!audioData) {
        logger.error({ sessionId }, '[IPC] audioData 为空或 undefined');
        return { success: false, error: 'audioData 为空' };
      }

      if (!(audioData instanceof ArrayBuffer)) {
        logger.error({
          sessionId,
          actualType: Object.prototype.toString.call(audioData),
          constructorName: (audioData as any)?.constructor?.name
        }, '[IPC] audioData 不是 ArrayBuffer 类型');
        return { success: false, error: `audioData 类型错误: ${Object.prototype.toString.call(audioData)}` };
      }

      if (audioData.byteLength === 0) {
        logger.error({ sessionId }, '[IPC] audioData 长度为 0');
        return { success: false, error: 'audioData 长度为 0' };
      }

      logger.debug({ sessionId, byteLength: audioData.byteLength }, '[IPC] 准备调用 asrWebSocketService.sendAudioData');
      asrWebSocketService.sendAudioData(sessionId, audioData);
      logger.debug({ sessionId }, '[IPC] asrWebSocketService.sendAudioData 调用完成');

      return { success: true };
    } catch (error) {
      logger.error({
        sessionId,
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        audioDataInfo: {
          byteLength: (audioData as any)?.byteLength,
          type: typeof audioData,
          constructorName: (audioData as any)?.constructor?.name
        }
      }, '[IPC] 发送音频数据失败');
      return { success: false, error: String(error) };
    }
  });

  // 监听消息 - 已废弃，消息监听在 connect 时设置
  // 保留此处理器仅为了兼容渲染进程的调用，直接返回成功
  ipcMain.handle('asr-websocket:on-message', (_event, sessionId: string) => {
    logger.debug({ sessionId }, '[IPC] asr-websocket:on-message 被调用（消息监听已在 connect 时设置）');
    return { success: true };
  });

  // 关闭连接
  ipcMain.handle('asr-websocket:close', (_event, sessionId: string) => {
    try {
      asrWebSocketService.close(sessionId);
      return { success: true };
    } catch (error) {
      logger.error({ sessionId, error }, '[IPC] 关闭连接失败');
      return { success: false, error: String(error) };
    }
  });

  // 获取连接状态
  ipcMain.handle('asr-websocket:get-ready-state', (_event, sessionId: string) => {
    try {
      const readyState = asrWebSocketService.getReadyState(sessionId);
      return { success: true, readyState };
    } catch (error) {
      logger.error({ sessionId, error }, '[IPC] 获取连接状态失败');
      return { success: false, error: String(error) };
    }
  });

  // 检查 ASR 服务状态
  ipcMain.handle('asr-websocket:check-service', async (_event) => {
    try {
      const { execSync } = require('child_process');

      // 检查 Docker 容器是否运行
      try {
        const dockerStatus = execSync('docker ps --filter "name=cuemate-asr" --format "{{.Status}}"', {
          encoding: 'utf-8',
          timeout: 5000
        }).trim();

        if (!dockerStatus) {
          return {
            ready: false,
            status: 'container_not_running',
            message: 'ASR 服务容器未运行，请检查 Docker 服务'
          };
        }

        // 检查容器启动时间
        const uptime = dockerStatus.toLowerCase();
        if (uptime.includes('second') || uptime.includes('秒')) {
          const match = uptime.match(/up\s+(\d+)\s+(second|秒)/i);
          const seconds = match ? parseInt(match[1]) : 0;
          if (seconds < 20) {
            return {
              ready: false,
              status: 'initializing',
              message: 'ASR 服务正在加载模型（VAD、Paraformer、标点模型等），请稍候...',
              remainingSeconds: Math.max(0, 20 - seconds)
            };
          }
        }

        // 尝试连接测试
        try {
          await fetch('http://localhost:10095', {
            method: 'GET',
            signal: AbortSignal.timeout(2000)
          });

          return {
            ready: true,
            status: 'ready',
            message: 'ASR 服务已就绪'
          };
        } catch (fetchError) {
          // 如果容器运行超过20秒但无法连接，可能是其他问题
          return {
            ready: false,
            status: 'connection_failed',
            message: 'ASR 服务连接失败，请检查端口 10095 是否可用'
          };
        }
      } catch (dockerError) {
        logger.error({ error: dockerError }, '[IPC] Docker 状态检查失败');
        return {
          ready: false,
          status: 'docker_error',
          message: 'Docker 服务检查失败，请确保 Docker 正在运行'
        };
      }
    } catch (error) {
      logger.error({ error }, '[IPC] ASR 服务状态检查失败');
      return {
        ready: false,
        status: 'unknown_error',
        message: `服务状态检查失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  });

  logger.info('[IPC] ASR WebSocket 处理器已注册');
}
