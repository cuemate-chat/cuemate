import { useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAppStore } from '../store/appStore';
import useWebSocketConnection from './useWebSocketConnection';

export default function useAudioStream() {
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  const { selectedAudioDevice } = useAppStore();
  const { sendAudioData } = useWebSocketConnection();

  const startAudioCapture = useCallback(async () => {
    try {
      // 获取音频流
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
        video: false,
      };

      streamRef.current = await navigator.mediaDevices.getUserMedia(constraints);
      
      // 创建音频上下文
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 48000,
      });

      sourceRef.current = audioContextRef.current.createMediaStreamSource(streamRef.current);

      // 创建处理器节点
      const bufferSize = 2048;
      processorRef.current = audioContextRef.current.createScriptProcessor(bufferSize, 1, 1);

      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // 转换为 PCM16
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // 发送音频数据
        sendAudioData(pcm16.buffer);
      };

      // 连接音频节点
      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      toast.success('音频采集已开始');
    } catch (error) {
      console.error('Failed to start audio capture:', error);
      toast.error('无法启动音频采集，请检查麦克风权限');
      throw error;
    }
  }, [selectedAudioDevice, sendAudioData]);

  const stopAudioCapture = useCallback(async () => {
    try {
      // 断开音频节点
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }

      // 关闭音频上下文
      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // 停止媒体流
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      toast.success('音频采集已停止');
    } catch (error) {
      console.error('Failed to stop audio capture:', error);
      toast.error('停止音频采集时出错');
    }
  }, []);

  return {
    startAudioCapture,
    stopAudioCapture,
  };
}
