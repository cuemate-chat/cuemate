import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import './App.css';

interface AudioDevice {
  id: string;
  name: string;
  device_type: 'Input' | 'Output';
  is_virtual: boolean;
  is_default: boolean;
}

interface AudioConfig {
  sample_rate: number;
  channels: number;
  buffer_size: number;
}

function App() {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [virtualDevices, setVirtualDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [websocketUrl, setWebsocketUrl] = useState('ws://localhost:8001');
  const [installedDrivers, setInstalledDrivers] = useState<string[]>([]);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initializeApp();
    setupEventListeners();
  }, []);

  const setupEventListeners = async () => {
    // 监听虚拟驱动未找到事件
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
      setVirtualDevices(virtualDevices);
      
      // 自动选择第一个虚拟输入设备
      const virtualInputDevice = virtualDevices.find(d => d.device_type === 'Input');
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
      
      // 重新加载设备列表
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
      
      // 设置 WebSocket 连接
      await setWebsocketConnection();
      
      // 开始捕获
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

  return (
    <div className="app">
      <header className="header">
        <h1>CueMate 音频捕获客户端</h1>
      </header>

      <main className="main">
        {showInstallGuide && (
          <div className="install-guide">
            <h2>🚀 虚拟音频驱动安装</h2>
            <p>为了捕获系统音频（扬声器输出），需要安装虚拟音频驱动。</p>
            
            {installedDrivers.length > 0 ? (
              <div className="success">
                <p>✅ 已安装的驱动: {installedDrivers.join(', ')}</p>
                <button onClick={() => setShowInstallGuide(false)}>继续使用</button>
              </div>
            ) : (
              <div className="install-section">
                <div className="platform-info">
                  <h3>支持的免费驱动:</h3>
                  <ul>
                    <li><strong>Windows:</strong> VB-Audio Cable (免费)</li>
                    <li><strong>macOS:</strong> BlackHole (开源免费)</li>
                    <li><strong>Linux:</strong> PulseAudio 虚拟设备 (系统自带)</li>
                  </ul>
                </div>
                
                <button 
                  onClick={installVirtualDriver}
                  disabled={loading}
                  className="install-btn"
                >
                  {loading ? '安装中...' : '安装虚拟音频驱动'}
                </button>
                
                <button 
                  onClick={checkVirtualDriver}
                  className="refresh-btn"
                >
                  重新检测
                </button>
              </div>
            )}
          </div>
        )}

        <div className="config-section">
          <h2>🎵 音频配置</h2>
          
          <div className="form-group">
            <label>WebSocket 服务地址:</label>
            <input
              type="text"
              value={websocketUrl}
              onChange={(e) => setWebsocketUrl(e.target.value)}
              placeholder="ws://localhost:8001"
            />
          </div>

          <div className="form-group">
            <label>音频输入设备:</label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
            >
              <option value="">请选择设备</option>
              {devices
                .filter(d => d.device_type === 'Input')
                .map(device => (
                  <option key={device.id} value={device.name}>
                    {device.name} {device.is_virtual ? '(虚拟)' : ''} {device.is_default ? '(默认)' : ''}
                  </option>
                ))}
            </select>
          </div>

          <div className="control-buttons">
            {!isCapturing ? (
              <button
                onClick={startCapture}
                disabled={loading || !selectedDevice}
                className="start-btn"
              >
                {loading ? '启动中...' : '🎤 开始音频捕获'}
              </button>
            ) : (
              <button
                onClick={stopCapture}
                className="stop-btn"
              >
                ⏹️ 停止捕获
              </button>
            )}
          </div>
        </div>

        <div className="device-list">
          <h3>📱 音频设备列表</h3>
          
          <div className="device-category">
            <h4>虚拟音频设备 ({virtualDevices.length})</h4>
            {virtualDevices.length > 0 ? (
              <ul>
                {virtualDevices.map(device => (
                  <li key={device.id} className="virtual-device">
                    <span className="device-name">{device.name}</span>
                    <span className="device-type">{device.device_type}</span>
                    {device.is_default && <span className="default-badge">默认</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-devices">未找到虚拟音频设备</p>
            )}
          </div>

          <details>
            <summary>所有音频设备 ({devices.length})</summary>
            <div className="all-devices">
              {devices.map(device => (
                <div key={device.id} className="device-item">
                  <span className="device-name">{device.name}</span>
                  <span className="device-type">{device.device_type}</span>
                  {device.is_virtual && <span className="virtual-badge">虚拟</span>}
                  {device.is_default && <span className="default-badge">默认</span>}
                </div>
              ))}
            </div>
          </details>
        </div>

        <div className="status-section">
          <h3>📊 状态信息</h3>
          <div className="status-grid">
            <div className="status-item">
              <label>捕获状态:</label>
              <span className={isCapturing ? 'status-active' : 'status-inactive'}>
                {isCapturing ? '🔴 正在捕获' : '⚪ 已停止'}
              </span>
            </div>
            <div className="status-item">
              <label>虚拟驱动:</label>
              <span className={installedDrivers.length > 0 ? 'status-active' : 'status-inactive'}>
                {installedDrivers.length > 0 ? `✅ ${installedDrivers.join(', ')}` : '❌ 未安装'}
              </span>
            </div>
            <div className="status-item">
              <label>WebSocket:</label>
              <span>{websocketUrl}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;