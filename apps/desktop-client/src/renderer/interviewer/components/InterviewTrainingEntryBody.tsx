import { useEffect, useState } from 'react';

interface Voice {
  name: string;
  locale: string;
  description: string;
}

interface InterviewTrainingEntryBodyProps {
  onStart?: () => void;
}

export function InterviewTrainingEntryBody({ onStart }: InterviewTrainingEntryBodyProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voice, setVoice] = useState('Alex');
  const [testing, setTesting] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // 获取系统可用的声音列表
  useEffect(() => {
    const loadVoices = async () => {
      try {
        const result = await (window as any).electronInterviewerAPI?.getAvailableVoices?.();
        if (result?.success && result?.voices) {
          setVoices(result.voices);
          // 设置默认声音为第一个可用的声音
          if (result.voices.length > 0) {
            setVoice(result.voices[0].name);
          }
        }
      } catch (error) {
        console.error('Failed to load voices:', error);
        // 如果获取失败，使用默认声音
        setVoices([{ name: 'Alex', locale: 'en_US', description: 'Default voice' }]);
      } finally {
        setLoading(false);
      }
    };

    loadVoices();
  }, []);

  // 根据语言分组声音
  const groupedVoices = voices.reduce((groups, voice) => {
    const lang = voice.locale.split('_')[0];
    const language = getLanguageName(lang);
    
    if (!groups[language]) {
      groups[language] = [];
    }
    groups[language].push(voice);
    return groups;
  }, {} as Record<string, Voice[]>);

  const speak = async (v: string, text: string) => {
    try {
      setTesting(true);
      await (window as any).electronInterviewerAPI?.speakText?.(v, text);
      setLines(prev => [...prev, `面试官：${text}`]);
    } finally {
      setTesting(false);
    }
  };

  // 根据声音名称判断语言
  const isEnglishVoice = (voiceName: string) => {
    const voice = voices.find(v => v.name === voiceName);
    return voice?.locale.startsWith('en_') || false;
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
            <select 
              className="device-select" 
              value={voice} 
              onChange={(e) => setVoice(e.target.value)}
              disabled={loading}
            >
              {loading ? (
                <option>加载声音列表...</option>
              ) : (
                Object.entries(groupedVoices).map(([language, voiceList]) => (
                  <optgroup key={language} label={language}>
                    {voiceList.map(v => (
                      <option key={v.name} value={v.name}>
                        {v.name} → {v.description}
                      </option>
                    ))}
                  </optgroup>
                ))
              )}
            </select>
          </div>
          <button 
            className="test-button voice-test-button" 
            disabled={testing || loading}
            onClick={() => speak(voice, isEnglishVoice(voice) 
              ? 'Hello, I am your interviewer'
              : '你好，我是你的面试官'
            )}
          >
            测试声音
          </button>
          {onStart && (
            <button className="test-button" onClick={onStart}>开始面试训练</button>
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

// 语言代码到语言名称的映射
function getLanguageName(langCode: string): string {
  const languageMap: Record<string, string> = {
    'en': '英语',
    'zh': '中文',
    'ja': '日语',
    'ko': '韩语',
    'fr': '法语',
    'de': '德语',
    'es': '西班牙语',
    'it': '意大利语',
    'pt': '葡萄牙语',
    'ru': '俄语',
    'ar': '阿拉伯语',
    'hi': '印地语',
    'th': '泰语',
    'vi': '越南语',
    'nl': '荷兰语',
    'sv': '瑞典语',
    'da': '丹麦语',
    'no': '挪威语',
    'fi': '芬兰语',
    'pl': '波兰语',
    'tr': '土耳其语',
    'he': '希伯来语',
    'el': '希腊语',
    'cs': '捷克语',
    'sk': '斯洛伐克语',
    'hu': '匈牙利语',
    'ro': '罗马尼亚语',
    'bg': '保加利亚语',
    'hr': '克罗地亚语',
    'sl': '斯洛文尼亚语',
    'et': '爱沙尼亚语',
    'lv': '拉脱维亚语',
    'lt': '立陶宛语',
    'uk': '乌克兰语',
    'ca': '加泰罗尼亚语',
    'ms': '马来语',
    'id': '印尼语',
    'ta': '泰米尔语',
    'te': '泰卢固语',
    'kn': '卡纳达语',
    'ml': '马拉雅拉姆语',
    'gu': '古吉拉特语',
    'pa': '旁遮普语',
    'bn': '孟加拉语',
    'ur': '乌尔都语',
  };
  
  return languageMap[langCode] || langCode.toUpperCase();
}


