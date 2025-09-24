import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useVoiceState } from '../../../utils/voiceState';

interface AudioDevice {
  deviceId: string;
  label: string;
}

interface MockInterviewEntryBodyProps {
  onStart?: () => void;
}

export function MockInterviewEntryBody({ onStart }: MockInterviewEntryBodyProps) {
  const [testing, setTesting] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // 使用VoiceState来控制下拉列表状态
  const voiceState = useVoiceState();

  // 音频设备状态
  const [micDevices, setMicDevices] = useState<AudioDevice[]>([]);
  const [speakerDevices, setSpeakerDevices] = useState<AudioDevice[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('');
  const [piperAvailable, setPiperAvailable] = useState(false);

  // 初始化音频设备和TTS
  useEffect(() => {
    const loadAudioSettings = async () => {
      try {
        // 检查 Piper TTS 可用性
        const piperAvailableResult = await (window as any).electronInterviewerAPI?.piperTTS?.isAvailable?.();
        setPiperAvailable(piperAvailableResult?.success && piperAvailableResult?.available);

        // 获取音频设备列表
        const devices = await navigator.mediaDevices.enumerateDevices();

        const mics = devices
          .filter(device => device.kind === 'audioinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `麦克风 ${device.deviceId.slice(0, 4)}`
          }));

        const speakers = devices
          .filter(device => device.kind === 'audiooutput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `扬声器 ${device.deviceId.slice(0, 4)}`
          }));

        setMicDevices(mics);
        setSpeakerDevices(speakers);

        // 设置默认设备
        if (mics.length > 0) setSelectedMic(mics[0].deviceId);
        if (speakers.length > 0) setSelectedSpeaker(speakers[0].deviceId);

      } catch (error) {
        console.error('Failed to load audio settings:', error);
        setPiperAvailable(false);
      } finally {
        setLoading(false);
      }
    };

    loadAudioSettings();
  }, []);

  const speak = async (text: string) => {
    try {
      setTesting(true);

      if (piperAvailable) {
        // 使用混合语言TTS，无需指定语音模型
        const options = { outputDevice: selectedSpeaker };
        await (window as any).electronInterviewerAPI?.piperTTS?.speak?.(text, options);
      } else {
        throw new Error('Piper TTS 不可用');
      }

      setLines(prev => [...prev, `面试官：${text}`]);
    } catch (error) {
      console.error('语音播放失败:', error);
      setLines(prev => [...prev, `面试官：${text} [播放失败]`]);
    } finally {
      setTesting(false);
    }
  };

  const handleStartInterview = () => {
    // 开始面试时播放混合语言欢迎词
    speak('你好，我是你今天的 Java 面试官，welcome to the interview!');

    // 调用原始的开始函数
    if (onStart) {
      onStart();
    }
  };


  return (
    <div className="interviewer-mode-panel">
      <div className="interviewer-top interviewer-top-card">
        <div className="interviewer-left interviewer-avatar-block">
          <div className="interviewer-avatar">
            <div className="ripple" />
            <div className="ripple ripple2" />
            <div className="avatar-circle">
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="28" cy="20" r="10" stroke="rgba(255,255,255,0.9)" strokeWidth="2" fill="rgba(255,255,255,0.15)" />
                <path d="M8 50c0-9 9-16 20-16s20 7 20 16" stroke="rgba(255,255,255,0.9)" strokeWidth="2" fill="rgba(255,255,255,0.08)" />
              </svg>
            </div>
          </div>
          <div className="avatar-label">面试官</div>
        </div>
        <div className="interviewer-right interviewer-controls-column">
          {/* 麦克风选择 */}
          <div className="device-select-group">
            <div className="voice-select">
              <select
                className="device-select"
                value={selectedMic}
                onChange={(e) => setSelectedMic(e.target.value)}
                disabled={loading || voiceState.subState !== 'idle'}
              >
                {loading ? (
                  <option>加载设备...</option>
                ) : micDevices.length === 0 ? (
                  <option>未检测到麦克风</option>
                ) : (
                  micDevices.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown size={14} className="select-icon" />
            </div>
          </div>

          {/* 扬声器选择 */}
          <div className="device-select-group">
            <div className="voice-select">
              <select
                className="device-select"
                value={selectedSpeaker}
                onChange={(e) => setSelectedSpeaker(e.target.value)}
                disabled={loading || voiceState.subState !== 'idle'}
              >
                {loading ? (
                  <option>加载设备...</option>
                ) : speakerDevices.length === 0 ? (
                  <option>未检测到扬声器</option>
                ) : (
                  speakerDevices.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown size={14} className="select-icon" />
            </div>
          </div>

          {onStart && (
            <button
              className="test-button"
              onClick={handleStartInterview}
              disabled={testing || loading || !piperAvailable}
            >
              {testing ? '正在测试...' : '开始模拟面试'}
            </button>
          )}
        </div>
      </div>

      <div className="interviewer-transcript">
        {lines.map((t, i) => (
          <div className="ai-utterance" key={i}>{t}</div>
        ))}
      </div>
    </div>
  );
}



