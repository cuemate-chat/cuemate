import * as Separator from '@radix-ui/react-separator';
import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, CornerDownLeft, Eye, EyeOff, Pause, Play, Square, Type } from 'lucide-react';
import { useState } from 'react';
import { LottieAudioLines } from '../../shared/components/LottieAudioLines';

interface LoggedInControlBarProps {
  // 暂时不添加任何 props
}

export function LoggedInControlBar({}: LoggedInControlBarProps) {
  const [isListenHovered, setIsListenHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  
  // 语音识别状态：'idle' | 'recording' | 'stopped'
  const [voiceState, setVoiceState] = useState<'idle' | 'recording' | 'stopped'>('idle');
  const [isInterviewerWindowOpen, setIsInterviewerWindowOpen] = useState(false);
  

  const handleListenClick = async () => {
    try {
      if (voiceState === 'idle') {
        // 开始录制
        setVoiceState('recording');
        if ((window as any).electronAPI) {
          await (window as any).electronAPI.showInterviewer();
          setIsInterviewerWindowOpen(true);
        }
      } else if (voiceState === 'recording') {
        // 暂停录制
        setVoiceState('stopped');
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

  const handleDoneClick = () => {
    setVoiceState('idle');
    setIsInterviewerWindowOpen(false);
    // 可以在这里添加保存录制结果的逻辑
  };

  const handlePlayClick = () => {
    // 播放录制内容的逻辑
    console.log('播放录制内容');
  };

  const handleAskQuestionClick = async () => {
    try {
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.toggleAIQuestion();
      }
    } catch (error) {
      console.error('打开AI问题窗口失败:', error);
    }
  };

  const handleVisibilityToggle = () => {
    setIsVisible(!isVisible);
    // TODO: 实现可见性切换功能
    console.log('Visibility toggled:', !isVisible);
  };

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
        {voiceState === 'idle' && (
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

        {voiceState === 'recording' && (
          <div className="voice-recording-group">
            {/* Pause 按钮 */}
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <motion.button
                  className="voice-icon-btn pause-btn"
                  onClick={handleListenClick}
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
                  暂停录制
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

        {voiceState === 'stopped' && (
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
            className="ask-question-btn"
            onClick={handleAskQuestionClick}
            whileTap={{ scale: 0.95 }}
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
            您可以询问任何问题给到 AI，快捷键： <span className="shortcut-key">⌘</span> + <span className="shortcut-key-icon"><CornerDownLeft size={12} /></span>
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
            {isVisible ? '当前可见，点击隐藏程序坞 Dock 图标，以及截图、共享屏幕不可见' : '当前隐藏，点击显示程序坞 Dock 图标，以及截图、共享屏幕可见'}
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
