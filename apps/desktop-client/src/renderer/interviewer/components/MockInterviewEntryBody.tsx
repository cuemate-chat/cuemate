import { useState } from 'react';

interface MockInterviewEntryBodyProps {
  onStart?: () => void;
}

const VOICE_OPTIONS = [
  { group: '中文', items: [
    { value: 'Ting-Ting', label: 'Ting-Ting → 女声（普通话）' },
    { value: 'Mei-Jia', label: 'Mei-Jia → 女声（台湾普通话）' },
    { value: 'Li-Mu', label: 'Li-Mu → 男声（普通话）' },
    { value: 'Sin-Ji', label: 'Sin-Ji → 女声（粤语）' },
  ]},
  { group: '英文', items: [
    { value: 'Alex', label: 'Alex → 男声，美式英语' },
    { value: 'Samantha', label: 'Samantha → 女声，美式英语' },
    { value: 'Victoria', label: 'Victoria → 女声' },
    { value: 'Fred', label: 'Fred → 男声，机械音色' },
  ]},
  { group: '其他语言', items: [
    { value: 'Amelie', label: 'Amelie → 法语' },
    { value: 'Thomas', label: 'Thomas → 法语' },
    { value: 'Anna', label: 'Anna → 德语' },
    { value: 'Kyoko', label: 'Kyoko → 日语' },
    { value: 'Yuna', label: 'Yuna → 韩语' },
  ]},
];

export function MockInterviewEntryBody({ onStart }: MockInterviewEntryBodyProps) {
  const [voice, setVoice] = useState('Ting-Ting');
  const [testing, setTesting] = useState(false);
  const [lines, setLines] = useState<string[]>([]);

  const speak = async (v: string, text: string) => {
    try {
      setTesting(true);
      await (window as any).electronInterviewerAPI?.speakText?.(v, text);
      setLines(prev => [...prev, `面试官：${text}`]);
    } finally {
      setTesting(false);
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
          <div className="voice-select">
            <select className="device-select" value={voice} onChange={(e) => setVoice(e.target.value)}>
              {VOICE_OPTIONS.map(group => (
                <optgroup key={group.group} label={group.group}>
                  {group.items.map(item => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <button className="test-button voice-test-button" disabled={testing}
            onClick={() => speak(voice, voice.startsWith('Alex') || voice.startsWith('Samantha') || voice.startsWith('Victoria') || voice.startsWith('Fred')
              ? 'Hello, I am your interviewer'
              : '你好，我是你的面试官')}>测试声音</button>
          {onStart && (
            <button className="test-button" onClick={onStart}>开始模拟面试</button>
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


