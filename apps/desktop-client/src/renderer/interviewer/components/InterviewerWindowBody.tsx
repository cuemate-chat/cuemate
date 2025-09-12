import * as Tooltip from '@radix-ui/react-tooltip';
import { CheckCircle, ChevronDown, Clock, GraduationCap, Loader2, MessageSquare, Mic, Users, XCircle } from 'lucide-react';
import { useState } from 'react';

interface InterviewerWindowBodyProps {}

export function InterviewerWindowBody({}: InterviewerWindowBodyProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [speakerDevices, setSpeakerDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('');
  const [micStatus, setMicStatus] = useState<'untested' | 'testing' | 'success' | 'failed'>('untested');
  const [speakerStatus, setSpeakerStatus] = useState<'untested' | 'testing' | 'success' | 'failed'>('untested');
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

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

  // 麦克风测试 - 使用本地语音识别
  const testMicrophone = async () => {
    setMicStatus('testing');
    setRecognizedText('');
    setErrorMessage('');
    
    try {
      // 检查本地语音识别是否可用
      const electronAPI = (window as any).electronInterviewerAPI;
      if (!electronAPI || !electronAPI.speechRecognition) {
        throw new Error('本地语音识别服务不可用');
      }
      
      // 检查语音识别是否可用
      const isAvailable = await electronAPI.speechRecognition.isAvailable();
      if (!isAvailable) {
        throw new Error('macOS 语音识别服务不可用，请检查系统设置');
      }
      
      // 请求语音识别权限
      const permission = await electronAPI.speechRecognition.requestPermission();
      throw new Error(JSON.stringify(permission));
      if (!permission.authorized) {
        throw new Error(`语音识别权限被拒绝，状态: ${permission.status}`);
      }
      
      // 监听语音识别结果
      const handleRecognitionResult = (result: any) => {
        console.log('语音识别结果:', result);
        if (result.success) {
          if (result.text) {
            setRecognizedText(result.text);
            setMicStatus('success');
          }
        } else {
          throw new Error(result.error || '语音识别失败');
        }
      };
      
      // 添加事件监听器
      electronAPI.on('speech-recognition-result', handleRecognitionResult);
      
      // 开始语音识别
      const startResult = await electronAPI.speechRecognition.startRecognition();
      if (startResult && !startResult.success) {
        throw new Error(startResult.error || '启动语音识别失败');
      }
      
      // 10秒后自动停止
      setTimeout(async () => {
        try {
          await electronAPI.speechRecognition.stopRecognition();
          electronAPI.off('speech-recognition-result', handleRecognitionResult);
          
          if (recognizedText === '') {
            setMicStatus('failed');
            setErrorMessage('未识别到语音内容，请确保麦克风正常工作并清晰说话');
          }
        } catch (error: any) {
          console.error('停止语音识别失败:', error);
        }
      }, 10000);
      
    } catch (error: any) {
      console.error('麦克风测试失败:', error);
      setMicStatus('failed');
      setErrorMessage(`麦克风测试失败：${error.message}`);
    }
  };

  // 扬声器测试 - 使用真实音频捕获验证
  const testSpeaker = async () => {
    setSpeakerStatus('testing');
    setRecognizedText('');
    setErrorMessage('');
    
    try {
      const electronAPI = (window as any).electronInterviewerAPI;
      if (!electronAPI || !electronAPI.systemAudioCapture) {
        throw new Error('系统音频捕获服务不可用');
      }
      
      // 检查系统音频捕获是否可用
      const isAvailable = await electronAPI.systemAudioCapture.isAvailable();
      if (!isAvailable) {
        throw new Error('系统音频捕获不可用，请检查权限设置');
      }
      
      let audioDetected = false;
      let audioData: number[] = [];
      
      // 监听系统音频数据
      const handleAudioData = (buffer: ArrayBuffer) => {
        // 将 ArrayBuffer 转换为 Float32Array
        const floatArray = new Float32Array(buffer);
        
        // 计算音频能量级别
        let energy = 0;
        for (let i = 0; i < floatArray.length; i++) {
          energy += Math.abs(floatArray[i]);
        }
        energy = energy / floatArray.length;
        
        // 记录能量级别
        audioData.push(energy);
        
        // 如果能量级别超过阈值，认为检测到音频
        if (energy > 0.01) {
          audioDetected = true;
        }
      };
      
      // 监听音频捕获错误
      const handleAudioError = (errorMessage: string) => {
        console.error('系统音频捕获错误:', errorMessage);
        setSpeakerStatus('failed');
        setErrorMessage(`音频捕获失败：${errorMessage}`);
      };
      
      // 添加事件监听器
      electronAPI.on('system-audio-data', handleAudioData);
      electronAPI.on('system-audio-error', handleAudioError);
      
      // 开始音频捕获
      const captureResult = await electronAPI.systemAudioCapture.startCapture({
        sampleRate: 16000,
        channels: 1
      });
      
      if (!captureResult.success) {
        throw new Error(captureResult.error || '启动音频捕获失败');
      }
      
      // 等待一小段时间确保捕获已经开始
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 创建音频上下文并播放测试音频
      const audioContext = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
      
      // 生成测试音频 (1000Hz 正弦波，持续2秒)
      const sampleRate = audioContext.sampleRate;
      const duration = 2;
      const frequency = 1000;
      const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
      const channelData = buffer.getChannelData(0);
      
      for (let i = 0; i < buffer.length; i++) {
        channelData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
      }
      
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      
      // 尝试设置输出设备（如果支持）
      if ((audioContext as any).setSinkId && selectedSpeaker) {
        try {
          await (audioContext as any).setSinkId(selectedSpeaker);
        } catch (err) {
          console.warn('无法设置输出设备:', err);
        }
      }
      
      source.connect(audioContext.destination);
      
      // 播放完成后检查是否捕获到音频
      source.onended = async () => {
        // 等待一点时间让音频数据处理完
        setTimeout(async () => {
          try {
            // 停止音频捕获
            await electronAPI.systemAudioCapture.stopCapture();
            
            // 移除事件监听器
            electronAPI.off('system-audio-data', handleAudioData);
            electronAPI.off('system-audio-error', handleAudioError);
            
            // 关闭音频上下文
            audioContext.close();
            
            // 检查是否检测到音频
            if (audioDetected) {
              setSpeakerStatus('success');
              const maxEnergy = Math.max(...audioData);
              const avgEnergy = audioData.reduce((a, b) => a + b, 0) / audioData.length;
              setRecognizedText(`扬声器测试成功！检测到音频输出（平均能量：${avgEnergy.toFixed(4)}，峰值：${maxEnergy.toFixed(4)}）`);
            } else {
              setSpeakerStatus('failed');
              setErrorMessage('扬声器测试失败：未检测到音频输出，请检查扬声器连接和音量设置');
            }
          } catch (error: any) {
            setSpeakerStatus('failed');
            setErrorMessage(`扬声器测试后处理失败：${error.message}`);
          }
        }, 500);
      };
      
      // 开始播放测试音频
      source.start();
      
    } catch (error: any) {
      console.error('扬声器测试失败:', error);
      setSpeakerStatus('failed');
      setErrorMessage(`扬声器测试失败：${error.message}`);
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
                    disabled={micStatus === 'testing'}
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
                    disabled={speakerStatus === 'testing'}
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
