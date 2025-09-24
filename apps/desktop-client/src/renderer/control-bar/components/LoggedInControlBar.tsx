import * as Separator from '@radix-ui/react-separator';
import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, CornerDownLeft, Eye, EyeOff, Pause, Play, Square, Type } from 'lucide-react';
import { useEffect, useState } from 'react';
import { setVoiceState, useVoiceState } from '../../../utils/voiceState';
import { LottieAudioLines } from '../../shared/components/LottieAudioLines';

interface LoggedInControlBarProps {
  // 暂时不添加任何 props
}

export function LoggedInControlBar({}: LoggedInControlBarProps) {
  const [isListenHovered, setIsListenHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  
  const [isInterviewerWindowOpen, setIsInterviewerWindowOpen] = useState(false);
  const vState = useVoiceState();
  
  // "提问 AI"按钮的禁用状态
  const [isAskAIDisabled, setIsAskAIDisabled] = useState(false);
  

  const handleListenClick = async () => {
    try {
      const isMI = vState.mode === 'mock-interview';
      const isIT = vState.mode === 'interview-training';

      // 打开语音识别窗口（所有模式都需要）
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.showInterviewer();
        setIsInterviewerWindowOpen(true);
      }

      // 如果是 mock-interview 或 interview-training 模式，还需要处理语音状态
      if (isMI || isIT) {
        // 从 idle 或 completed 状态开始录制
        if (vState.subState === 'idle' || vState.subState === 'mock-interview-completed' || vState.subState === 'interview-training-completed') {
          setVoiceState({ subState: isMI ? 'mock-interview-recording' : 'interview-training-recording' });
        }
        // 从 recording 状态暂停录制
        else if (vState.subState === 'mock-interview-recording' || vState.subState === 'interview-training-recording') {
          setVoiceState({ subState: isMI ? 'mock-interview-paused' : 'interview-training-paused' });
        }
        // 从 paused 状态恢复录制
        else if (vState.subState === 'mock-interview-paused' || vState.subState === 'interview-training-paused') {
          setVoiceState({ subState: isMI ? 'mock-interview-recording' : 'interview-training-recording' });
        }
      }
    } catch (error) {
      console.error('语音识别操作失败:', error);
    }
  };

  const handleToggleInterviewerWindow = async (show: boolean) => {
    try {
      if ((window as any).electronAPI) {
        if (show) {
          await (window as any).electronAPI.showInterviewer();
        } else {
          await (window as any).electronAPI.hideInterviewer();
        }
        setIsInterviewerWindowOpen(show);
      }
    } catch (error) {
      console.error('切换Interviewer窗口失败:', error);
    }
  };

  const handlePauseClick = () => {
    // 暂停录制
    if (vState.subState === 'mock-interview-recording' || vState.subState === 'interview-training-recording') {
      setVoiceState({ subState: vState.mode === 'mock-interview' ? 'mock-interview-paused' : 'interview-training-paused' });
    }
  };

  const handlePlayClick = () => {
    // 播放录制内容
    if (vState.subState === 'mock-interview-completed' || vState.subState === 'interview-training-completed') {
      setVoiceState({ subState: vState.mode === 'mock-interview' ? 'mock-interview-playing' : 'interview-training-playing' });
      // 可以在这里添加播放录制内容的逻辑
      console.log('播放录制内容');
    }
  };

  const handleDoneClick = () => {
    // 完成并保存，回到idle状态
    setIsInterviewerWindowOpen(false);
    // 可以在这里添加保存录制结果的逻辑
    console.log('录制已完成并保存');

    // 直接回到语音识别状态
    setVoiceState({ subState: 'idle' });
  };

  const handleAskQuestionClick = async () => {
    try {
      if ((window as any).electronAPI) {
        // 切换到 voice-qa 模式
        await (window as any).electronAPI.switchToMode('voice-qa');
        // 显示 AI 问题窗口
        await (window as any).electronAPI.toggleAIQuestion();
      }
    } catch (error) {
      console.error('打开AI问题窗口失败:', error);
    }
  };

  const handleVisibilityToggle = () => {
    try {
      const api: any = (window as any).electronAPI;
      const next = !isVisible;
      if (api?.visibility?.set) {
        api.visibility.set(next).then(() => setIsVisible(next)).catch(() => setIsVisible(next));
      } else {
        setIsVisible(next);
      }
      console.log('Visibility toggled:', next);
    } catch {
      setIsVisible(!isVisible);
    }
  };

  // 监听"提问 AI"按钮禁用状态变化
  useEffect(() => {
    const handleAskAIButtonDisabled = (disabled: boolean) => {
      setIsAskAIDisabled(disabled);
    };

    if ((window as any).electronAPI && (window as any).electronAPI.on) {
      (window as any).electronAPI.on('ask-ai-button-disabled', handleAskAIButtonDisabled);
    }

    return () => {
      if ((window as any).electronAPI && (window as any).electronAPI.off) {
        (window as any).electronAPI.off('ask-ai-button-disabled', handleAskAIButtonDisabled);
      }
    };
  }, []);

  // 初始化与订阅隐身模式
  useEffect(() => {
    try {
      const api: any = (window as any).electronAPI;
      api?.visibility?.get?.().then((res: any) => {
        if (typeof res?.enabled === 'boolean') setIsVisible(!res.enabled);
      });
      const off = api?.visibility?.onChanged?.((enabled: boolean) => {
        setIsVisible(!enabled);
      });
      return () => { try { off?.(); } catch {} };
    } catch {}
  }, []);

  return (
    <div className="logged-in-control-bar">
      {/* 左侧分隔线 */}
      <Separator.Root 
        orientation="vertical" 
        className="vertical-separator"
        decorative 
      />
      
      {/* 语音识别按钮 - 多状态切换 */}
      <div className="voice-recognition-container">
        {(() => {
          const isMI = vState.mode === 'mock-interview';
          const isIT = vState.mode === 'interview-training';
          const isActiveState = (
            vState.subState === 'mock-interview-recording' ||
            vState.subState === 'mock-interview-paused' ||
            vState.subState === 'mock-interview-completed' ||
            vState.subState === 'mock-interview-playing' ||
            vState.subState === 'interview-training-recording' ||
            vState.subState === 'interview-training-paused' ||
            vState.subState === 'interview-training-completed' ||
            vState.subState === 'interview-training-playing'
          );
          return !(isMI || isIT) || !isActiveState;
        })() && (
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <motion.button
                className={`listen-btn ${isListenHovered ? 'hovered' : ''}`}
                onClick={handleListenClick}
                onMouseEnter={() => setIsListenHovered(true)}
                onMouseLeave={() => setIsListenHovered(false)}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
                >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <LottieAudioLines size={16} />
                  <span>语音识别</span>
                </motion.div>
              </motion.button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="radix-tooltip-content">
                开始语音监听
                <Tooltip.Arrow className="radix-tooltip-arrow" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        )}

        {(() => {
          const isMI = vState.mode === 'mock-interview';
          const isIT = vState.mode === 'interview-training';
          return (isMI || isIT) && (vState.subState === 'mock-interview-recording' || vState.subState === 'interview-training-recording' || vState.subState === 'mock-interview-paused' || vState.subState === 'interview-training-paused');
        })() && (
          <div className="voice-recording-group">
            {/* Pause/Resume 按钮 */}
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <motion.button
                  className={`voice-icon-btn ${(vState.subState === 'mock-interview-recording' || vState.subState === 'interview-training-recording') ? 'pause-btn' : 'resume-btn'}`}
                  onClick={(vState.subState === 'mock-interview-recording' || vState.subState === 'interview-training-recording') ? handlePauseClick : handleListenClick}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    transition={{ duration: 0.2 }}
                  >
                    {(vState.subState === 'mock-interview-recording' || vState.subState === 'interview-training-recording') ? <Pause size={16} /> : <Play size={16} />}
                  </motion.div>
                </motion.button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="radix-tooltip-content">
                  {(vState.subState === 'mock-interview-recording' || vState.subState === 'interview-training-recording') ? '暂停录制' : '继续录制'}
                  <Tooltip.Arrow className="radix-tooltip-arrow" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>

            {/* 波形 + 箭头组合按钮 */}
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <motion.button
                  className="voice-group-btn"
                  onClick={() => handleToggleInterviewerWindow(!isInterviewerWindowOpen)}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    whileHover={{ scale: 1.2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <LottieAudioLines 
                      size={26} 
                      src="/src/assets/MusicSoundequalizerloader.gif"
                      alt="Music Waves"
                    />
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    transition={{ duration: 0.2 }}
                  >
                    {isInterviewerWindowOpen ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </motion.div>
                </motion.button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="radix-tooltip-content">
                  {isInterviewerWindowOpen ? '隐藏语音识别窗口' : '显示语音识别窗口'}
                  <Tooltip.Arrow className="radix-tooltip-arrow" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </div>
        )}

        {(() => {
          const isMI = vState.mode === 'mock-interview';
          const isIT = vState.mode === 'interview-training';
          return (isMI || isIT) && (vState.subState === 'mock-interview-completed' || vState.subState === 'interview-training-completed' || vState.subState === 'mock-interview-playing' || vState.subState === 'interview-training-playing');
        })() && (
          <div className="voice-stopped-group">
            {/* Play 按钮 */}
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <motion.button
                  className="voice-icon-btn play-btn"
                  onClick={handlePlayClick}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Play size={16} />
                  </motion.div>
                </motion.button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="radix-tooltip-content">
                  播放录制内容
                  <Tooltip.Arrow className="radix-tooltip-arrow" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>

            {/* Done 按钮 */}
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <motion.button
                  className="voice-group-btn done-btn"
                  onClick={handleDoneClick}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    whileHover={{ scale: 1.2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <LottieAudioLines 
                      size={20} 
                      src="/src/assets/Equalizer.gif"
                      alt="Done"
                    />
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Square size={16} />
                  </motion.div>
                </motion.button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="radix-tooltip-content">
                  完成录制
                  <Tooltip.Arrow className="radix-tooltip-arrow" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </div>
        )}
      </div>

      {/* Ask question 按钮 */}
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <motion.button
            className={`ask-question-btn ${isAskAIDisabled ? 'disabled' : ''}`}
            onClick={handleAskQuestionClick}
            disabled={isAskAIDisabled}
            whileTap={{ scale: isAskAIDisabled ? 1 : 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Type size={16} className="text-gray-500" />
              <span>提问 AI</span>
            </motion.div>
          </motion.button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="radix-tooltip-content">
            {isAskAIDisabled ? (
              '当前有其他模式正在使用，请先取消选择'
            ) : (
              <>
                您可以询问任何问题给到 AI，快捷键： <span className="shortcut-key">⌘</span> + <span className="shortcut-key-icon"><CornerDownLeft size={12} /></span>
              </>
            )}
            <Tooltip.Arrow className="radix-tooltip-arrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>

      {/* 可见性切换按钮 */}
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <motion.button
            className="visibility-btn"
            onClick={handleVisibilityToggle}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              whileHover={{ scale: 1.2 }}
              transition={{ duration: 0.2 }}
            >
              {isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
            </motion.div>
          </motion.button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="radix-tooltip-content">
            {isVisible ? '当前可见，点击隐藏应用，截图、录屏、共享屏幕不可见' : '当前隐藏，点击显示应用，截图、录屏、共享屏幕可见'}
            <Tooltip.Arrow className="radix-tooltip-arrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      
      {/* 右侧分隔线 */}
      <Separator.Root 
        orientation="vertical" 
        className="vertical-separator"
        decorative 
      />
    </div>
  );
}
