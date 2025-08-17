import { useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { useAppStore } from '../store/appStore';

// 允许在非 Vite 环境下回退到 process.env
const BACKEND_URL =
  (import.meta as any)?.env?.VITE_BACKEND_URL ||
  (process as any)?.env?.VITE_BACKEND_URL ||
  'http://localhost:3000';

export default function useWebSocketConnection() {
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const {
    setConnected,
    setConnectionError,
    updateTranscript,
    updateAnswer,
    addRagSource,
    clearRagSources,
  } = useAppStore();

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    socketRef.current = io(BACKEND_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setConnected(true);
      setConnectionError(null);
      reconnectAttemptsRef.current = 0;
      toast.success('已连接到服务器');
    });

    socket.on('disconnect', () => {
      setConnected(false);
      toast.error('与服务器断开连接');
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionError(error.message);
      reconnectAttemptsRef.current++;

      if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        toast.error('无法连接到服务器，请检查后端服务');
      }
    });

    // ASR 事件
    socket.on('transcript:partial', (data) => {
      updateTranscript(data.text, false);
    });

    socket.on('transcript:final', (data) => {
      updateTranscript(data.text, true);
      // 触发 LLM 生成
      socket.emit('generate:answer', {
        text: data.text,
        mode: useAppStore.getState().displayMode,
        ragEnabled: useAppStore.getState().ragEnabled,
      });
    });

    // LLM 事件
    socket.on('answer:outline', (data) => {
      updateAnswer({
        outline: data.points,
        timestamp: Date.now(),
      });
    });

    socket.on('answer:stream', (data) => {
      const currentAnswer = useAppStore.getState().currentAnswer;
      updateAnswer({
        ...currentAnswer,
        fullAnswer: data.text,
        timestamp: Date.now(),
      });
    });

    socket.on('answer:complete', (data) => {
      updateAnswer({
        outline: data.outline,
        fullAnswer: data.fullAnswer,
        timestamp: Date.now(),
      });
    });

    // RAG 事件
    socket.on('rag:sources', (data) => {
      clearRagSources();
      data.sources.forEach((source: any) => {
        addRagSource(source);
      });
    });

    // 错误处理
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      toast.error(`错误: ${error.message}`);
    });

    return socket;
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
    }
  }, []);

  const sendAudioData = useCallback((audioData: ArrayBuffer) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('audio:stream', audioData);
    }
  }, []);

  const sendCommand = useCallback((command: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(command, data);
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    connect,
    disconnect,
    sendAudioData,
    sendCommand,
    socket: socketRef.current,
  };
}
