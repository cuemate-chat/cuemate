import React, { useEffect, useState } from 'react';

interface Voice {
  commandName: string;
  displayName: string;
  locale: string;
  description: string;
}

interface InterviewTrainingEntryBodyProps {
  onStart?: () => void;
}

export function InterviewTrainingEntryBody({ onStart }: InterviewTrainingEntryBodyProps) {
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
                v.commandName.toLowerCase().includes('tingting') || 
                v.commandName.toLowerCase().includes('ting-ting') ||
                v.commandName.toLowerCase().includes('婷婷')
              );
              if (tingtingVoice) {
                setVoice(tingtingVoice.commandName);
                break;
              }
            }
            // 如果没找到婷婷，选择第一个中文声音
            if (voice === 'Tingting') {
              const firstChineseVoice = chineseSubCategories[0]?.[1]?.[0];
              if (firstChineseVoice) {
                setVoice(firstChineseVoice.commandName);
              }
            }
          } else if (result.voiceCategories.length > 0) {
            // 如果没有中文，选择第一个可用的声音
            const firstCategory = result.voiceCategories[0];
            const firstSubCategory = firstCategory[1][0];
            const firstVoice = firstSubCategory[1][0];
            if (firstVoice) {
              setVoice(firstVoice.commandName);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load voices:', error);
        // 如果获取失败，使用默认声音
        setVoiceCategories([['中文', [['普通话(中国大陆)', [{ commandName: 'Tingting', displayName: 'Tingting (普通话（中国大陆）)', locale: 'zh_CN', description: 'Default voice' }]]]]]);
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
      .find(v => v.commandName === voiceName);
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
                  <React.Fragment key={categoryName}>
                    <option disabled style={{ fontWeight: 'bold', backgroundColor: '#333' }}>
                      ── {categoryName} ──
                    </option>
                    {subCategories.map(([subCategoryName, voices]) => (
                      <React.Fragment key={subCategoryName}>
                        <option disabled style={{ paddingLeft: '20px', backgroundColor: '#444' }}>
                          {subCategoryName}
                        </option>
                        {voices.map(v => (
                          <option key={v.commandName} value={v.commandName} style={{ paddingLeft: '40px' }}>
                            {v.displayName}
                          </option>
                        ))}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
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



