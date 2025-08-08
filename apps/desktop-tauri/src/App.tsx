import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import AnswerDisplay from './components/AnswerDisplay';
import AudioController from './components/AudioController';
import FloatingPanel from './components/FloatingPanel';
import TranscriptDisplay from './components/TranscriptDisplay';
import useAudioStream from './hooks/useAudioStream';
import useWebSocketConnection from './hooks/useWebSocketConnection';
import { useAppStore } from './store/appStore';

function App() {
  const {
    isConnected,
    isRecording,
    displayMode,
    setDisplayMode,
    toggleRecording,
  } = useAppStore();

  const { connect, disconnect } = useWebSocketConnection();
  const { startAudioCapture, stopAudioCapture } = useAudioStream();

  useEffect(() => {
    // 自动连接到后端服务
    connect();
    
    return () => {
      disconnect();
    };
  }, []);

  const handleToggleRecording = async () => {
    if (isRecording) {
      await stopAudioCapture();
    } else {
      await startAudioCapture();
    }
    toggleRecording();
  };

  return (
    <div className="app-container">
      <FloatingPanel>
        <div className="p-4 space-y-4">
          {/* 连接状态指示器 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              } animate-pulse`} />
              <span className="text-xs text-gray-400">
                {isConnected ? '已连接' : '未连接'}
              </span>
            </div>
            
            {/* 显示模式切换 */}
            <div className="flex space-x-1">
              {['concise', 'points', 'detailed'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setDisplayMode(mode as any)}
                  className={`px-2 py-1 text-xs rounded ${
                    displayMode === mode
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {mode === 'concise' ? '简洁' : mode === 'points' ? '要点' : '详细'}
                </button>
              ))}
            </div>
          </div>

          {/* 音频控制器 */}
          <AudioController 
            isRecording={isRecording}
            onToggleRecording={handleToggleRecording}
          />

          {/* 转写显示 */}
          <TranscriptDisplay />

          {/* 答案显示 */}
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <AnswerDisplay mode={displayMode} />
            </motion.div>
          </AnimatePresence>
        </div>
      </FloatingPanel>

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1f2937',
            color: '#f3f4f6',
            fontSize: '14px',
          },
        }}
      />
    </div>
  );
}

export default App;
