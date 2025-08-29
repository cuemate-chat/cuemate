import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Eye,
  Grid3X3,
  MessageSquare,
  Mic,
  MicOff,
  X
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import './App.css';

interface AudioDevice {
  id: string;
  name: string;
  device_type: 'Input' | 'Output';
  is_virtual: boolean;
  is_default: boolean;
}

function App() {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [websocketUrl, setWebsocketUrl] = useState('ws://localhost:8001');
  const [installedDrivers, setInstalledDrivers] = useState<string[]>([]);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [showSettings, setShowSettings] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeApp();
    setupEventListeners();
  }, []);

  const setupEventListeners = async () => {
    await listen('virtual-driver-not-found', () => {
      setShowInstallGuide(true);
    });
  };

  const initializeApp = async () => {
    await loadDevices();
    await checkVirtualDriver();
  };

  const loadDevices = async () => {
    try {
      const allDevices = await invoke<AudioDevice[]>('get_audio_devices');
      const virtualDevices = await invoke<AudioDevice[]>('get_virtual_devices');
      
      setDevices(allDevices);
      
      const virtualInputDevice = virtualDevices.find((d: AudioDevice) => d.device_type === 'Input');
      if (virtualInputDevice) {
        setSelectedDevice(virtualInputDevice.name);
      }
    } catch (error) {
      console.error('加载音频设备失败:', error);
    }
  };

  const checkVirtualDriver = async () => {
    try {
      const drivers = await invoke<string[]>('check_virtual_driver');
      setInstalledDrivers(drivers);
      setShowInstallGuide(drivers.length === 0);
    } catch (error) {
      console.error('检查虚拟驱动失败:', error);
    }
  };

  const installVirtualDriver = async () => {
    setLoading(true);
    try {
      const result = await invoke<string>('install_virtual_driver');
      console.log('安装结果:', result);
      
      setTimeout(async () => {
        await loadDevices();
        await checkVirtualDriver();
        setLoading(false);
      }, 2000);
    } catch (error) {
      console.error('安装虚拟驱动失败:', error);
      setLoading(false);
    }
  };

  const setWebsocketConnection = async () => {
    try {
      await invoke('set_websocket_url', { url: websocketUrl });
      console.log('WebSocket 地址已设置:', websocketUrl);
    } catch (error) {
      console.error('设置 WebSocket 地址失败:', error);
    }
  };

  const startCapture = async () => {
    if (!selectedDevice) {
      alert('请选择音频设备');
      return;
    }

    try {
      setLoading(true);
      await setWebsocketConnection();
      await invoke('start_audio_capture', { deviceName: selectedDevice });
      setIsCapturing(true);
      console.log('音频捕获已开始');
    } catch (error) {
      console.error('开始捕获失败:', error);
      alert(`开始捕获失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const stopCapture = async () => {
    try {
      await invoke('stop_audio_capture');
      setIsCapturing(false);
      console.log('音频捕获已停止');
    } catch (error) {
      console.error('停止捕获失败:', error);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === dragRef.current) {
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - 200,
        y: e.clientY - 40
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const closeWindow = () => {
    getCurrentWindow().close();
  };

  return (
    <div className="floating-control-bar">
      {/* 主控制栏 */}
      <motion.div 
        className="control-bar-container"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* 拖拽区域 */}
        <div 
          ref={dragRef}
          className="drag-area"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />

        {/* 录音状态指示器 */}
        <div className="status-indicator">
          <motion.div 
            className={`status-dot ${isCapturing ? 'active' : 'inactive'}`}
            animate={{ scale: isCapturing ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 2, repeat: isCapturing ? Infinity : 0 }}
          />
        </div>

        {/* 录音按钮 */}
        <motion.button
          className={`listen-btn ${isCapturing ? 'recording' : ''}`}
          onClick={isCapturing ? stopCapture : startCapture}
          disabled={loading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isCapturing ? (
            <MicOff size={16} />
          ) : (
            <Mic size={16} />
          )}
          <span>{isCapturing ? '停止' : 'Listen'}</span>
        </motion.button>

        {/* 提问按钮 */}
        <button className="ask-question-btn">
          <MessageSquare size={16} />
          <span>Ask question</span>
        </button>

        {/* 视图切换 */}
        <button className="view-btn">
          <Eye size={16} />
        </button>

        {/* 菜单按钮 */}
        <button 
          className="menu-btn"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Grid3X3 size={16} />
        </button>

        {/* 关闭按钮 */}
        <button onClick={closeWindow} className="close-btn">
          <X size={16} />
        </button>
      </motion.div>

      {/* 设置面板 */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            className="settings-panel"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="settings-header">
              <h4>设置</h4>
            </div>
            
            <div className="settings-content">
              <div className="setting-item">
                <label>WebSocket 地址</label>
                <input
                  type="text"
                  value={websocketUrl}
                  onChange={(e) => setWebsocketUrl(e.target.value)}
                  placeholder="ws://localhost:8001"
                />
              </div>

              <div className="setting-item">
                <label>音频设备</label>
                <select
                  value={selectedDevice}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  className="device-select"
                >
                  <option value="">选择设备</option>
                  {devices
                    .filter(d => d.device_type === 'Input')
                    .map(device => (
                      <option key={device.id} value={device.name}>
                        {device.name} {device.is_virtual ? '(虚拟)' : ''}
                      </option>
                    ))}
                </select>
              </div>

              {showInstallGuide && (
                <div className="driver-section">
                  <h5>虚拟音频驱动</h5>
                  <p>需要安装虚拟音频驱动来捕获系统音频</p>
                  <button 
                    onClick={installVirtualDriver}
                    disabled={loading}
                    className="install-btn"
                  >
                    {loading ? '安装中...' : '安装驱动'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;