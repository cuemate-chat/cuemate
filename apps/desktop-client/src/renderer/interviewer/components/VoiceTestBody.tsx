import * as Tooltip from '@radix-ui/react-tooltip';
import { CheckCircle, ChevronDown, Clock, Loader2, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { logger } from '../../../utils/rendererLogger.js';
import { MicrophoneRecognitionController, SpeakerRecognitionController, startMicrophoneRecognition, startSpeakerRecognition } from '../../../utils/audioRecognition';
import { setVoiceState, useVoiceState } from '../../../utils/voiceState';

interface RecognitionResult {
  text: string;
  error: string;
  timestamp: number;
}

type TestStatus = 'untested' | 'testing' | 'success' | 'failed';

// localStorage key
const VOICE_TEST_STORAGE_KEY = 'cuemate_voice_test_result';

interface VoiceTestStorageData {
  micStatus: TestStatus;
  speakerStatus: TestStatus;
  micRecognitionResult: RecognitionResult;
  speakerRecognitionResult: RecognitionResult;
}

// 从 localStorage 读取上次测试结果
function loadVoiceTestResult(): VoiceTestStorageData | null {
  try {
    const data = localStorage.getItem(VOICE_TEST_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data) as VoiceTestStorageData;
      // testing 状态不保留，重置为上次的最终状态
      if (parsed.micStatus === 'testing') parsed.micStatus = 'untested';
      if (parsed.speakerStatus === 'testing') parsed.speakerStatus = 'untested';
      return parsed;
    }
  } catch {}
  return null;
}

