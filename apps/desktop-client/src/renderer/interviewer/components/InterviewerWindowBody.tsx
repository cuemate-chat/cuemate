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

  // 分离扬声器和麦克风的识别结果存储
  const [micRecognitionResult, setMicRecognitionResult] = useState<{
    text: string;
    error: string;
    timestamp: number;
  }>({ text: '', error: '', timestamp: 0 });

  const [speakerRecognitionResult, setSpeakerRecognitionResult] = useState<{
    text: string;
    error: string;
    timestamp: number;
  }>({ text: '', error: '', timestamp: 0 });

  // 显示状态：用于控制点击状态时展示对应的历史结果
  const [showingMicResult, setShowingMicResult] = useState(false);
  const [showingSpeakerResult, setShowingSpeakerResult] = useState(false);

  // 在组件挂载时获取设备列表
  useEffect(() => {
    getDevices();
  }, []);

  // 监听选中状态变化，通知 control-bar 更新"提问 AI"按钮状态
  useEffect(() => {
    const isInterviewerModeSelected = selectedCard === "语音提问" || selectedCard === "模拟面试" || selectedCard === "面试训练";
    
    // 通知 control-bar 更新"提问 AI"按钮的禁用状态
    try {
      if ((window as any).electronAPI) {
        (window as any).electronAPI.setAskAIButtonDisabled(isInterviewerModeSelected);
      }
    } catch (error) {
      console.error('通知control-bar更新按钮状态失败:', error);
    }
  }, [selectedCard]);

  // 智能识别停止判断函数
  const shouldStopRecognition = (text: string, startTime: number): boolean => {
    // 如果计时还未开始，不进行停止判断
    if (startTime === 0) {
      return false;
    }

    const currentTime = Date.now();
    const elapsedSeconds = (currentTime - startTime) / 1000;
    const textLength = text.trim().length;

    // 策略1: 如果识别到5-30个字符，且停顿2秒，认为用户说完了
    if (textLength >= 5 && textLength <= 30 && elapsedSeconds >= 2) {
      return true;
    }

    // 策略2: 如果识别到超过30个字符，立即停止（防止过长）
    if (textLength > 30) {
      return true;
    }

    // 策略3: 如果超过15秒且有任何文字，停止识别
    if (elapsedSeconds > 15 && textLength > 0) {
      return true;
    }

    // 策略4: 硬超时 - 30秒无论如何都停止（从WebSocket连接成功开始计时）
    if (elapsedSeconds > 30) {
      return true;
    }

    return false;
  };

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

  // 麦克风测试 - 智能识别停止机制
  const testMicrophone = async () => {
    setMicStatus('testing');
    setShowingMicResult(true);
    setShowingSpeakerResult(false);

    // 清空麦克风识别结果，保留错误信息用于显示
    setMicRecognitionResult(prev => ({ text: '', error: prev.error, timestamp: Date.now() }));
    onStartTesting?.(); // 开始测试时通知父组件

    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let websocket: WebSocket | null = null;
    let testTimer: NodeJS.Timeout | null = null;
    let hasRecognitionResult = false;
    let recognitionStartTime = 0; // 初始化为0，在WebSocket连接成功后才开始计时
    let currentRecognizedText = '';

    const cleanup = () => {
      if (testTimer) {
        clearTimeout(testTimer);
        testTimer = null;
      }
      if (audioContext) {
        audioContext.close();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        // 发送结束信号 - 发送空的ArrayBuffer
        websocket.send(new ArrayBuffer(0));
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
      
      websocket.onopen = async () => {
        console.log('已连接到麦克风 ASR 服务');

        // WebSocket连接成功后才开始计时
        recognitionStartTime = Date.now();
        console.log('麦克风识别计时开始');

        // 3. 创建 AudioContext 和 AudioWorkletNode 来处理PCM音频
        if (stream) {
          audioContext = new AudioContext({ sampleRate: 16000 });
          const source = audioContext.createMediaStreamSource(stream);

          try {
            // 加载 AudioWorklet 处理器
            await audioContext.audioWorklet.addModule('/pcm-processor.js');

            // 创建 AudioWorkletNode
            const workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');

            // 监听来自 AudioWorklet 的消息
            workletNode.port.onmessage = (event) => {
              if (event.data.type === 'audiodata' && websocket && websocket.readyState === WebSocket.OPEN) {
                console.log(`发送PCM音频数据: ${event.data.data.byteLength} 字节`);
                websocket.send(event.data.data);
              }
            };

            // 连接音频节点 - 不连接到destination避免回音
            source.connect(workletNode);
            // workletNode.connect(audioContext.destination); // 移除这行避免回音

            console.log('音频处理管道已建立：麦克风 -> AudioContext -> AudioWorklet -> PCM转换 -> WebSocket');
          } catch (error) {
            console.error('AudioWorklet加载失败，降级使用ScriptProcessorNode:', error);

            // 降级到 ScriptProcessorNode (兼容性后备方案)
            const processor = audioContext.createScriptProcessor(4096, 1, 1);

            processor.onaudioprocess = (event) => {
              if (websocket && websocket.readyState === WebSocket.OPEN) {
                const inputBuffer = event.inputBuffer;
                const inputData = inputBuffer.getChannelData(0);

                // 转换为 s16le PCM 格式
                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                  pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
                }

                console.log(`发送PCM音频数据: ${pcmData.length} 采样点, ${pcmData.byteLength} 字节`);
                websocket.send(pcmData.buffer);
              }
            };

            // 连接音频节点 - 不连接到destination避免回音
            source.connect(processor);
            // processor.connect(audioContext.destination); // 移除这行避免回音

            console.log('音频处理管道已建立：麦克风 -> AudioContext -> ScriptProcessor(降级) -> PCM转换 -> WebSocket');
          }
        }
      };

      websocket.onmessage = (event) => {
        try {
          console.log('麦克风 - 收到WebSocket消息:', event.data);
          const data = JSON.parse(event.data);
          console.log('麦克风 - 解析后的数据:', JSON.stringify(data, null, 2));

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
            currentRecognizedText = transcriptionText.trim();

            // 更新麦克风识别结果
            setMicRecognitionResult({
              text: currentRecognizedText,
              error: '',
              timestamp: Date.now()
            });

            // 检查是否应该智能停止识别
            if (shouldStopRecognition(currentRecognizedText, recognitionStartTime)) {
              console.log('智能停止：识别到足够内容，停止麦克风测试');
              cleanup();
              setMicStatus('success');
              onStopTesting?.();
            }
          }
        } catch (error) {
          console.error('解析 ASR 响应失败:', error);
        }
      };

      websocket.onerror = (error) => {
        console.error('WebSocket 连接错误:', error);
        setMicStatus('failed');
        setMicRecognitionResult(prev => ({
          ...prev,
          error: '连接麦克风识别服务失败',
          timestamp: Date.now()
        }));
        cleanup();
      };
      
      websocket.onclose = () => {
        console.log('WebSocket 连接已关闭');
      };
      
      // 4. 设置总超时（包含连接时间）- 60秒
      testTimer = setTimeout(() => {
        cleanup();

        // 评估测试结果
        if (hasRecognitionResult) {
          setMicStatus('success');
        } else {
          setMicStatus('failed');
          setMicRecognitionResult(prev => ({
            ...prev,
            error: '连接或识别超时，请检查麦克风和 ASR 服务',
            timestamp: Date.now()
          }));
        }
        onStopTesting?.(); // 测试结束时通知父组件
      }, 60000); // 给连接预留30秒，识别30秒

    } catch (error: any) {
      console.error('麦克风测试失败:', error);
      setMicStatus('failed');

      let errorMsg = '';
      if (error.name === 'NotAllowedError') {
        errorMsg = '麦克风权限被拒绝，请在设置中允许麦克风访问';
      } else if (error.name === 'NotFoundError') {
        errorMsg = '未找到麦克风设备，请检查设备连接';
      } else {
        errorMsg = `麦克风测试失败：${error.message}`;
      }

      setMicRecognitionResult(prev => ({
        ...prev,
        error: errorMsg,
        timestamp: Date.now()
      }));

      cleanup();
      onStopTesting?.(); // 错误情况下也通知父组件测试结束
    }
  };

  // 扬声器测试 - 智能识别停止机制
  const testSpeaker = async () => {
    setSpeakerStatus('testing');
    setShowingSpeakerResult(true);
    setShowingMicResult(false);

    // 清空扬声器识别结果，保留错误信息用于显示
    setSpeakerRecognitionResult(prev => ({ text: '', error: prev.error, timestamp: Date.now() }));
    onStartTesting?.(); // 开始测试时通知父组件

    let websocket: WebSocket | null = null;
    let testTimer: NodeJS.Timeout | null = null;
    let hasRecognitionResult = false;
    let audioDataListener: any = null;
    let recognitionStartTime = 0; // 初始化为0，在WebSocket连接成功后才开始计时
    let currentRecognizedText = '';

    const cleanup = async () => {
      if (testTimer) {
        clearTimeout(testTimer);
        testTimer = null;
      }
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        // 发送结束信号 - 发送空的ArrayBuffer
        websocket.send(new ArrayBuffer(0));
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
        setSpeakerRecognitionResult(prev => ({
          ...prev,
          error: '音频测试服务不可用',
          timestamp: Date.now()
        }));
        return;
      }
      console.log('electronAPI' + '：' + JSON.stringify(electronAPI));
      // 1. 连接到扬声器 ASR 服务
      websocket = new WebSocket('ws://localhost:8002/asr');

      websocket.onopen = async () => {
        console.log('已连接到扬声器 ASR 服务');

        // WebSocket连接成功后才开始计时
        recognitionStartTime = Date.now();
        console.log('扬声器识别计时开始');

        // 2. 启动原生扬声器音频捕获
        console.log('准备启动扬声器捕获，设备ID:', selectedSpeaker);
        console.log('electronAPI.audioTest对象:', electronAPI.audioTest);
        console.log('electronAPI.audioTest.startSpeakerTest方法:', typeof electronAPI.audioTest.startSpeakerTest);
        
        const result = await electronAPI.audioTest.startSpeakerTest({ deviceId: selectedSpeaker });
        console.log('扬声器捕获启动结果:', result);
        if (!result.success) {
          console.error('扬声器捕获启动失败:', result.error);
          setSpeakerStatus('failed');
          setSpeakerRecognitionResult(prev => ({
            ...prev,
            error: result.error || '启动扬声器捕获失败',
            timestamp: Date.now()
          }));
          cleanup();
          return;
        }
        console.log('扬声器捕获启动成功');
        
        // 3. 监听原生模块发送的音频数据
        console.log('设置音频数据监听器...');
        audioDataListener = (audioData: ArrayBuffer) => {
          console.log('收到扬声器音频数据，大小:', audioData.byteLength, 'bytes');
          if (websocket && websocket.readyState === WebSocket.OPEN && audioData.byteLength > 0) {
            // 发送原始 PCM 数据，ASR 服务会处理格式转换
            websocket.send(audioData);
            console.log('已发送PCM音频数据到ASR服务');
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
            currentRecognizedText = transcriptionText.trim();

            // 更新扬声器识别结果
            setSpeakerRecognitionResult({
              text: currentRecognizedText,
              error: '',
              timestamp: Date.now()
            });

            // 检查是否应该智能停止识别
            if (shouldStopRecognition(currentRecognizedText, recognitionStartTime)) {
              console.log('智能停止：识别到足够内容，停止扬声器测试');
              cleanup();
              setSpeakerStatus('success');
              onStopTesting?.();
            }
          }
        } catch (error) {
          console.error('解析 ASR 响应失败:', error);
        }
      };

      websocket.onerror = (error) => {
        console.error('WebSocket 连接错误:', error);
        setSpeakerStatus('failed');
        setSpeakerRecognitionResult(prev => ({
          ...prev,
          error: '连接扬声器识别服务失败',
          timestamp: Date.now()
        }));
        cleanup();
      };
      
      websocket.onclose = () => {
        console.log('扬声器 WebSocket 连接已关闭');
      };
      
      // 4. 设置60秒超时（包括连接时间）
      testTimer = setTimeout(async () => {
        await cleanup();

        // 评估测试结果
        if (hasRecognitionResult) {
          setSpeakerStatus('success');
        } else {
          setSpeakerStatus('failed');
          setSpeakerRecognitionResult(prev => ({
            ...prev,
            error: '60秒内未收到任何识别结果，请检查扬声器播放内容和 ASR 服务',
            timestamp: Date.now()
          }));
        }
        onStopTesting?.(); // 测试结束时通知父组件
      }, 60000);

    } catch (error: any) {
      console.error('扬声器测试失败:', error);
      setSpeakerStatus('failed');

      let errorMsg = '';
      if (error.name === 'SecurityError') {
        errorMsg = '安全权限错误，请确保已授予屏幕录制权限';
      } else {
        errorMsg = `扬声器测试失败：${error.message}`;
      }

      setSpeakerRecognitionResult(prev => ({
        ...prev,
        error: errorMsg,
        timestamp: Date.now()
      }));

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

  const handleCardClick = async (cardTitle: string) => {
    const newSelectedCard = cardTitle === selectedCard ? null : cardTitle;
    setSelectedCard(newSelectedCard);
    
    if (cardTitle === "语音测试") {
      getDevices();
    } else if (cardTitle === "语音提问") {
      if (newSelectedCard === "语音提问") {
        // 选中状态：切换到 voice-qa 模式并显示 AI 问题窗口
        try {
          if ((window as any).electronAPI) {
            await (window as any).electronAPI.switchToMode('voice-qa');
            await (window as any).electronAPI.showAIQuestion();
          }
        } catch (error) {
          console.error('切换到语音提问模式失败:', error);
        }
      } else {
        // 取消选中状态：隐藏 AI 问题窗口
        try {
          if ((window as any).electronAPI) {
            await (window as any).electronAPI.hideAIQuestion();
          }
        } catch (error) {
          console.error('隐藏AI问题窗口失败:', error);
        }
      }
    } else if (cardTitle === "模拟面试") {
      if (newSelectedCard === "模拟面试") {
        // 选中状态：切换到 mock-interview 模式并显示 AI 问题窗口
        try {
          if ((window as any).electronAPI) {
            await (window as any).electronAPI.switchToMode('mock-interview');
            await (window as any).electronAPI.showAIQuestion();
          }
        } catch (error) {
          console.error('切换到模拟面试模式失败:', error);
        }
      } else {
        // 取消选中状态：隐藏 AI 问题窗口
        try {
          if ((window as any).electronAPI) {
            await (window as any).electronAPI.hideAIQuestion();
          }
        } catch (error) {
          console.error('隐藏AI问题窗口失败:', error);
        }
      }
    } else if (cardTitle === "面试训练") {
      if (newSelectedCard === "面试训练") {
        // 选中状态：切换到 interview-training 模式并显示 AI 问题窗口
        try {
          if ((window as any).electronAPI) {
            await (window as any).electronAPI.switchToMode('interview-training');
            await (window as any).electronAPI.showAIQuestion();
          }
        } catch (error) {
          console.error('切换到面试训练模式失败:', error);
        }
      } else {
        // 取消选中状态：隐藏 AI 问题窗口
        try {
          if ((window as any).electronAPI) {
            await (window as any).electronAPI.hideAIQuestion();
          }
        } catch (error) {
          console.error('隐藏AI问题窗口失败:', error);
        }
      }
    }
  };

  // 处理状态点击 - 显示对应的历史结果
  const handleStatusClick = (device: 'mic' | 'speaker') => {
    if (device === 'mic') {
      setShowingMicResult(true);
      setShowingSpeakerResult(false);
    } else {
      setShowingSpeakerResult(true);
      setShowingMicResult(false);
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
                <IconComponent size={20} />
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
              <div
                className={`test-status ${getStatusColor(micStatus)}`}
                onClick={() => handleStatusClick('mic')}
                style={{ cursor: 'pointer' }}
                title="点击查看麦克风识别结果"
              >
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
              <div
                className={`test-status ${getStatusColor(speakerStatus)}`}
                onClick={() => handleStatusClick('speaker')}
                style={{ cursor: 'pointer' }}
                title="点击查看扬声器识别结果"
              >
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

          {/* 分离显示麦克风和扬声器的识别结果 */}
          {showingMicResult && (micRecognitionResult.text || micRecognitionResult.error) && (
            <div className="recognition-result">
              <h5>麦克风识别结果：</h5>
              {micRecognitionResult.text && (
                <div className="recognized-text">{micRecognitionResult.text}</div>
              )}
              {micRecognitionResult.error && (
                <div className="error-text" style={{ color: '#ff6b6b', marginTop: '8px' }}>
                  {micRecognitionResult.error}
                </div>
              )}
              {micRecognitionResult.timestamp > 0 && (
                <div className="timestamp" style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                  {new Date(micRecognitionResult.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          )}

          {showingSpeakerResult && (speakerRecognitionResult.text || speakerRecognitionResult.error) && (
            <div className="recognition-result">
              <h5>扬声器识别结果：</h5>
              {speakerRecognitionResult.text && (
                <div className="recognized-text">{speakerRecognitionResult.text}</div>
              )}
              {speakerRecognitionResult.error && (
                <div className="error-text" style={{ color: '#ff6b6b', marginTop: '8px' }}>
                  {speakerRecognitionResult.error}
                </div>
              )}
              {speakerRecognitionResult.timestamp > 0 && (
                <div className="timestamp" style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                  {new Date(speakerRecognitionResult.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      </div>
    </Tooltip.Provider>
  );
}
