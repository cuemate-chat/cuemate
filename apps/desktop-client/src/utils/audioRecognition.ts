import { logger } from './rendererLogger.js';

export interface MicrophoneRecognitionOptions {
  deviceId?: string;
  url?: string;
  sampleRate?: number;
  sessionId?: string; // 用于区分不同的识别会话
  initialText?: string; // 初始文本，新识别的内容会叠加到这个文本后面
  onText?: (text: string, isFinal?: boolean) => void;
  onError?: (errorMessage: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
  echoCancellation?: boolean; // 启用回声消除，默认为 true
  noiseSuppression?: boolean; // 启用噪音抑制，默认为 true
}

export interface MicrophoneRecognitionController {
  stop: () => Promise<void>;
}

export interface SpeakerRecognitionOptions {
  deviceId?: string;
  url?: string;
  sampleRate?: number;
  sessionId?: string; // 用于区分不同的识别会话
  onText?: (text: string, isFinal?: boolean) => void;
  onError?: (errorMessage: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface SpeakerRecognitionController {
  stop: () => Promise<void>;
}

// 通用的麦克风语音识别启动函数，适用于所有使用场景
export async function startMicrophoneRecognition(
  options: MicrophoneRecognitionOptions,
): Promise<MicrophoneRecognitionController> {
  const {
    deviceId,
    url = 'ws://localhost:10095',
    sampleRate = 16000,
    sessionId = 'microphone',
    initialText = '',
    onText,
    onError,
    onOpen,
    onClose,
    echoCancellation = true,
    noiseSuppression = true,
  } = options;

  let stream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let websocket: WebSocket | null = null;
  let finalizedText = initialText; // 累积已确认的文本，从初始文本开始


  const cleanup = async () => {
    try {
      if (audioContext && audioContext.state !== 'closed') {
        await audioContext.close().catch(() => {});
      }
    } catch {}
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch {}
    try {
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({ is_speaking: false }));
        await new Promise((resolve) => setTimeout(resolve, 300));
        websocket.close();
      }
    } catch {}
    onClose?.();
  };

  try {
    let resolvedDeviceId: string | undefined = deviceId;
    if (!resolvedDeviceId) {
      try {
        const electronAPI: any =
          (window as any).electronInterviewerAPI || (window as any).electronAPI;
        const res = await electronAPI?.asrConfig?.get?.();
        const cfg = res?.config;
        if (cfg?.microphoneDeviceId) {
          resolvedDeviceId = cfg.microphoneDeviceId;
        }
      } catch {}
    }
    const constraints: MediaStreamConstraints = {
      audio: {
        ...(resolvedDeviceId ? { deviceId: { exact: resolvedDeviceId } } : {}),
        echoCancellation,
        noiseSuppression,
        autoGainControl: true, // 自动增益控制
        sampleRate: { ideal: sampleRate },
        channelCount: { ideal: 1 }, // 单声道
      },
    };
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    logger.info(`麦克风识别: 成功获取麦克风流, deviceId=${resolvedDeviceId || 'default'}`);

    websocket = new WebSocket(url);

    websocket.onopen = async () => {
      logger.info(`麦克风识别: WebSocket 连接成功, url=${url}, sessionId=${sessionId}`);
      onOpen?.();

      const config = {
        chunk_size: [5, 10, 5],
        chunk_interval: 5,
        wav_name: `${sessionId}_${Date.now()}`, // 使用 sessionId 和时间戳确保唯一性
        is_speaking: true,
        mode: 'online',
      };
      websocket?.send(JSON.stringify(config));

      if (stream) {
        audioContext = new AudioContext({ sampleRate });
        const source = audioContext.createMediaStreamSource(stream);
        try {
          // 获取 AudioWorklet 处理器代码
          const electronAPI: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
          let moduleURL: string;

          if (electronAPI?.invoke) {
            // 从主进程获取文件内容
            const result = await electronAPI.invoke('get-asar-unpacked-path', 'pcm-processor.js');

            if (result.success) {
              // 创建 Blob URL
              const blob = new Blob([result.content], { type: 'application/javascript' });
              moduleURL = URL.createObjectURL(blob);
            } else {
              throw new Error(`加载处理器失败: ${result.error}`);
            }
          } else {
            // 开发环境降级处理
            moduleURL = '/pcm-processor.js';
          }

          await audioContext.audioWorklet.addModule(moduleURL);

          const workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
          workletNode.port.onmessage = (event) => {
            if (
              event.data?.type === 'audiodata' &&
              websocket &&
              websocket.readyState === WebSocket.OPEN
            ) {
              websocket.send(event.data.data);
            }
          };
          source.connect(workletNode);
        } catch (err: any) {
          logger.warn(`麦克风识别 AudioWorklet 加载失败，降级使用 ScriptProcessor: error=${err?.message || err}`);
          const processor = audioContext.createScriptProcessor(4096, 1, 1);
          processor.onaudioprocess = (event) => {
            if (websocket && websocket.readyState === WebSocket.OPEN) {
              const inputData = event.inputBuffer.getChannelData(0);
              const pcmData = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
              }
              websocket.send(pcmData.buffer);
            }
          };
          source.connect(processor);
        }
      }
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.text && data.text.trim()) {
          const currentRecognizedText = data.text.trim();

          // 累积所有识别结果，避免重复添加
          if (currentRecognizedText && !finalizedText.includes(currentRecognizedText)) {
            finalizedText = finalizedText ? `${finalizedText} ${currentRecognizedText}` : currentRecognizedText;
            onText?.(finalizedText, data.is_final);
          }
        }
      } catch (err) {
        logger.error(`AudioRecognition WebSocket 解析出错: ${err}`);
      }
    };

    websocket.onerror = (event) => {
      logger.error(`麦克风识别 WebSocket 连接错误: url=${url}, sessionId=${sessionId}, event=${JSON.stringify(event)}`);
      onError?.('麦克风识别 WebSocket 连接错误');
      void cleanup();
    };

    websocket.onclose = (event) => {
      if (event.code !== 1000) {
        logger.warn(`麦克风识别 WebSocket 非正常关闭: code=${event.code}, reason=${event.reason}, sessionId=${sessionId}`);
      }
      onClose?.();
    };
  } catch (error: any) {
    const message = error?.message || '启动麦克风识别失败';
    logger.error(`启动麦克风识别失败: message=${message}, error=${error?.name || 'unknown'}, stack=${error?.stack || 'no stack'}`);
    onError?.(message);
    await cleanup();
  }

  const controller: MicrophoneRecognitionController = {
    stop: async () => {
      await cleanup();
    },
  };

  return controller;
}

