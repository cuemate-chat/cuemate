import * as Tooltip from '@radix-ui/react-tooltip';
import { CheckCircle, ChevronDown, Clock, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

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
    setShowingSpeakerResult(false);
    setMicRecognitionResult(prev => ({ text: '', error: prev.error, timestamp: Date.now() }));

    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let websocket: WebSocket | null = null;
    let testTimer: NodeJS.Timeout | null = null;
    let hasRecognitionResult = false;
    let recognitionStartTime = 0;
    let currentRecognizedText = '';

    const cleanup = () => {
      if (testTimer) { clearTimeout(testTimer); testTimer = null; }
      if (audioContext) { audioContext.close(); }
      if (stream) { stream.getTracks().forEach(t => t.stop()); }
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(new ArrayBuffer(0));
        setTimeout(() => websocket?.close(), 500);
      }
    };

    try {
      const constraints: MediaStreamConstraints = { audio: selectedMic ? { deviceId: { exact: selectedMic } } : true };
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      websocket = new WebSocket('ws://localhost:8001/asr');

      websocket.onopen = async () => {
        recognitionStartTime = Date.now();
        if (stream) {
          audioContext = new AudioContext({ sampleRate: 16000 });
          const source = audioContext.createMediaStreamSource(stream);
          try {
            await audioContext.audioWorklet.addModule('/pcm-processor.js');
            const workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
            workletNode.port.onmessage = (event) => {
              if (event.data.type === 'audiodata' && websocket && websocket.readyState === WebSocket.OPEN) {
                websocket.send(event.data.data);
              }
            };
            source.connect(workletNode);
          } catch (err) {
            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (event) => {
              if (websocket && websocket.readyState === WebSocket.OPEN) {
                const inputData = event.inputBuffer.getChannelData(0);
                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                  pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
                }
                websocket.send(pcmData.buffer);
              }
            };
            source.connect(processor);
          }
        }
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ready_to_stop') return;
          let transcriptionText = '';
          if (data.lines && data.lines.length > 0) {
            transcriptionText = data.lines.filter((l: any) => l.speaker !== -2).map((l: any) => l.text || '').join(' ');
          }
          if (data.buffer_transcription) transcriptionText += ' ' + data.buffer_transcription;
          if (transcriptionText.trim()) {
            hasRecognitionResult = true;
            currentRecognizedText = transcriptionText.trim();
            setMicRecognitionResult({ text: currentRecognizedText, error: '', timestamp: Date.now() });
            if (shouldStopRecognition(currentRecognizedText, recognitionStartTime)) {
              cleanup();
              setMicStatus('success');
            }
          }
        } catch {}
      };

      websocket.onerror = () => {
        setMicStatus('failed');
        setMicRecognitionResult(prev => ({ ...prev, error: '连接麦克风识别服务失败', timestamp: Date.now() }));
        cleanup();
      };

      websocket.onclose = () => {};

      testTimer = setTimeout(() => {
        cleanup();
        if (hasRecognitionResult) setMicStatus('success');
        else {
          setMicStatus('failed');
          setMicRecognitionResult(prev => ({ ...prev, error: '连接或识别超时，请检查麦克风和 ASR 服务', timestamp: Date.now() }));
        }
      }, 60000);
    } catch (error: any) {
      setMicStatus('failed');
      let errorMsg = '';
      if (error?.name === 'NotAllowedError') errorMsg = '麦克风权限被拒绝，请在设置中允许麦克风访问';
      else if (error?.name === 'NotFoundError') errorMsg = '未找到麦克风设备，请检查设备连接';
      else errorMsg = `麦克风测试失败：${error?.message}`;
      setMicRecognitionResult(prev => ({ ...prev, error: errorMsg, timestamp: Date.now() }));
    }
  };

  const testSpeaker = async () => {
    setSpeakerStatus('testing');
    setShowingSpeakerResult(true);
    setShowingMicResult(false);
    setSpeakerRecognitionResult(prev => ({ text: '', error: prev.error, timestamp: Date.now() }));

    let websocket: WebSocket | null = null;
    let testTimer: NodeJS.Timeout | null = null;
    let hasRecognitionResult = false;
    let recognitionStartTime = 0;
    let currentRecognizedText = '';
    let audioDataListener: any = null;

    const cleanup = async () => {
      if (testTimer) { clearTimeout(testTimer); testTimer = null; }
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(new ArrayBuffer(0));
        setTimeout(() => websocket?.close(), 500);
      }
      const electronAPI = (window as any).electronInterviewerAPI;
      if (audioDataListener) electronAPI?.off('speaker-audio-data', audioDataListener);
      electronAPI?.audioTest?.stopTest();
    };

    try {
      const electronAPI = (window as any).electronInterviewerAPI;
      if (!electronAPI || !electronAPI.audioTest) {
        setSpeakerStatus('failed');
        setSpeakerRecognitionResult(prev => ({ ...prev, error: '音频测试服务不可用', timestamp: Date.now() }));
        return;
      }

      websocket = new WebSocket('ws://localhost:8002/asr');
      websocket.onopen = async () => {
        recognitionStartTime = Date.now();
        const result = await electronAPI.audioTest.startSpeakerTest({ deviceId: selectedSpeaker });
        if (!result.success) {
          setSpeakerStatus('failed');
          setSpeakerRecognitionResult(prev => ({ ...prev, error: result.error || '启动扬声器捕获失败', timestamp: Date.now() }));
          cleanup();
          return;
        }
        audioDataListener = (audioData: ArrayBuffer) => {
          if (websocket && websocket.readyState === WebSocket.OPEN && audioData.byteLength > 0) {
            websocket.send(audioData);
          }
        };
        electronAPI.on('speaker-audio-data', audioDataListener);
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ready_to_stop') return;
          let transcriptionText = '';
          if (data.lines && data.lines.length > 0) {
            transcriptionText = data.lines.filter((l: any) => l.speaker !== -2).map((l: any) => l.text || '').join(' ');
          }
          if (data.buffer_transcription) transcriptionText += ' ' + data.buffer_transcription;
          if (transcriptionText.trim()) {
            hasRecognitionResult = true;
            currentRecognizedText = transcriptionText.trim();
            setSpeakerRecognitionResult({ text: currentRecognizedText, error: '', timestamp: Date.now() });
            if (shouldStopRecognition(currentRecognizedText, recognitionStartTime)) {
              cleanup();
              setSpeakerStatus('success');
            }
          }
        } catch {}
      };

      websocket.onerror = () => {
        setSpeakerStatus('failed');
        setSpeakerRecognitionResult(prev => ({ ...prev, error: '连接扬声器识别服务失败', timestamp: Date.now() }));
        cleanup();
      };

      websocket.onclose = () => {};

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
              <button className="test-button" onClick={testMicrophone} disabled={micStatus === 'testing' || speakerStatus === 'testing'}>
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
              <button className="test-button" onClick={testSpeaker} disabled={speakerStatus === 'testing' || micStatus === 'testing'}>
                测试
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="radix-tooltip-content" sideOffset={5}>
                播放测试音频
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



