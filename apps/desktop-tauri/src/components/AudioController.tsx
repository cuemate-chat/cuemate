import { invoke } from '@tauri-apps/api/tauri';
import { motion } from 'framer-motion';
import { Mic, MicOff, Settings, Volume2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAppStore } from '../store/appStore';

interface AudioControllerProps {
  isRecording: boolean;
  onToggleRecording: () => void;
}

const AudioController: React.FC<AudioControllerProps> = ({
  isRecording,
  onToggleRecording,
}) => {
  const { selectedAudioDevice, audioDevices, setAudioDevices, setSelectedAudioDevice } = useAppStore();
  const [showDeviceList, setShowDeviceList] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    // 获取音频设备列表
    loadAudioDevices();
  }, []);

  useEffect(() => {
    if (isRecording) {
      // 模拟音频电平显示
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 100);
      }, 100);
      return () => clearInterval(interval);
    }
    setAudioLevel(0);
    return undefined;
  }, [isRecording]);

  const loadAudioDevices = async () => {
    try {
      const devices = await invoke<string[]>('get_audio_devices');
      setAudioDevices(devices);
      if (devices.length > 0 && !selectedAudioDevice) {
        setSelectedAudioDevice(devices[0]);
      }
    } catch (error) {
      console.error('Failed to load audio devices:', error);
      toast.error('无法获取音频设备列表');
    }
  };

  return (
    <div className="audio-controller space-y-3">
      {/* 录音按钮和状态 */}
      <div className="flex items-center justify-between">
        <button
          onClick={onToggleRecording}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isRecording ? (
            <>
              <MicOff className="w-4 h-4" />
              <span>停止录音</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              <span>开始录音</span>
            </>
          )}
        </button>

        <button
          onClick={() => setShowDeviceList(!showDeviceList)}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* 音频电平指示器 */}
      {isRecording && (
        <div className="flex items-center space-x-2">
          <Volume2 className="w-4 h-4 text-gray-400" />
          <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-green-500 to-green-400"
              animate={{ width: `${audioLevel}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </div>
      )}

      {/* 音频设备列表 */}
      {showDeviceList && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-lg p-3 space-y-2"
        >
          <div className="text-xs text-gray-400 mb-2">选择音频输入设备:</div>
          {audioDevices.map((device) => (
            <button
              key={device}
              onClick={() => {
                setSelectedAudioDevice(device);
                setShowDeviceList(false);
                toast.success(`已切换到: ${device}`);
              }}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                selectedAudioDevice === device
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {device}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default AudioController;
