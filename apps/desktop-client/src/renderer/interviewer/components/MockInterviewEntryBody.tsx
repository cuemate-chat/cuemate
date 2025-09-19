import { useEffect, useState } from 'react';

interface Voice {
  name: string;
  locale: string;
  description: string;
}

interface MockInterviewEntryBodyProps {
  onStart?: () => void;
}

export function MockInterviewEntryBody({ onStart }: MockInterviewEntryBodyProps) {
  const [voiceCategories, setVoiceCategories] = useState<Array<[string, Array<[string, Voice[]]>]>>([]);
  const [voice, setVoice] = useState('Tingting');
  const [testing, setTesting] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // 获取系统可用的声音列表
  useEffect(() => {
    const loadVoices = async () => {
      try {
        const result = await (window as any).electronInterviewerAPI?.getAvailableVoices?.();
        if (result?.success && result?.voiceCategories) {
          setVoiceCategories(result.voiceCategories);
          
          // 优先选择婷婷（中文）
          const chineseCategory = result.voiceCategories.find(([categoryName]: [string, any]) => categoryName === '中文');
          if (chineseCategory) {
            const chineseSubCategories = chineseCategory[1];
            for (const [, voices] of chineseSubCategories) {
              const tingtingVoice = voices.find((v: Voice) => 
                v.name.toLowerCase().includes('tingting') || 
                v.name.toLowerCase().includes('ting-ting') ||
                v.name.toLowerCase().includes('婷婷')
              );
              if (tingtingVoice) {
                setVoice(tingtingVoice.name);
                break;
              }
            }
            // 如果没找到婷婷，选择第一个中文声音
            if (voice === 'Tingting') {
              const firstChineseVoice = chineseSubCategories[0]?.[1]?.[0];
              if (firstChineseVoice) {
                setVoice(firstChineseVoice.name);
              }
            }
          } else if (result.voiceCategories.length > 0) {
            // 如果没有中文，选择第一个可用的声音
            const firstCategory = result.voiceCategories[0];
            const firstSubCategory = firstCategory[1][0];
            const firstVoice = firstSubCategory[1][0];
            if (firstVoice) {
              setVoice(firstVoice.name);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load voices:', error);
        // 如果获取失败，使用默认声音
        setVoiceCategories([['中文', [['普通话(中国大陆)', [{ name: 'Tingting', locale: 'zh_CN', description: 'Default voice' }]]]]]);
      } finally {
        setLoading(false);
      }
    };

    loadVoices();
  }, []);

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
    const voice = voiceCategories
      .flatMap(([, subCategories]) => subCategories)
      .flatMap(([, voices]) => voices)
      .find(v => v.name === voiceName);
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
                voiceCategories.map(([categoryName, subCategories]) => (
                  <optgroup key={categoryName} label={categoryName}>
                    {subCategories.map(([subCategoryName, voices]) => (
                      <optgroup key={subCategoryName} label={`  ${subCategoryName}`}>
                        {voices.map(v => (
                          <option key={v.name} value={v.name}>
                            {v.name}
                          </option>
                        ))}
                      </optgroup>
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



