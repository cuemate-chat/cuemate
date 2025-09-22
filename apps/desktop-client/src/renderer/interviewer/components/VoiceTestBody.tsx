import * as Tooltip from '@radix-ui/react-tooltip';
import { CheckCircle, ChevronDown, Clock, Loader2, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { MicrophoneRecognitionController, startMicrophoneRecognition } from '../../../utils/audioRecognition';
import { setVoiceState } from '../../../utils/voiceState';

interface RecognitionResult {
  text: string;
  error: string;
  timestamp: number;
}


export function VoiceTestBody() {
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [speakerDevices, setSpeakerDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('');
  const [micStatus, setMicStatus] = useState<'untested' | 'testing' | 'success' | 'failed'>('untested');
  const [speakerStatus, setSpeakerStatus] = useState<'untested' | 'testing' | 'success' | 'failed'>('untested');
  const [showingMicResult, setShowingMicResult] = useState(false);
  const [showingSpeakerResult, setShowingSpeakerResult] = useState(false);
  const [micRecognitionResult, setMicRecognitionResult] = useState<RecognitionResult>({ text: '', error: '', timestamp: 0 });
  const [speakerRecognitionResult, setSpeakerRecognitionResult] = useState<RecognitionResult>({ text: '', error: '', timestamp: 0 });
  const micControllerRef = useRef<MicrophoneRecognitionController | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter(d => d.kind === 'audioinput');
        const speakers = devices.filter(d => d.kind === 'audiooutput');
        setMicDevices(mics);
        setSpeakerDevices(speakers);
        if (mics.length > 0) setSelectedMic(mics[0].deviceId);
        if (speakers.length > 0) setSelectedSpeaker(speakers[0].deviceId);
      } catch (e) {
        console.error('获取设备失败:', e);
      }
    })();
  }, []);

  const shouldStopRecognition = (text: string, startTime: number): boolean => {
    if (startTime === 0) return false;
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    const textLength = text.trim().length;
    if (textLength >= 5 && textLength <= 30 && elapsedSeconds >= 2) return true;
    if (textLength > 30) return true;
    if (elapsedSeconds > 15 && textLength > 0) return true;
    if (elapsedSeconds > 30) return true;
    return false;
  };

  const onStatusClick = (device: 'mic' | 'speaker') => {
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

  const testMicrophone = async () => {
    setMicStatus('testing');
    setShowingMicResult(true);
    setMicRecognitionResult(prev => ({ text: '', error: prev.error, timestamp: Date.now() }));
    setVoiceState({ mode: 'voice-test', subState: 'recording' });

    let testTimer: NodeJS.Timeout | null = null;
    let hasRecognitionResult = false;
    let recognitionStartTime = 0;
    let currentRecognizedText = '';

    const cleanup = async () => {
      if (testTimer) { clearTimeout(testTimer); testTimer = null; }
      try { await micControllerRef.current?.stop(); } catch {}
      micControllerRef.current = null;
      setVoiceState({ mode: 'none', subState: 'idle' });
    };

    try {
      const controller = await startMicrophoneRecognition({
        deviceId: selectedMic || undefined,
        onOpen: () => { recognitionStartTime = Date.now(); },
        onText: (text) => {
          hasRecognitionResult = true;
          currentRecognizedText = text.trim();
          setMicRecognitionResult({ text: currentRecognizedText, error: '', timestamp: Date.now() });
          if (shouldStopRecognition(currentRecognizedText, recognitionStartTime)) {
            cleanup().finally(() => setMicStatus('success'));
          }
        },
        onError: () => {
          setMicStatus('failed');
          setMicRecognitionResult(prev => ({ ...prev, error: '连接麦克风识别服务失败', timestamp: Date.now() }));
          void cleanup();
        },
      });
      micControllerRef.current = controller;

      testTimer = setTimeout(() => {
        cleanup().finally(() => {
          if (hasRecognitionResult) setMicStatus('success');
          else {
            setMicStatus('failed');
            setMicRecognitionResult(prev => ({ ...prev, error: '连接或识别超时，请检查麦克风和 ASR 服务', timestamp: Date.now() }));
          }
        });
      }, 60000);
    } catch (error: any) {
      setMicStatus('failed');
      let errorMsg = '';
      if (error?.name === 'NotAllowedError') errorMsg = '麦克风权限被拒绝，请在设置中允许麦克风访问';
      else if (error?.name === 'NotFoundError') errorMsg = '未找到麦克风设备，请检查设备连接';
      else errorMsg = `麦克风测试失败：${error?.message}`;
      setMicRecognitionResult(prev => ({ ...prev, error: errorMsg, timestamp: Date.now() }));
      await cleanup();
    }
  };

  const testSpeaker = async () => {
    setSpeakerStatus('testing');
    setShowingSpeakerResult(true);
    setSpeakerRecognitionResult(prev => ({ text: '', error: prev.error, timestamp: Date.now() }));
    setVoiceState({ mode: 'voice-test', subState: 'recording' });

    let websocket: WebSocket | null = null;
    let testTimer: NodeJS.Timeout | null = null;
    let hasRecognitionResult = false;
    let recognitionStartTime = 0;
    let currentRecognizedText = '';
    let audioDataListener: any = null;
    let audioContext: AudioContext | null = null;
    let speakerWorkletNode: AudioWorkletNode | null = null;

    const cleanup = async () => {
      if (testTimer) { clearTimeout(testTimer); testTimer = null; }
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        // 发送结束信号
        websocket.send(JSON.stringify({ is_speaking: false }));
        setTimeout(() => websocket?.close(), 500);
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
      const electronAPI = (window as any).electronInterviewerAPI;
      if (audioDataListener) electronAPI?.off('speaker-audio-data', audioDataListener);
      electronAPI?.audioTest?.stopTest();
      setVoiceState({ mode: 'none', subState: 'idle' });
    };

    try {
      const electronAPI = (window as any).electronInterviewerAPI;
      if (!electronAPI || !electronAPI.audioTest) {
        setSpeakerStatus('failed');
        setSpeakerRecognitionResult(prev => ({ ...prev, error: '音频测试服务不可用', timestamp: Date.now() }));
        return;
      }

      websocket = new WebSocket('ws://localhost:10095');

      websocket.onopen = async () => {
        console.log('扬声器测试 WebSocket 连接已建立');
        recognitionStartTime = Date.now();
        // 发送 FunASR 配置参数
        const config = {
          chunk_size: [5, 10, 5],
          chunk_interval: 5,
          wav_name: "speaker",
          is_speaking: true,
          mode: "online"
        };
        console.log('扬声器测试发送配置:', JSON.stringify(config));
        if (websocket) websocket.send(JSON.stringify(config));

        // 初始化 AudioContext 和 WorkletNode
        audioContext = new AudioContext({ sampleRate: 16000 });
        try {
          await audioContext.audioWorklet.addModule('/speaker-pcm-processor.js');
          speakerWorkletNode = new AudioWorkletNode(audioContext, 'speaker-pcm-processor');

          // 监听来自 WorkletNode 的处理后音频数据
          speakerWorkletNode.port.onmessage = (event) => {
            if (event.data.type === 'audiodata' && websocket && websocket.readyState === WebSocket.OPEN) {
              websocket.send(event.data.data);
            }
          };
        } catch (err) {
          console.error('扬声器 AudioWorklet 初始化失败:', err);
          setSpeakerStatus('failed');
          setSpeakerRecognitionResult(prev => ({ ...prev, error: 'AudioWorklet 初始化失败', timestamp: Date.now() }));
          cleanup();
          return;
        }

        const result = await electronAPI.audioTest.startSpeakerTest({ deviceId: selectedSpeaker });

        if (!result.success) {
          setSpeakerStatus('failed');
          setSpeakerRecognitionResult(prev => ({ ...prev, error: result.error || '启动扬声器捕获失败', timestamp: Date.now() }));
          cleanup();
          return;
        }

        // 接收原生音频数据并转发给 WorkletNode 处理
        audioDataListener = (audioData: ArrayBuffer) => {
          if (speakerWorkletNode && audioData.byteLength > 0) {
            speakerWorkletNode.port.postMessage({
              type: 'nativeAudioData',
              audioData: audioData
            });
          }
        };
        electronAPI.on('speaker-audio-data', audioDataListener);
      };

      websocket.onmessage = (event) => {
        console.log('扬声器测试收到 WebSocket 消息:', event.data);
        try {
          const data = JSON.parse(event.data);

          // FunASR 返回格式: { mode: "online", text: "识别结果", wav_name: "speaker", is_final: false }
          if (data.text && data.text.trim()) {
            hasRecognitionResult = true;
            // 扬声器测试累积显示识别结果
            const newText = data.text.trim();
            if (!currentRecognizedText.includes(newText)) {
              currentRecognizedText += (currentRecognizedText ? ' ' : '') + newText;
            }
            console.log('扬声器测试识别结果:', currentRecognizedText);
            setSpeakerRecognitionResult({ text: currentRecognizedText, error: '', timestamp: Date.now() });

            if (shouldStopRecognition(currentRecognizedText, recognitionStartTime)) {
              cleanup();
              setSpeakerStatus('success');
            }
          }
        } catch (err) {
          console.error('解析 FunASR 消息失败:', err, event.data);
        }
      };

      websocket.onerror = () => {
        setSpeakerStatus('failed');
        setSpeakerRecognitionResult(prev => ({ ...prev, error: '连接扬声器识别服务失败', timestamp: Date.now() }));
        cleanup();
      };

      websocket.onclose = (_event) => {};

      testTimer = setTimeout(async () => {
        await cleanup();
        if (hasRecognitionResult) setSpeakerStatus('success');
        else {
          setSpeakerStatus('failed');
          setSpeakerRecognitionResult(prev => ({ ...prev, error: '60秒内未收到任何识别结果，请检查扬声器播放内容和 ASR 服务', timestamp: Date.now() }));
        }
      }, 60000);
    } catch (error: any) {
      setSpeakerStatus('failed');
      const errorMsg = error?.name === 'SecurityError' ? '安全权限错误，请确保已授予屏幕录制权限' : `扬声器测试失败：${error?.message}`;
      setSpeakerRecognitionResult(prev => ({ ...prev, error: errorMsg, timestamp: Date.now() }));
      await cleanup();
    }
  };

  return (
    <div className="voice-test-panel">
      <div className="test-section">
        <h4 className="test-section-title">麦克风测试</h4>
        <div className="test-row">
          <div className="device-select-wrapper">
            <select className="device-select" value={selectedMic} onChange={(e) => setSelectedMic(e.target.value)}>
              {micDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>{device.label || '默认麦克风'}</option>
              ))}
            </select>
            <ChevronDown size={14} className="select-icon" />
          </div>
          <div className={`test-status ${getStatusColor(micStatus)}`} onClick={() => onStatusClick('mic')} style={{ cursor: 'pointer' }} title="点击查看麦克风识别结果">
            {getStatusIcon(micStatus)}
            {getStatusText(micStatus)}
          </div>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button className="test-button" onClick={testMicrophone} disabled={micStatus === 'testing'}>
                测试
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="radix-tooltip-content" sideOffset={5}>
                请输入：上午好，下午好，晚上好
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
            <select className="device-select" value={selectedSpeaker} onChange={(e) => setSelectedSpeaker(e.target.value)}>
              {speakerDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>{device.label || '默认扬声器'}</option>
              ))}
            </select>
            <ChevronDown size={14} className="select-icon" />
          </div>
          <div className={`test-status ${getStatusColor(speakerStatus)}`} onClick={() => onStatusClick('speaker')} style={{ cursor: 'pointer' }} title="点击查看扬声器识别结果">
            {getStatusIcon(speakerStatus)}
            {getStatusText(speakerStatus)}
          </div>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button className="test-button" onClick={testSpeaker} disabled={speakerStatus === 'testing'}>
                测试
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="radix-tooltip-content" sideOffset={5}>
                请播放测试音频
                <Tooltip.Arrow className="radix-tooltip-arrow" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>
      </div>

      {showingMicResult && (micRecognitionResult.text || micRecognitionResult.error) && (
        <div className="recognition-result">
          <h5>麦克风识别结果：</h5>
          {micRecognitionResult.text && (<div className="recognized-text">{micRecognitionResult.text}</div>)}
          {micRecognitionResult.error && (<div className="error-text" style={{ color: '#ff6b6b', marginTop: '8px' }}>{micRecognitionResult.error}</div>)}
          {micRecognitionResult.timestamp > 0 && (<div className="timestamp" style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{new Date(micRecognitionResult.timestamp).toLocaleTimeString()}</div>)}
        </div>
      )}

      {showingSpeakerResult && (speakerRecognitionResult.text || speakerRecognitionResult.error) && (
        <div className="recognition-result">
          <h5>扬声器识别结果：</h5>
          {speakerRecognitionResult.text && (<div className="recognized-text">{speakerRecognitionResult.text}</div>)}
          {speakerRecognitionResult.error && (<div className="error-text" style={{ color: '#ff6b6b', marginTop: '8px' }}>{speakerRecognitionResult.error}</div>)}
          {speakerRecognitionResult.timestamp > 0 && (<div className="timestamp" style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{new Date(speakerRecognitionResult.timestamp).toLocaleTimeString()}</div>)}
        </div>
      )}
    </div>
  );
}