// 保存测试结果到 localStorage
function saveVoiceTestResult(data: VoiceTestStorageData): void {
  try {
    localStorage.setItem(VOICE_TEST_STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function VoiceTestBody() {
  // 初始化时从 localStorage 读取上次结果
  const savedResult = loadVoiceTestResult();

  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [speakerDevices, setSpeakerDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('');
  const [micStatus, setMicStatus] = useState<TestStatus>(savedResult?.micStatus || 'untested');
  const [speakerStatus, setSpeakerStatus] = useState<TestStatus>(savedResult?.speakerStatus || 'untested');
  const [showingMicResult, setShowingMicResult] = useState(savedResult?.micStatus === 'success' || savedResult?.micStatus === 'failed');
  const [showingSpeakerResult, setShowingSpeakerResult] = useState(savedResult?.speakerStatus === 'success' || savedResult?.speakerStatus === 'failed');
  const [micRecognitionResult, setMicRecognitionResult] = useState<RecognitionResult>(savedResult?.micRecognitionResult || { text: '', error: '', timestamp: 0 });
  const [speakerRecognitionResult, setSpeakerRecognitionResult] = useState<RecognitionResult>(savedResult?.speakerRecognitionResult || { text: '', error: '', timestamp: 0 });
  const micControllerRef = useRef<MicrophoneRecognitionController | null>(null);
  const speakerControllerRef = useRef<SpeakerRecognitionController | null>(null);

  // 使用 VoiceState 来控制下拉列表状态
  const voiceState = useVoiceState();

  // 状态变化时保存到 localStorage（仅保存最终状态，不保存 testing）
  useEffect(() => {
    if (micStatus !== 'testing' && speakerStatus !== 'testing') {
      saveVoiceTestResult({
        micStatus,
        speakerStatus,
        micRecognitionResult,
        speakerRecognitionResult,
      });
    }
  }, [micStatus, speakerStatus, micRecognitionResult, speakerRecognitionResult]);

  useEffect(() => {
    (async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter(d => d.kind === 'audioinput');
        const speakers = devices.filter(d => d.kind === 'audiooutput');
        setMicDevices(mics);
        setSpeakerDevices(speakers);

        // 读取全局 asr 配置，尝试回填默认设备
        const electronAPI: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
        let defaultMic: string | undefined;
        let defaultSpeaker: string | undefined;
        try {
          const res = await electronAPI?.asrConfig?.get?.();
          const cfg = res?.config;
          if (cfg) {
            defaultMic = cfg.microphone_device_id;
            defaultSpeaker = cfg.speaker_device_id;
          }
        } catch {}

        if (mics.length > 0) {
          const exists = defaultMic && mics.some(d => d.deviceId === defaultMic);
          setSelectedMic(exists ? (defaultMic as string) : mics[0].deviceId);
        }
        if (speakers.length > 0) {
          const exists = defaultSpeaker && speakers.some(d => d.deviceId === defaultSpeaker);
          setSelectedSpeaker(exists ? (defaultSpeaker as string) : speakers[0].deviceId);
        }
      } catch (e) {
        logger.error(`获取设备失败: ${e}`);
      }
    })();

    // 订阅配置变更，保持与全局一致
    try {
      const electronAPI: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
      const off = electronAPI?.asrConfig?.onChanged?.((cfg: any) => {
        if (cfg?.microphone_device_id && micDevices.some(d => d.deviceId === cfg.microphone_device_id)) {
          setSelectedMic(cfg.microphone_device_id);
        }
        if (cfg?.speaker_device_id && speakerDevices.some(d => d.deviceId === cfg.speaker_device_id)) {
          setSelectedSpeaker(cfg.speaker_device_id);
        }
      });
      return () => {
        try { off?.(); } catch {}
      };
    } catch {}
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
    setVoiceState({ mode: 'voice-test', subState: 'voice-mic-testing' });

    let testTimer: NodeJS.Timeout | null = null;
    let hasRecognitionResult = false;
    let recognitionStartTime = 0;
    let currentRecognizedText = '';

    const cleanup = async () => {
      if (testTimer) { clearTimeout(testTimer); testTimer = null; }
      try { await micControllerRef.current?.stop(); } catch {}
      micControllerRef.current = null;
      setVoiceState({ mode: 'voice-test', subState: 'voice-mic-end' });
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
        onError: (errorMessage) => {
          const errorMsg = errorMessage || '连接麦克风识别服务失败';
          logger.error(`麦克风测试失败: ${errorMsg}`);
          setMicStatus('failed');
          setMicRecognitionResult(prev => ({ ...prev, error: errorMsg, timestamp: Date.now() }));
          void cleanup();
        },
      });
      micControllerRef.current = controller;

      testTimer = setTimeout(() => {
        cleanup().finally(() => {
          if (hasRecognitionResult) setMicStatus('success');
          else {
            const errorMsg = '连接或识别超时，30 秒内未收到任何识别结果，请检查麦克风和 ASR 服务';
            logger.error(`麦克风测试超时: ${errorMsg}, deviceId=${selectedMic}`);
            setMicStatus('failed');
            setMicRecognitionResult(prev => ({ ...prev, error: errorMsg, timestamp: Date.now() }));
          }
        });
      }, 30000);
    } catch (error: any) {
      setMicStatus('failed');
      let errorMsg = '';
      if (error?.name === 'NotAllowedError') errorMsg = '麦克风权限被拒绝，请在设置中允许麦克风访问';
      else if (error?.name === 'NotFoundError') errorMsg = '未找到麦克风设备，请检查设备连接';
      else errorMsg = `麦克风测试失败：${error?.message}`;
      logger.error(`麦克风测试异常: ${errorMsg}, error=${error?.name || 'unknown'}, message=${error?.message || 'no message'}, deviceId=${selectedMic}`);
      setMicRecognitionResult(prev => ({ ...prev, error: errorMsg, timestamp: Date.now() }));
      try {
        await micControllerRef.current?.stop();
      } catch {}
      micControllerRef.current = null;
      setVoiceState({ mode: 'none', subState: 'idle' });
    }
  };

  const testSpeaker = async () => {
    setSpeakerStatus('testing');
    setShowingSpeakerResult(true);
    setSpeakerRecognitionResult(prev => ({ text: '', error: prev.error, timestamp: Date.now() }));
    setVoiceState({ mode: 'voice-test', subState: 'voice-speak-testing' });

    let testTimer: NodeJS.Timeout | null = null;
    let hasRecognitionResult = false;
    let recognitionStartTime = 0;
    let currentRecognizedText = '';

    const cleanup = async () => {
      if (testTimer) { clearTimeout(testTimer); testTimer = null; }
      try { await speakerControllerRef.current?.stop(); } catch {}
      speakerControllerRef.current = null;
      setVoiceState({ mode: 'voice-test', subState: 'voice-speak-end' });
    };

    try {
      const controller = await startSpeakerRecognition({
        deviceId: selectedSpeaker || undefined,
        onOpen: () => { recognitionStartTime = Date.now(); },
        onText: (text) => {
          hasRecognitionResult = true;
          currentRecognizedText = text.trim();
          setSpeakerRecognitionResult({ text: currentRecognizedText, error: '', timestamp: Date.now() });
          if (shouldStopRecognition(currentRecognizedText, recognitionStartTime)) {
            cleanup().finally(() => setSpeakerStatus('success'));
          }
        },
        onError: (errorMessage) => {
          const errorMsg = errorMessage || '连接扬声器识别服务失败';
          logger.error(`扬声器测试失败: ${errorMsg}, deviceId=${selectedSpeaker}`);
          setSpeakerStatus('failed');
          setSpeakerRecognitionResult(prev => ({ ...prev, error: errorMsg, timestamp: Date.now() }));
          void cleanup();
        },
      });
      speakerControllerRef.current = controller;

      testTimer = setTimeout(() => {
        cleanup().finally(() => {
          if (hasRecognitionResult) setSpeakerStatus('success');
          else {
            const errorMsg = '连接或识别超时，30 秒内未收到任何识别结果，请检查扬声器播放内容和 ASR 服务';
            logger.error(`扬声器测试超时: ${errorMsg}, deviceId=${selectedSpeaker}`);
            setSpeakerStatus('failed');
            setSpeakerRecognitionResult(prev => ({ ...prev, error: errorMsg, timestamp: Date.now() }));
          }
        });
      }, 30000);
    } catch (error: any) {
      const errorMsg = `扬声器测试失败：${error?.message}`;
      logger.error(`扬声器测试异常: ${errorMsg}, error=${error?.name || 'unknown'}, message=${error?.message || 'no message'}, deviceId=${selectedSpeaker}`);
      setSpeakerStatus('failed');
      setSpeakerRecognitionResult(prev => ({ ...prev, error: errorMsg, timestamp: Date.now() }));
      try {
        await speakerControllerRef.current?.stop();
      } catch {}
      speakerControllerRef.current = null;
      setVoiceState({ mode: 'none', subState: 'idle' });
    }
  };

  return (
    <div className="voice-test-panel">
      <div className="test-section">
        <h4 className="test-section-title">麦克风测试</h4>
        <div className="test-row">
          <div className="device-select-wrapper">
            <select className="device-select" value={selectedMic} onChange={async (e) => {
              const value = e.target.value;
              setSelectedMic(value);
              try {
                const selected = micDevices.find(d => d.deviceId === value);
                const name = selected?.label || '默认麦克风';
                const electronAPI: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
                await electronAPI?.asrConfig?.updateDevices?.({
                  microphone_device_id: value,
                  microphone_device_name: name,
                });
              } catch {}
            }} disabled={voiceState.subState !== 'idle'}>
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
            <select className="device-select" value={selectedSpeaker} onChange={async (e) => {
              const value = e.target.value;
              setSelectedSpeaker(value);
              try {
                const selected = speakerDevices.find(d => d.deviceId === value);
                const name = selected?.label || '默认扬声器';
                const electronAPI: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
                await electronAPI?.asrConfig?.updateDevices?.({
                  speaker_device_id: value,
                  speaker_device_name: name,
                });
              } catch {}
            }} disabled={voiceState.subState !== 'idle'}>
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
          {micRecognitionResult.timestamp > 0 && (<div className="timestamp" style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{new Date(micRecognitionResult.timestamp).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>)}
        </div>
      )}

      {showingSpeakerResult && (speakerRecognitionResult.text || speakerRecognitionResult.error) && (
        <div className="recognition-result">
          <h5>扬声器识别结果：</h5>
          {speakerRecognitionResult.text && (<div className="recognized-text">{speakerRecognitionResult.text}</div>)}
          {speakerRecognitionResult.error && (<div className="error-text" style={{ color: '#ff6b6b', marginTop: '8px' }}>{speakerRecognitionResult.error}</div>)}
          {speakerRecognitionResult.timestamp > 0 && (<div className="timestamp" style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{new Date(speakerRecognitionResult.timestamp).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>)}
        </div>
      )}
    </div>
  );
}



