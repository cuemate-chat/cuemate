import * as Tooltip from '@radix-ui/react-tooltip';
import { CheckCircle, ChevronDown, Clock, GraduationCap, Loader2, MessageSquare, Mic, Users, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface InterviewerWindowBodyProps {
  onStartTesting?: () => void;
  onStopTesting?: () => void;
}

export function InterviewerWindowBody({ onStartTesting, onStopTesting }: InterviewerWindowBodyProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [speakerDevices, setSpeakerDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('');
  const [micStatus, setMicStatus] = useState<'untested' | 'testing' | 'success' | 'failed'>('untested');
  const [speakerStatus, setSpeakerStatus] = useState<'untested' | 'testing' | 'success' | 'failed'>('untested');
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // 在组件挂载时获取设备列表
  useEffect(() => {
    getDevices();
  }, []);

  // 获取设备列表
  const getDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter(device => device.kind === 'audioinput');
      const speakers = devices.filter(device => device.kind === 'audiooutput');
      setMicDevices(mics);
      setSpeakerDevices(speakers);
      if (mics.length > 0) setSelectedMic(mics[0].deviceId);
      if (speakers.length > 0) setSelectedSpeaker(speakers[0].deviceId);
    } catch (error) {
      console.error('获取设备失败:', error);
    }
  };

  // 麦克风测试 - 30秒真实 ASR 识别（直接 WebSocket 连接）
  const testMicrophone = async () => {
    setMicStatus('testing');
    setRecognizedText('');
    setErrorMessage('');
    onStartTesting?.(); // 开始测试时通知父组件
    
    let stream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;
    let websocket: WebSocket | null = null;
    let testTimer: NodeJS.Timeout | null = null;
    let hasRecognitionResult = false;
    
    const cleanup = () => {
      if (testTimer) {
        clearTimeout(testTimer);
        testTimer = null;
      }
      if (recorder && recorder.state === 'recording') {
        recorder.stop();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        // 发送结束信号
        const emptyBlob = new Blob([], { type: 'audio/webm' });
        websocket.send(emptyBlob);
        setTimeout(() => websocket?.close(), 500);
      }
    };
    
    try {
      console.log('开始麦克风测试 - 直接连接 ASR 服务');
      
      // 1. 获取麦克风权限和音频流
      const constraints: MediaStreamConstraints = {
        audio: selectedMic ? { deviceId: { exact: selectedMic } } : true
      };
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // 2. 连接到麦克风 ASR 服务
      websocket = new WebSocket('ws://localhost:8001/asr');
      
      websocket.onopen = () => {
        console.log('已连接到麦克风 ASR 服务');
        
        // 3. 创建 MediaRecorder 开始录音
        if (stream) {
          recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
          
          recorder.ondataavailable = (event) => {
            if (websocket && websocket.readyState === WebSocket.OPEN && event.data.size > 0) {
              websocket.send(event.data);
            }
          };
          
          recorder.onerror = (event) => {
            console.error('录音器错误:', event);
            setMicStatus('failed');
            setErrorMessage('录音过程中发生错误');
            cleanup();
          };
          
          // 开始录制，每100ms发送一次数据
          recorder.start(100);
        }
      };
      
      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'ready_to_stop') {
            console.log('收到停止信号，处理完成');
            return;
          }
          
          // 提取纯净的转录文本
          let transcriptionText = '';
          if (data.lines && data.lines.length > 0) {
            transcriptionText = data.lines
              .filter((line: any) => line.speaker !== -2) // 过滤静音片段
              .map((line: any) => line.text || '')
              .join(' ');
          }
          if (data.buffer_transcription) {
            transcriptionText += ' ' + data.buffer_transcription;
          }
          
          if (transcriptionText.trim()) {
            hasRecognitionResult = true;
            setRecognizedText(transcriptionText.trim());
          }
        } catch (error) {
          console.error('解析 ASR 响应失败:', error);
        }
      };
      
      websocket.onerror = (error) => {
        console.error('WebSocket 连接错误:', error);
        setMicStatus('failed');
        setErrorMessage('连接麦克风识别服务失败');
        cleanup();
      };
      
      websocket.onclose = () => {
        console.log('WebSocket 连接已关闭');
      };
      
      // 4. 设置30秒超时
      testTimer = setTimeout(() => {
        cleanup();
        
        // 评估测试结果
        if (hasRecognitionResult) {
          setMicStatus('success');
        } else {
          setMicStatus('failed');
          setErrorMessage('30秒内未收到任何识别结果，请检查麦克风和 ASR 服务');
        }
        onStopTesting?.(); // 测试结束时通知父组件
      }, 30000);
      
    } catch (error: any) {
      console.error('麦克风测试失败:', error);
      setMicStatus('failed');
      if (error.name === 'NotAllowedError') {
        setErrorMessage('麦克风权限被拒绝，请在设置中允许麦克风访问');
      } else if (error.name === 'NotFoundError') {
        setErrorMessage('未找到麦克风设备，请检查设备连接');
      } else {
        setErrorMessage(`麦克风测试失败：${error.message}`);
      }
      
      cleanup();
      onStopTesting?.(); // 错误情况下也通知父组件测试结束
    }
  };

  // 扬声器测试 - 30秒真实 ASR 识别（直接 WebSocket + 原生扬声器捕获）
  const testSpeaker = async () => {
    setSpeakerStatus('testing');
    setRecognizedText('');
    setErrorMessage('');
    onStartTesting?.(); // 开始测试时通知父组件
    
    let websocket: WebSocket | null = null;
    let testTimer: NodeJS.Timeout | null = null;
    let hasRecognitionResult = false;
    let audioDataListener: any = null;
    
    const cleanup = async () => {
      if (testTimer) {
        clearTimeout(testTimer);
        testTimer = null;
      }
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        // 发送结束信号
        const emptyBlob = new Blob([], { type: 'audio/webm' });
        websocket.send(emptyBlob);
        setTimeout(() => websocket?.close(), 500);
      }
      if (audioDataListener) {
        const electronAPI = (window as any).electronInterviewerAPI;
        electronAPI?.off('speaker-audio-data', audioDataListener);
      }
      // 停止原生扬声器捕获
      const electronAPI = (window as any).electronInterviewerAPI;
      electronAPI?.audioTest?.stopTest();
    };
    
    try {
      console.log('开始扬声器测试 - 直接连接 ASR 服务 + 原生扬声器捕获');
      
      const electronAPI = (window as any).electronInterviewerAPI;
      if (!electronAPI || !electronAPI.audioTest) {
        setSpeakerStatus('failed');
        setErrorMessage('音频测试服务不可用');
        return;
      }
      console.log('electronAPI' + '：' + JSON.stringify(electronAPI));
      // 1. 连接到扬声器 ASR 服务
      websocket = new WebSocket('ws://localhost:8002/asr');

      websocket.onopen = async () => {
        console.log('已连接到扬声器 ASR 服务');
        
        // 2. 启动原生扬声器音频捕获
        console.log('准备启动扬声器捕获，设备ID:', selectedSpeaker);
        console.log('electronAPI.audioTest对象:', electronAPI.audioTest);
        console.log('electronAPI.audioTest.startSpeakerTest方法:', typeof electronAPI.audioTest.startSpeakerTest);
        
        const result = await electronAPI.audioTest.startSpeakerTest({ deviceId: selectedSpeaker });
        console.log('扬声器捕获启动结果:', result);
        if (!result.success) {
          console.error('扬声器捕获启动失败:', result.error);
          setSpeakerStatus('failed');
          setErrorMessage(result.error || '启动扬声器捕获失败');
          cleanup();
          return;
        }
        console.log('扬声器捕获启动成功');
        
        // 3. 监听原生模块发送的音频数据
        console.log('设置音频数据监听器...');
        audioDataListener = (audioData: ArrayBuffer) => {
          console.log('收到扬声器音频数据，大小:', audioData.byteLength, 'bytes');
          if (websocket && websocket.readyState === WebSocket.OPEN && audioData.byteLength > 0) {
            // 将 ArrayBuffer 转换为 Blob 并发送
            const blob = new Blob([audioData], { type: 'audio/webm' });
            websocket.send(blob);
            console.log('已发送音频数据到ASR服务');
          }
        };
        
        electronAPI.on('speaker-audio-data', audioDataListener);
        console.log('音频数据监听器已设置，等待音频数据...');
      };
      
      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'ready_to_stop') {
            console.log('收到停止信号，处理完成');
            return;
          }
          
          // 提取纯净的转录文本
          let transcriptionText = '';
          if (data.lines && data.lines.length > 0) {
            transcriptionText = data.lines
              .filter((line: any) => line.speaker !== -2) // 过滤静音片段
              .map((line: any) => line.text || '')
              .join(' ');
          }
          if (data.buffer_transcription) {
            transcriptionText += ' ' + data.buffer_transcription;
          }
          
          if (transcriptionText.trim()) {
            hasRecognitionResult = true;
            setRecognizedText(transcriptionText.trim());
          }
        } catch (error) {
          console.error('解析 ASR 响应失败:', error);
        }
      };
      
      websocket.onerror = (error) => {
        console.error('WebSocket 连接错误:', error);
        setSpeakerStatus('failed');
        setErrorMessage('连接扬声器识别服务失败');
        cleanup();
      };
      
      websocket.onclose = () => {
        console.log('扬声器 WebSocket 连接已关闭');
      };
      
      // 4. 设置30秒超时
      testTimer = setTimeout(async () => {
        await cleanup();
        
        // 评估测试结果
        if (hasRecognitionResult) {
          setSpeakerStatus('success');
        } else {
          setSpeakerStatus('failed');
          setErrorMessage('30秒内未收到任何识别结果，请检查扬声器播放内容和 ASR 服务');
        }
        onStopTesting?.(); // 测试结束时通知父组件
      }, 300000);
      
    } catch (error: any) {
      console.error('扬声器测试失败:', error);
      setSpeakerStatus('failed');
      if (error.name === 'SecurityError') {
        setErrorMessage('安全权限错误，请确保已授予屏幕录制权限');
      } else {
        setErrorMessage(`扬声器测试失败：${error.message}`);
      }
      
      await cleanup();
      onStopTesting?.(); // 错误情况下也通知父组件测试结束
    }
  };

  const insightCards = [
    {
      icon: Mic,
      title: "语音测试",
      description: "测试麦克风设备和扬声器的语音识别功能"
    },
    {
      icon: MessageSquare,
      title: "语音提问",
      description: "通过语音进行智能问答交互"
    },
    {
      icon: Users,
      title: "模拟面试",
      description: "模拟真实面试场景进行练习, AI 当做面试官"
    },
    {
      icon: GraduationCap,
      title: "面试训练",
      description: "系统化的面试训练, 可以找朋友模拟真实面试场景，也可以自行浏览器翻译播放面试题进行识别"
    }
  ];

  const handleCardClick = (cardTitle: string) => {
    setSelectedCard(cardTitle === selectedCard ? null : cardTitle);
    if (cardTitle === "语音测试") {
      getDevices();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'untested': return 'untested';
      case 'testing': return 'testing';
      case 'success': return 'success';
      case 'failed': return 'failed';
      default: return 'untested';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'untested': return '暂未测试';
      case 'testing': return '正在测试';
      case 'success': return '测试成功';
      case 'failed': return '测试失败';
      default: return '暂未测试';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'untested': return <Clock size={12} />;
      case 'testing': return <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />;
      case 'success': return <CheckCircle size={12} />;
      case 'failed': return <XCircle size={12} />;
      default: return <Clock size={12} />;
    }
  };

  return (
    <Tooltip.Provider>
      <div className="interviewer-window-body">
        <div className="live-insights-grid">
        {insightCards.map((card, index) => {
          const IconComponent = card.icon;
          return (
            <button 
              key={index} 
              className={`insight-card ${selectedCard === card.title ? 'insight-card-selected' : ''}`}
              onClick={() => handleCardClick(card.title)}
            >
              <div className="insight-card-icon">
                <IconComponent size={24} />
              </div>
              <div className="insight-card-content">
                <h3 className="insight-card-title">{card.title}</h3>
              </div>
            </button>
          );
        })}
      </div>
      
      {selectedCard === "语音测试" && (
        <div className="voice-test-panel">
          <div className="test-section">
            <h4 className="test-section-title">麦克风测试</h4>
            <div className="test-row">
              <div className="device-select-wrapper">
                <select 
                  className="device-select"
                  value={selectedMic}
                  onChange={(e) => setSelectedMic(e.target.value)}
                >
                  {micDevices.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || '默认麦克风'}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="select-icon" />
              </div>
              <div className={`test-status ${getStatusColor(micStatus)}`}>
                {getStatusIcon(micStatus)}
                {getStatusText(micStatus)}
              </div>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button 
                    className="test-button"
                    onClick={testMicrophone}
                    disabled={micStatus === 'testing' || speakerStatus === 'testing'}
                  >
                    测试
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content 
                    className="radix-tooltip-content"
                    sideOffset={5}
                  >
                    请说：上午好，下午好，晚上好
                    <Tooltip.Arrow className="radix-tooltip-arrow" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </div>
          </div>

          <div className="test-section">
            <h4 className="test-section-title">扬声器测试</h4>
            <div className="test-row">
              <div className="device-select-wrapper">
                <select 
                  className="device-select"
                  value={selectedSpeaker}
                  onChange={(e) => setSelectedSpeaker(e.target.value)}
                >
                  {speakerDevices.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || '默认扬声器'}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="select-icon" />
              </div>
              <div className={`test-status ${getStatusColor(speakerStatus)}`}>
                {getStatusIcon(speakerStatus)}
                {getStatusText(speakerStatus)}
              </div>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button 
                    className="test-button"
                    onClick={testSpeaker}
                    disabled={speakerStatus === 'testing' || micStatus === 'testing'}
                  >
                    测试
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content 
                    className="radix-tooltip-content"
                    sideOffset={5}
                  >
                    播放测试音频
                    <Tooltip.Arrow className="radix-tooltip-arrow" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </div>
          </div>

          {recognizedText && (
            <div className="recognition-result">
              <h5>识别结果：</h5>
              <div className="recognized-text">{recognizedText}</div>
            </div>
          )}

          {errorMessage && (
            <div className="error-message">
              <h5>错误信息：</h5>
              <div className="error-text">{errorMessage}</div>
            </div>
          )}
        </div>
      )}
      </div>
    </Tooltip.Provider>
  );
}
