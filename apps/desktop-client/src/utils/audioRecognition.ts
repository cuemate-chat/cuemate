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
  let finalizedText = initialText; // 累积已确认的文本，从初始文本开始

  // 获取 ElectronAPI
  const electronAPI: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
  if (!electronAPI?.asrWebSocket) {
    throw new Error('ASR WebSocket API 不可用');
  }

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
      // 使用 IPC WebSocket API 发送停止信号并关闭连接
      await electronAPI.asrWebSocket.sendConfig(sessionId, { is_speaking: false });
      await new Promise((resolve) => setTimeout(resolve, 300));
      await electronAPI.asrWebSocket.close(sessionId);
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
        if (cfg?.microphone_device_id) {
          resolvedDeviceId = cfg.microphone_device_id;
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
    const tracks = stream.getTracks();
      tracks: tracks.map(t => ({
        kind: t.kind,
        label: t.label,
        enabled: t.enabled,
        muted: t.muted,
        readyState: t.readyState,
        settings: t.getSettings?.()
      }))
    });

    // 检查 tracks 是否 muted
    const mutedTracks = tracks.filter(t => t.muted);
    if (mutedTracks.length > 0) {
        mutedTracks: mutedTracks.map(t => t.label)
      });
    }


    // 关键修复：先设置消息监听器，再创建连接，避免消息丢失
    electronAPI.asrWebSocket.onMessage(sessionId, (message: string) => {
      try {
        const data = JSON.parse(message);

        if (data.text && data.text.trim()) {
          const currentRecognizedText = data.text.trim();

          // 累积所有识别结果，避免重复添加
          if (currentRecognizedText && !finalizedText.includes(currentRecognizedText)) {
            finalizedText = finalizedText ? `${finalizedText} ${currentRecognizedText}` : currentRecognizedText;
            onText?.(finalizedText, data.is_final);
          }
        }
      } catch (err) {
      }
    });

    // 使用 IPC WebSocket API 创建连接
    const connectResult = await electronAPI.asrWebSocket.connect(sessionId, url);
    if (!connectResult.success) {
      throw new Error(`WebSocket 连接失败: ${connectResult.error}`);
    }
    onOpen?.();

    // 发送 FunASR 配置
    const config = {
      chunk_size: [5, 10, 5],
      chunk_interval: 5,
      wav_name: `${sessionId}_${Date.now()}`,
      is_speaking: true,
      mode: 'online',
    };
    await electronAPI.asrWebSocket.sendConfig(sessionId, config);

    // 初始化音频处理
    if (stream) {
        audioContext = new AudioContext({ sampleRate });
          sampleRate: audioContext.sampleRate,
          state: audioContext.state
        });

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
                contentLength: result.content.length
              });
            } else {
              throw new Error(`加载处理器失败: ${result.error}`);
            }
          } else {
            // 开发环境降级处理
            moduleURL = '/pcm-processor.js';
          }

          await audioContext.audioWorklet.addModule(moduleURL);

          const workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');

          let messageCount = 0;
          workletNode.port.onmessage = (event) => {
            messageCount++;
            if (messageCount <= 3) {
                type: event.data?.type,
                dataSize: event.data?.data?.byteLength,
                messageCount
              });
            }

            // 调试消息
            if (event.data?.type === 'debug') {
                message: event.data.message,
                samplesString: event.data.samplesString,
                maxAbsValue: event.data.maxAbsValue,
                inputLength: event.data.inputLength,
                samples: event.data.samples
              });

              // 如果音频全是 0，报错
              if (event.data.maxAbsValue === 0) {
              }
            }

            if (event.data?.type === 'audiodata') {
              // 使用 IPC WebSocket API 发送音频数据
              electronAPI.asrWebSocket.sendAudio(sessionId, event.data.data).then((result: any) => {
                if (!result || !result.success) {
                    result,
                    byteLength: event.data.data.byteLength,
                    sessionId
                  });
                  onError?.(`发送音频数据失败: ${result?.error || '未知错误'}`);
                } else if (messageCount <= 3) {
                    byteLength: event.data.data.byteLength
                  });
                }
              }).catch((error: any) => {
                  error,
                  errorMessage: error?.message,
                  byteLength: event.data.data.byteLength,
                  sessionId
                });
                onError?.(`IPC 调用异常: ${error?.message || String(error)}`);
              });
            }
          };
          source.connect(workletNode);
        } catch (err) {

          const processor = audioContext.createScriptProcessor(4096, 1, 1);

          let processCount = 0;
          processor.onaudioprocess = (event) => {
            processCount++;
            if (processCount <= 3) {
                processCount
              });
            }

            const inputData = event.inputBuffer.getChannelData(0);
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
            }
            // 使用 IPC WebSocket API 发送音频数据
            electronAPI.asrWebSocket.sendAudio(sessionId, pcmData.buffer).then((result: any) => {
              if (!result || !result.success) {
                  result,
                  byteLength: pcmData.buffer.byteLength,
                  sessionId
                });
                onError?.(`发送音频数据失败: ${result?.error || '未知错误'}`);
              } else if (processCount <= 3) {
                  byteLength: pcmData.buffer.byteLength
                });
              }
            }).catch((error: any) => {
                error,
                errorMessage: error?.message,
                byteLength: pcmData.buffer.byteLength,
                sessionId
              });
              onError?.(`IPC 调用异常: ${error?.message || String(error)}`);
            });
          };
          source.connect(processor);
        }
    }
  } catch (error: any) {
    const message = error?.message || '启动麦克风识别失败';
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

  let audioDataListener: any = null;
  let audioContext: AudioContext | null = null;
  let speakerWorkletNode: AudioWorkletNode | null = null;
  let finalizedText = ''; // 累积已确认的文本
  let currentSessionText = ''; // 当前识别会话的临时文本

  // 获取 ElectronAPI
  const electronAPI: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
  if (!electronAPI?.asrWebSocket) {
    throw new Error('ASR WebSocket API 不可用');
  }

  const cleanup = async () => {
    try {
      // 使用 IPC WebSocket API 发送停止信号并关闭连接
      await electronAPI.asrWebSocket.sendConfig(sessionId, { is_speaking: false });
      await new Promise((resolve) => setTimeout(resolve, 500));
      await electronAPI.asrWebSocket.close(sessionId);
    } catch {}
    try {
      if (audioContext && audioContext.state !== 'closed') {
        await audioContext.close().catch(() => {});
      }
    } catch {}
    try {
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
        if (cfg?.speaker_device_id) {
          resolvedDeviceId = cfg.speaker_device_id;
        }
      } catch {}
    }
    const electronAPI = (window as any).electronInterviewerAPI;
    if (!electronAPI || !electronAPI.audioTest) {
      onError?.('音频测试服务不可用');
      return { stop: async () => {} };
    }


    // 关键修复：先设置消息监听器，再创建连接，避免消息丢失
    electronAPI.asrWebSocket.onMessage(sessionId, (message: string) => {
      try {
        const data = JSON.parse(message);

        if (data.text && data.text.trim()) {
          const newText = data.text.trim();

          if (data.is_final) {
            // 确认文本，累积到 finalizedText
            finalizedText = finalizedText ? `${finalizedText} ${newText}` : newText;
            onText?.(finalizedText, true);
            currentSessionText = ''; // 清空临时文本
          } else {
            // 临时文本
            currentSessionText = newText;
            const fullText = finalizedText ? `${finalizedText} ${currentSessionText}` : currentSessionText;
            onText?.(fullText, false);
          }
        }
      } catch (err) {
      }
    });

    // 使用 IPC WebSocket API 创建连接
    const connectResult = await electronAPI.asrWebSocket.connect(sessionId, url);
    if (!connectResult.success) {
      throw new Error(`WebSocket 连接失败: ${connectResult.error}`);
    }
    onOpen?.();

    // 发送 FunASR 配置
    const config = {
      chunk_size: [5, 10, 5],
      chunk_interval: 5,
      wav_name: `${sessionId}_${Date.now()}`,
      is_speaking: true,
      mode: 'online',
    };
    await electronAPI.asrWebSocket.sendConfig(sessionId, config);

    // 初始化音频处理流程

      // 初始化 AudioContext 和 WorkletNode
      audioContext = new AudioContext({ sampleRate });
        sampleRate: audioContext.sampleRate,
        state: audioContext.state
      });

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
              contentLength: result.content.length
            });
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
        let messageCount = 0;
        speakerWorkletNode.port.onmessage = (event) => {
          messageCount++;
          if (messageCount <= 3) {
              type: event.data.type,
              dataSize: event.data.data?.byteLength,
              messageCount
            });
          }

          if (event.data.type === 'audiodata') {
            // 使用 IPC WebSocket API 发送音频数据
            electronAPI.asrWebSocket.sendAudio(sessionId, event.data.data).then((result: any) => {
              if (!result || !result.success) {
                  result,
                  byteLength: event.data.data.byteLength,
                  sessionId
                });
                onError?.(`发送音频数据失败: ${result?.error || '未知错误'}`);
              } else if (messageCount <= 3) {
                  byteLength: event.data.data.byteLength
                });
              }
            }).catch((error: any) => {
                error,
                errorMessage: error?.message,
                byteLength: event.data.data.byteLength,
                sessionId
              });
              onError?.(`IPC 调用异常: ${error?.message || String(error)}`);
            });
          }
        };
      } catch (err) {
        onError?.('AudioWorklet 初始化失败');
        await cleanup();
        return { stop: async () => {} };
      }

      const result = await electronAPI.audioTest.startSpeakerTest({ deviceId: resolvedDeviceId });

      if (!result.success) {
        onError?.(result.error || '启动扬声器捕获失败');
        await cleanup();
        return { stop: async () => {} };
      }

      // 接收原生音频数据并转发给 WorkletNode 处理
      let audioDataCount = 0;
      audioDataListener = (audioData: ArrayBuffer) => {
        audioDataCount++;
        if (audioDataCount <= 3) {
            byteLength: audioData.byteLength,
            count: audioDataCount
          });
        }

        if (speakerWorkletNode && audioData.byteLength > 0) {
          speakerWorkletNode.port.postMessage({
            type: 'nativeAudioData',
            audioData: audioData,
          });
          if (audioDataCount <= 3) {
          }
        }
      };
      electronAPI.on('speaker-audio-data', audioDataListener);
  } catch (error: any) {
    const errorMsg =
      error?.name === 'SecurityError'
        ? '安全权限错误，请确保已授予屏幕录制权限'
        : `扬声器识别启动失败：${error?.message}`;
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
