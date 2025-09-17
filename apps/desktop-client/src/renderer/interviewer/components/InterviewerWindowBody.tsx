import * as Tooltip from '@radix-ui/react-tooltip';
import { GraduationCap, MessageSquare, Mic, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { InterviewTrainingEntryBody } from './InterviewTrainingEntryBody';
import { MockInterviewEntryBody } from './MockInterviewEntryBody';
import { VoiceQAEntryBody } from './VoiceQAEntryBody';
import { VoiceTestBody } from './VoiceTestBody';

export function InterviewerWindowBody() {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

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

  // 测试逻辑已移动至子组件

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
      // 设备加载与测试逻辑已下沉至子组件 VoiceTestBody 中处理
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
        <VoiceTestBody />
      )}

      {selectedCard === "语音提问" && (
        <VoiceQAEntryBody onStart={async () => {
          if ((window as any).electronAPI) {
            await (window as any).electronAPI.switchToMode('voice-qa');
            await (window as any).electronAPI.showAIQuestion();
          }
        }} />
      )}

      {selectedCard === "模拟面试" && (
        <MockInterviewEntryBody onStart={async () => {
          if ((window as any).electronAPI) {
            await (window as any).electronAPI.switchToMode('mock-interview');
            await (window as any).electronAPI.showAIQuestion();
          }
        }} />
      )}

      {selectedCard === "面试训练" && (
        <InterviewTrainingEntryBody onStart={async () => {
          if ((window as any).electronAPI) {
            await (window as any).electronAPI.switchToMode('interview-training');
            await (window as any).electronAPI.showAIQuestion();
          }
        }} />
      )}
      </div>
    </Tooltip.Provider>
  );
}
