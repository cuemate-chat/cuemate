import * as Separator from '@radix-ui/react-separator';
import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, CornerDownLeft, MousePointer, MousePointerClick, Pause, Play, Square, Type } from 'lucide-react';
import { useEffect, useState } from 'react';
import { logger } from '../../../utils/rendererLogger.js';
import { setVoiceState, useVoiceState } from '../../../utils/voiceState';
import { sendInterviewCommand } from '../../interviewer/utils/interviewCommandChannel';
import { LottieAudioLines } from '../../shared/components/LottieAudioLines';
import { getOngoingInterviewSync } from '../../utils/interviewGuard';
import { userSettingsService } from '../api/userSettingsService';

interface LoggedInControlBarProps {
  // 暂时不添加任何 props
}

export function LoggedInControlBar({}: LoggedInControlBarProps) {
  const [isListenHovered, setIsListenHovered] = useState(false);
  const [isClickThrough, setIsClickThrough] = useState(false);

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
        // completed、error 或 expired 状态：只打开窗口，不改变状态（面试已结束）
        if (vState.subState === 'mock-interview-completed' || vState.subState === 'interview-training-completed' || vState.subState === 'mock-interview-error' || vState.subState === 'interview-training-error' || vState.subState === 'mock-interview-expired' || vState.subState === 'interview-training-expired') {
          // 不做任何状态改变，只打开窗口显示已完成状态
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
      logger.error(`语音识别操作失败: ${error}`);
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
      logger.error(`切换 Interviewer 窗口失败: ${error}`);
    }
  };

  /**
   * 获取当前活跃的面试模式
   * 优先使用 getOngoingInterviewSync()，这样更可靠
   */
  const getActiveInterviewMode = (): 'mock-interview' | 'interview-training' | null => {
    // 优先从 voiceState 获取（最可靠的来源）
    const ongoing = getOngoingInterviewSync();
    if (ongoing) {
      return ongoing.type;
    }
    // 回退到 voiceState hook
    if (vState.mode === 'mock-interview' || vState.mode === 'interview-training') {
      return vState.mode;
    }
    return null;
  };

  const handlePauseClick = async () => {
    // 如果正在停止中，禁止操作
    if (vState.isStopping) return;

    // 暂停面试 - 发送命令到面试窗口
    const mode = getActiveInterviewMode();
    if (mode) {
      // 发送暂停命令
      sendInterviewCommand('pause', mode);
      // 切换到对应模式并打开面试窗口
      try {
        if ((window as any).electronAPI) {
          // 先切换模式，让 Interviewer 窗口显示正在进行的面试页面
          await (window as any).electronAPI.switchToMode(mode);
          await (window as any).electronAPI.showInterviewer();
          setIsInterviewerWindowOpen(true);
        }
      } catch (error) {
        logger.error(`打开面试窗口失败: ${error}`);
      }
    }
  };

  const handlePlayClick = async () => {
    // 如果正在停止中，禁止操作
    if (vState.isStopping) return;

    // 继续面试 - 发送命令到面试窗口
    const mode = getActiveInterviewMode();
    if (mode) {
      // 发送继续命令
      sendInterviewCommand('resume', mode);
      // 切换到对应模式并打开面试窗口
      try {
        if ((window as any).electronAPI) {
          // 先切换模式，让 Interviewer 窗口显示正在进行的面试页面
          await (window as any).electronAPI.switchToMode(mode);
          await (window as any).electronAPI.showInterviewer();
          setIsInterviewerWindowOpen(true);
        }
      } catch (error) {
        logger.error(`打开面试窗口失败: ${error}`);
      }
    }
  };

  const handleDoneClick = async () => {
    // 如果正在停止中，禁止操作
    if (vState.isStopping) return;

    // 停止面试 - 发送命令到面试窗口
    const mode = getActiveInterviewMode();
    if (mode) {
      // 发送停止命令
      sendInterviewCommand('stop', mode);
      // 切换到对应模式并打开面试窗口
      try {
        if ((window as any).electronAPI) {
          // 先切换模式，让 Interviewer 窗口显示正在进行的面试页面
          await (window as any).electronAPI.switchToMode(mode);
          await (window as any).electronAPI.showInterviewer();
          setIsInterviewerWindowOpen(true);
        }
      } catch (error) {
        logger.error(`打开面试窗口失败: ${error}`);
      }
    }
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
      logger.error(`打开 AI 问题窗口失败: ${error}`);
    }
  };

  const handleClickThroughToggle = async () => {
    try {
      const api: any = (window as any).electronAPI;
      const next = !isClickThrough;

      // 先更新系统状态，成功后再更新本地状态和数据库
      if (api?.clickThrough?.set) {
        const result = await api.clickThrough.set(next);
        if (result?.success) {
          setIsClickThrough(next);
        } else {
          logger.error(`设置点击穿透失败: ${result?.error}`);
          return;
        }
      } else {
        logger.error('clickThrough API 不可用');
        return;
      }

      // 系统状态更新成功后，同步更新数据库中的用户设置
      try {
        await userSettingsService.updateSettings({
          floatingWindowVisible: next ? 0 : 1  // 逻辑反转：穿透模式存 0，交互模式存 1
        });
      } catch (error) {
        logger.error(`更新穿透性设置失败: ${error}`);
      }
    } catch (error) {
      logger.error(`穿透性切换失败: ${error}`);
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

  // 监听 Interviewer 窗口可见性变化（当用户手动关闭窗口时同步状态）
  useEffect(() => {
    const api: any = (window as any).electronAPI;
    if (api?.interviewerWindow?.onVisibilityChanged) {
      return api.interviewerWindow.onVisibilityChanged((isVisible: boolean) => {
        setIsInterviewerWindowOpen(isVisible);
      });
    }
  }, []);

  // 初始化穿透性状态：从数据库和系统状态中读取
  useEffect(() => {
    const initializeClickThrough = async () => {
      try {
        // 优先从数据库读取用户设置
        const user = await userSettingsService.getCurrentUser();
        if (user && typeof user.floatingWindowVisible === 'number') {
          const dbClickThrough = user.floatingWindowVisible === 0; // 逻辑反转：0 表示穿透模式
          setIsClickThrough(dbClickThrough);

          // 同步系统状态与数据库状态
          const api: any = (window as any).electronAPI;
          if (api?.clickThrough?.set) {
            await api.clickThrough.set(dbClickThrough);
          }
        } else {
          // 如果数据库没有设置，从系统状态读取
          const api: any = (window as any).electronAPI;
          const res = await api?.clickThrough?.get?.();
          if (typeof res?.enabled === 'boolean') {
            setIsClickThrough(res.enabled);
          }
        }
      } catch (error) {
        logger.error(`初始化穿透性状态失败: ${error}`);
        // 回退到系统状态
        try {
          const api: any = (window as any).electronAPI;
          const res = await api?.clickThrough?.get?.();
          if (typeof res?.enabled === 'boolean') {
            setIsClickThrough(res.enabled);
          }
        } catch {}
      }
    };

    initializeClickThrough();

    // 订阅系统状态变化
    try {
      const api: any = (window as any).electronAPI;
      const off = api?.clickThrough?.onChanged?.((enabled: boolean) => {
        setIsClickThrough(enabled);
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
          // 语音识别按钮在这些状态下不显示：recording, paused, playing 状态
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
                  className={`voice-icon-btn pause-btn${vState.isStopping ? ' disabled' : ''}`}
                  onClick={handlePauseClick}
                  disabled={vState.isStopping}
                  whileTap={{ scale: vState.isStopping ? 1 : 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    whileHover={{ scale: vState.isStopping ? 1 : 1.2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Pause size={16} />
                  </motion.div>
                </motion.button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="radix-tooltip-content">
                  {vState.isStopping ? '正在停止中...' : '暂停面试'}
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
                  className={`voice-icon-btn play-btn${vState.isStopping ? ' disabled' : ''}`}
                  onClick={handlePlayClick}
                  disabled={vState.isStopping}
                  whileTap={{ scale: vState.isStopping ? 1 : 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    whileHover={{ scale: vState.isStopping ? 1 : 1.2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Play size={16} />
                  </motion.div>
                </motion.button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="radix-tooltip-content">
                  {vState.isStopping ? '正在停止中...' : '继续面试'}
                  <Tooltip.Arrow className="radix-tooltip-arrow" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>

            {/* Done 按钮 */}
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <motion.button
                  className={`voice-group-btn done-btn${vState.isStopping ? ' disabled' : ''}`}
                  onClick={handleDoneClick}
                  disabled={vState.isStopping}
                  whileTap={{ scale: vState.isStopping ? 1 : 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    animate={{ scale: vState.isStopping ? 1 : [1, 1.1, 1] }}
                    whileHover={{ scale: vState.isStopping ? 1 : 1.2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <LottieAudioLines
                      size={20}
                      src="/src/assets/Equalizer.gif"
                      alt="Done"
                    />
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: vState.isStopping ? 1 : 1.2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Square size={16} />
                  </motion.div>
                </motion.button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="radix-tooltip-content">
                  {vState.isStopping ? '正在停止中...' : '完成面试'}
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

      {/* 穿透性切换按钮 */}
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <motion.button
            className="visibility-btn"
            onClick={handleClickThroughToggle}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              whileHover={{ scale: 1.2 }}
              transition={{ duration: 0.2 }}
            >
              {isClickThrough ? <MousePointer size={18} /> : <MousePointerClick size={18} />}
            </motion.div>
          </motion.button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="radix-tooltip-content">
            {isClickThrough ? '当前穿透模式，点击恢复交互模式 (⌘⇧CM)' : '当前交互模式，点击启用穿透模式 (⌘⇧CM)'}
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
