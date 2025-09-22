export interface MicrophoneRecognitionOptions {
  deviceId?: string;
  url?: string;
  sampleRate?: number;
  onText?: (text: string, isFinal?: boolean) => void;
  onError?: (errorMessage: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface MicrophoneRecognitionController {
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
    onText,
    onError,
    onOpen,
    onClose,
  } = options;

  let stream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let websocket: WebSocket | null = null;

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
    const constraints: MediaStreamConstraints = {
      audio: deviceId ? { deviceId: { exact: deviceId } } : true,
    } as any;
    stream = await navigator.mediaDevices.getUserMedia(constraints);

    websocket = new WebSocket(url);

    websocket.onopen = async () => {
      onOpen?.();

      const config = {
        chunk_size: [5, 10, 5],
        chunk_interval: 5,
        wav_name: 'microphone',
        is_speaking: true,
        mode: 'online',
      };
      websocket?.send(JSON.stringify(config));

      if (stream) {
        audioContext = new AudioContext({ sampleRate });
        const source = audioContext.createMediaStreamSource(stream);
        try {
          await audioContext.audioWorklet.addModule('/pcm-processor.js');
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
        } catch (err) {
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
          onText?.(currentRecognizedText, Boolean(data.is_final));
        }
      } catch {}
    };

    websocket.onerror = () => {
      onError?.('麦克风识别 WebSocket 连接错误');
      void cleanup();
    };

    websocket.onclose = () => {
      onClose?.();
    };
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