// 通用的扬声器语音识别启动函数，适用于所有使用场景
export async function startSpeakerRecognition(
  options: SpeakerRecognitionOptions,
): Promise<SpeakerRecognitionController> {
  const {
    deviceId,
    url = 'ws://localhost:10095',
    sampleRate = 16000,
    sessionId = 'speaker',
    onText,
    onError,
    onOpen,
    onClose,
  } = options;

  let websocket: WebSocket | null = null;
  let audioDataListener: any = null;
  let audioContext: AudioContext | null = null;
  let speakerWorkletNode: AudioWorkletNode | null = null;
  let finalizedText = ''; // 累积已确认的文本
  let currentSessionText = ''; // 当前识别会话的临时文本

  const cleanup = async () => {
    try {
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({ is_speaking: false }));
        await new Promise((resolve) => setTimeout(resolve, 500));
        websocket.close();
      }
    } catch {}
    try {
      if (audioContext && audioContext.state !== 'closed') {
        await audioContext.close().catch(() => {});
      }
    } catch {}
    try {
      const electronAPI = (window as any).electronInterviewerAPI;
      if (audioDataListener) electronAPI?.off('speaker-audio-data', audioDataListener);
      electronAPI?.audioTest?.stopTest();
    } catch {}
    onClose?.();
  };

  try {
    let resolvedDeviceId: string | undefined = deviceId;
    if (!resolvedDeviceId) {
      try {
        const electronAPI: any =
          (window as any).electronInterviewerAPI || (window as any).electronAPI;
        const res = await electronAPI?.asrConfig?.get?.();
        const cfg = res?.config;
        if (cfg?.speakerDeviceId) {
          resolvedDeviceId = cfg.speakerDeviceId;
        }
      } catch {}
    }
    const electronAPI = (window as any).electronInterviewerAPI;
    if (!electronAPI || !electronAPI.audioTest) {
      logger.error(`扬声器识别失败: 音频测试服务不可用, electronAPI=${!!electronAPI}, audioTest=${!!electronAPI?.audioTest}`);
      onError?.('音频测试服务不可用');
      return { stop: async () => {} };
    }

    websocket = new WebSocket(url);
    logger.info(`扬声器识别: 开始连接 WebSocket, url=${url}, sessionId=${sessionId}, deviceId=${resolvedDeviceId || 'default'}`);

    websocket.onopen = async () => {
      logger.info(`扬声器识别: WebSocket 连接成功, url=${url}, sessionId=${sessionId}`);
      onOpen?.();

      // 发送 FunASR 配置参数
      const config = {
        chunk_size: [5, 10, 5],
        chunk_interval: 5,
        wav_name: `${sessionId}_${Date.now()}`, // 使用 sessionId 和时间戳确保唯一性
        is_speaking: true,
        mode: 'online',
      };
      websocket?.send(JSON.stringify(config));

      // 初始化 AudioContext 和 WorkletNode
      audioContext = new AudioContext({ sampleRate });
      try {
        // 获取 AudioWorklet 处理器代码
        const electronAPI: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
        let moduleURL: string;

        if (electronAPI?.invoke) {
          // 从主进程获取文件内容
          const result = await electronAPI.invoke('get-asar-unpacked-path', 'speaker-pcm-processor.js');

          if (result.success) {
            // 创建 Blob URL
            const blob = new Blob([result.content], { type: 'application/javascript' });
            moduleURL = URL.createObjectURL(blob);
          } else {
            throw new Error(`加载处理器失败: ${result.error}`);
          }
        } else {
          // 开发环境降级处理
          moduleURL = '/speaker-pcm-processor.js';
        }

        await audioContext.audioWorklet.addModule(moduleURL);

        speakerWorkletNode = new AudioWorkletNode(audioContext, 'speaker-pcm-processor');

        // 监听来自 WorkletNode 的处理后音频数据
        speakerWorkletNode.port.onmessage = (event) => {
          if (
            event.data.type === 'audiodata' &&
            websocket &&
            websocket.readyState === WebSocket.OPEN
          ) {
            websocket.send(event.data.data);
          }
        };
      } catch (err: any) {
        logger.error(`扬声器识别 AudioWorklet 初始化失败: error=${err?.message || err}, stack=${err?.stack || 'no stack'}`);
        onError?.('AudioWorklet 初始化失败');
        await cleanup();
        return { stop: async () => {} };
      }

      const result = await electronAPI.audioTest.startSpeakerTest({ deviceId: resolvedDeviceId });

      if (!result.success) {
        logger.error(`扬声器识别启动扬声器捕获失败: error=${result.error}, deviceId=${resolvedDeviceId}`);
        onError?.(result.error || '启动扬声器捕获失败');
        await cleanup();
        return { stop: async () => {} };
      }

      // 接收原生音频数据并转发给 WorkletNode 处理
      audioDataListener = (audioData: ArrayBuffer) => {
        if (speakerWorkletNode && audioData.byteLength > 0) {
          speakerWorkletNode.port.postMessage({
            type: 'nativeAudioData',
            audioData: audioData,
          });
        }
      };
      electronAPI.on('speaker-audio-data', audioDataListener);
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // FunASR 返回格式: { mode: "online", text: "识别结果", wav_name: "speaker", is_final: false }
        if (data.text && data.text.trim()) {
          const currentRecognizedText = data.text.trim();

          if (data.is_final) {
            // 识别结果已确认，累加到 finalizedText
            if (currentRecognizedText && !finalizedText.includes(currentRecognizedText)) {
              finalizedText = finalizedText
                ? `${finalizedText} ${currentRecognizedText}`
                : currentRecognizedText;
              currentSessionText = '';
            }
            onText?.(finalizedText, true);
          } else {
            // 临时识别结果，更新 currentSessionText
            currentSessionText = currentRecognizedText;
            const combinedText = finalizedText
              ? `${finalizedText} ${currentSessionText}`
              : currentSessionText;
            onText?.(combinedText, false);
          }
        }
      } catch (err) {
        logger.error(`解析 FunASR 消息失败: ${err}, data: ${event.data}`);
      }
    };

    websocket.onerror = (event) => {
      logger.error(`扬声器识别 WebSocket 连接错误: url=${url}, sessionId=${sessionId}, event=${JSON.stringify(event)}`);
      onError?.('连接扬声器识别服务失败');
      void cleanup();
    };

    websocket.onclose = (event) => {
      if (event.code !== 1000) {
        logger.warn(`扬声器识别 WebSocket 非正常关闭: code=${event.code}, reason=${event.reason}, sessionId=${sessionId}`);
      }
      onClose?.();
    };
  } catch (error: any) {
    const errorMsg =
      error?.name === 'SecurityError'
        ? '安全权限错误，请确保已授予屏幕录制权限'
        : `扬声器识别启动失败：${error?.message}`;
    logger.error(`启动扬声器识别失败: message=${errorMsg}, error=${error?.name || 'unknown'}, stack=${error?.stack || 'no stack'}`);
    onError?.(errorMsg);
    await cleanup();
  }

  const controller: SpeakerRecognitionController = {
    stop: async () => {
      await cleanup();
    },
  };

  return controller;
}
