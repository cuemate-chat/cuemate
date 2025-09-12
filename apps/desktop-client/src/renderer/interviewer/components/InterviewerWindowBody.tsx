import { ChevronDown, GraduationCap, Loader2, MessageSquare, Mic, Users } from 'lucide-react';
import { useState } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';

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

  // 麦克风测试
  const testMicrophone = async () => {
    setMicStatus('testing');
    setRecognizedText('');
    setErrorMessage('');
    
    try {
      // 请求麦克风权限并开始录音
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: selectedMic ? { exact: selectedMic } : undefined }
      });
      
      // 检查是否支持语音识别
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error('浏览器不支持语音识别功能');
      }
      
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.continuous = false;
      recognition.interimResults = false;
      
      recognition.onresult = (event: any) => {
        const result = event.results[0][0].transcript;
        setRecognizedText(result);
        setMicStatus('success');
      };
      
      recognition.onerror = (event: any) => {
        throw new Error(`语音识别错误: ${event.error}`);
      };
      
      recognition.onend = () => {
        stream.getTracks().forEach(track => track.stop());
      };
      
      recognition.start();
      
      // 10秒后自动停止
      setTimeout(() => {
        recognition.stop();
        if (recognizedText === '') {
          setMicStatus('failed');
          setErrorMessage('未识别到语音内容，请确保麦克风正常工作并说话');
        }
      }, 10000);
      
    } catch (error: any) {
      setMicStatus('failed');
      setErrorMessage(`麦克风测试失败：${error.message}`);
    }
  };

  // 扬声器测试
  const testSpeaker = async () => {
    setSpeakerStatus('testing');
    setRecognizedText('');
    setErrorMessage('');
    
    try {
      // 创建音频上下文
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
      
      source.onended = () => {
        setSpeakerStatus('success');
        setRecognizedText('扬声器音频输出正常');
        audioContext.close();
      };
      
      source.start();
      
    } catch (error: any) {
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
      case 'untested': return '未测试';
      case 'testing': return '正在测试';
      case 'success': return '测试成功';
      case 'failed': return '测试失败';
      default: return '未测试';
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
                {micStatus === 'testing' && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', marginRight: '4px' }} />}
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
                {speakerStatus === 'testing' && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', marginRight: '4px' }} />}
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
