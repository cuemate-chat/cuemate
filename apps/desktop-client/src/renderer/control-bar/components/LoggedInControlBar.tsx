import * as Separator from '@radix-ui/react-separator';
import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, CornerDownLeft, Eye, EyeOff, Pause, Play, Square, Type } from 'lucide-react';
import { useEffect, useState } from 'react';
import { setVoiceState, useVoiceState } from '../../../utils/voiceState';
import { userSettingsService } from '../../services/userSettingsService';
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
    // 暂停面试
    if (vState.mode === 'mock-interview') {
      setVoiceState({ subState: 'mock-interview-paused' });
    } else if (vState.mode === 'interview-training') {
      setVoiceState({ subState: 'interview-training-paused' });
    }
  };

  const handlePlayClick = () => {
    // 继续面试
    if (vState.mode === 'mock-interview') {
      setVoiceState({ subState: 'mock-interview-playing' });
    } else if (vState.mode === 'interview-training') {
      setVoiceState({ subState: 'interview-training-playing' });
    }
  };

  const handleDoneClick = () => {
    // 完成并保存，回到idle状态
    setIsInterviewerWindowOpen(false);

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

  const handleVisibilityToggle = async () => {
    try {
      const api: any = (window as any).electronAPI;
      const next = !isVisible;

      // 先更新系统状态，成功后再更新本地状态和数据库
      if (api?.visibility?.set) {
        // visibility.set 期望隐身模式的启用状态，与 isVisible 相反
        await api.visibility.set(!next);
        setIsVisible(next);
      } else {
        setIsVisible(next);
      }

      // 系统状态更新成功后，同步更新数据库中的用户设置
      try {
        await userSettingsService.updateSettings({
          floating_window_visible: next ? 1 : 0
        });
      } catch (error) {
        console.error('更新可见性设置失败:', error);
      }
    } catch (error) {
      console.error('可见性切换失败:', error);
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

  // 初始化可见性状态：从数据库和系统状态中读取
  useEffect(() => {
    const initializeVisibility = async () => {
      try {
        // 优先从数据库读取用户设置
        const user = await userSettingsService.getCurrentUser();
        if (user && typeof user.floating_window_visible === 'number') {
          const dbVisibility = user.floating_window_visible === 1;
          setIsVisible(dbVisibility);

          // 同步系统状态与数据库状态
          const api: any = (window as any).electronAPI;
          if (api?.visibility?.set) {
            // visibility.set 期望隐身模式的启用状态，与 dbVisibility 相反
            api.visibility.set(!dbVisibility);
          }
        } else {
          // 如果数据库没有设置，从系统状态读取
          const api: any = (window as any).electronAPI;
          const res = await api?.visibility?.get?.();
          if (typeof res?.enabled === 'boolean') {
            setIsVisible(!res.enabled);
          }
        }
      } catch (error) {
        console.error('初始化可见性状态失败:', error);
        // 回退到系统状态
        try {
          const api: any = (window as any).electronAPI;
          const res = await api?.visibility?.get?.();
          if (typeof res?.enabled === 'boolean') {
            setIsVisible(!res.enabled);
          }
        } catch {}
      }
    };

    initializeVisibility();

    // 订阅系统状态变化
    try {
      const api: any = (window as any).electronAPI;
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
          // 语音识别按钮在这些状态下不显示：recording, paused, playing状态
          const shouldNotShow = vState.subState === 'mock-interview-recording' ||
            vState.subState === 'mock-interview-paused' ||
            vState.subState === 'mock-interview-playing' ||
            vState.subState === 'interview-training-recording' ||
            vState.subState === 'interview-training-paused' ||
            vState.subState === 'interview-training-playing';

          return !shouldNotShow;
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
          return (isMI || isIT) && (vState.subState === 'mock-interview-recording' || vState.subState === 'interview-training-recording' ||
            vState.subState === 'mock-interview-playing' || vState.subState === 'interview-training-playing'
          );
        })() && (
          <div className="voice-recording-group">
            {/* Pause 按钮 */}
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <motion.button
                  className="voice-icon-btn pause-btn"
                  onClick={handlePauseClick}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Pause size={16} />
                  </motion.div>
                </motion.button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="radix-tooltip-content">
                  暂停面试
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
          return (isMI || isIT) && (vState.subState === 'mock-interview-paused' ||
            vState.subState === 'interview-training-paused');
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
                  继续面试
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
                  完成面试
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
