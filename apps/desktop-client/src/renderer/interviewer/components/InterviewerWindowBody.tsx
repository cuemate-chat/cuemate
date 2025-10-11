import * as Tooltip from '@radix-ui/react-tooltip';
import { GraduationCap, MessageSquare, Mic, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { currentInterview } from '../../utils/currentInterview';
import { setVoiceState, useVoiceState } from '../../../utils/voiceState';
import { setMockInterviewState } from '../../utils/mockInterviewState';
import { startVoiceQA, stopVoiceQA, useVoiceQAState } from '../../utils/voiceQA';
import { InterviewTrainingEntryBody } from './InterviewTrainingEntryBody';
import { MockInterviewEntryBody } from './MockInterviewEntryBody';
import { VoiceQAEntryBody } from './VoiceQAEntryBody';
import { VoiceTestBody } from './VoiceTestBody';

interface InterviewerWindowBodyProps {
  selectedCard: string | null;
  onSelectCard: (title: string) => void;
}

export function InterviewerWindowBody({ selectedCard, onSelectCard }: InterviewerWindowBodyProps) {
  const [question, setQuestion] = useState('');
  const qa = useVoiceQAState();
  const vState = useVoiceState();
  const isRecording = vState.mode === 'voice-qa' && vState.subState === 'voice-speaking';

  // 同步语音识别结果到本地状态
  useEffect(() => {
    setQuestion(qa.confirmedText);
  }, [qa.confirmedText]);

  // 处理语音按钮点击
  const handleVoiceToggle = async () => {
    if (!isRecording) {
      let micDeviceId: string | undefined = undefined;
      try {
        const electronAPI: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
        const res = await electronAPI?.asrConfig?.get?.();
        micDeviceId = res?.config?.microphone_device_id || undefined;
      } catch {}
      await startVoiceQA(micDeviceId, question);
      setVoiceState({ mode: 'voice-qa', subState: 'voice-speaking' });
    } else {
      await stopVoiceQA();
      setVoiceState({ mode: 'voice-qa', subState: 'voice-end' });
    }
  };

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

  // 选择“语音提问”时自动切换模式并显示 AI 提问窗口
  useEffect(() => {
    if (selectedCard === '语音提问') {
      (async () => {
        try {
          if ((window as any).electronAPI) {
            await (window as any).electronAPI.switchToMode('voice-qa');
            await (window as any).electronAPI.showAIQuestion();
          }
        } catch (error) {
          console.error('切换到语音提问模式失败:', error);
        }
      })();
    }
  }, [selectedCard]);

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
    // 点击模拟面试或面试训练卡片时,清除之前的 interviewId
    if (cardTitle === '模拟面试' || cardTitle === '面试训练') {
      currentInterview.clear(); // 清理localStorage中的interviewId
      setVoiceState({ interviewId: undefined }); // 清理VoiceState中的interviewId
    }
    onSelectCard(cardTitle);
  };

  if (selectedCard === null) {
    return (
      <Tooltip.Provider>
        <div className="interviewer-window-body" key="home">
          <div className="live-insights-grid">
            {insightCards.map((card, index) => {
              const IconComponent = card.icon;
              return (
                <button 
                  key={index} 
                  className={`insight-card`}
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
        </div>
      </Tooltip.Provider>
    );
  }

  return (
    <Tooltip.Provider>
      <div className="interviewer-window-body" key={selectedCard || 'page'}>
        {selectedCard === '语音测试' && <VoiceTestBody />}
        {selectedCard === '语音提问' && <VoiceQAEntryBody question={question} onVoiceToggle={handleVoiceToggle} />}
        {selectedCard === '模拟面试' && (
          <MockInterviewEntryBody
            onStart={async () => {
              setVoiceState({ mode: 'mock-interview', subState: 'mock-interview-recording' });
              if ((window as any).electronAPI) {
                await (window as any).electronAPI.switchToMode('mock-interview');
                await (window as any).electronAPI.showAIQuestion();
                await (window as any).electronAPI.showAIQuestionHistory();
              }
            }}
            onAnswerGenerated={(answer: string) => {
              // 通过 BroadcastChannel + localStorage 跨窗口传递数据
              setMockInterviewState({ aiMessage: answer, isLoading: false });
            }}
          />
        )}
        {selectedCard === '面试训练' && (
          <InterviewTrainingEntryBody onStart={async () => {
            setVoiceState({ mode: 'interview-training', subState: 'interview-training-recording' });
            if ((window as any).electronAPI) {
              await (window as any).electronAPI.switchToMode('interview-training');
              await (window as any).electronAPI.showAIQuestion();
              await (window as any).electronAPI.showAIQuestionHistory();
            }
          }} />
        )}
      </div>
    </Tooltip.Provider>
  );
}
