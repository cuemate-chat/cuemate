import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { History, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { logger } from '../../../../utils/rendererLogger.js';
import CueMateLogo from '../../../../assets/CueMate.png';
import { useVoiceState } from '../../../../utils/voiceState';
import { userSettingsService } from '../../../control-bar/api/userSettingsService';
import { LottieAudioLines } from '../../../shared/components/LottieAudioLines';

// 头部内的加载动画
const LoadingDots = () => {
  return (
    <div className="loading-dots">
      <motion.span
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
        className="dot"
      />
      <motion.span
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
        className="dot"
      />
      <motion.span
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
        className="dot"
      />
    </div>
  );
};

interface WindowHeaderProps {
  isLoading: boolean;
  onClose: () => void;
  onOpenHistory?: () => void;
  heightPercentage: number;
  onHeightChange: (percentage: number) => void;
}

export function VoiceQAHeader({ isLoading, onClose, onOpenHistory, heightPercentage, onHeightChange }: WindowHeaderProps) {
  const [showControls, setShowControls] = useState(false);
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>('');
  const vState = useVoiceState();

  useEffect(() => {
    (async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter(d => d.kind === 'audioinput');
        setMicDevices(mics);
        try {
          const electronAPI: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
          const res = await electronAPI?.asrConfig?.get?.();
          const cfg = res?.config;
          const defaultMic = cfg?.microphone_device_id;
          if (defaultMic && mics.find(m => m.deviceId === defaultMic)) {
            setSelectedMic(defaultMic);
          } else if (mics.length > 0 && !selectedMic) {
            setSelectedMic(mics[0].deviceId);
          }
        } catch {}
      } catch (e) {
        logger.error(`获取麦克风设备失败: ${e}`);
      }
    })();
    try {
      const electronAPI: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
      const off = electronAPI?.asrConfig?.onChanged?.((cfg: any) => {
        if (cfg?.microphone_device_id && micDevices.some(d => d.deviceId === cfg.microphone_device_id)) {
          setSelectedMic(cfg.microphone_device_id);
        }
      });
      return () => { try { off?.(); } catch {} };
    } catch {}
  }, []);

  return (
    <div 
      className="ai-window-header"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <div className="ai-header-left">
        <img src={CueMateLogo} alt="CueMate" className="ai-logo" />
        <div className="ai-title">{isLoading ? 'Think' : '语音提问 - AI Response'}</div>
        {isLoading && <LoadingDots />}
        {micDevices.length > 0 && (
          <div style={{ marginLeft: 8, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              className="ai-height-selector"
              value={selectedMic}
              onChange={async (e) => {
                const value = e.target.value;
                setSelectedMic(value);
                try {
                  const selected = micDevices.find(d => d.deviceId === value);
                  const name = selected?.label || '默认麦克风';
                  const electronAPI: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
                  await electronAPI?.asrConfig?.updateDevices?.({
                    microphone_device_id: value,
                    microphone_device_name: name,
                  });
                } catch {}
              }}
            >
              {micDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>{device.label || '默认麦克风'}</option>
              ))}
            </select>

            {/* 语音识别状态指示器 */}
            {typeof vState.subState === 'string' && vState.subState.endsWith('ing') && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: '#ffffff'
                }}
              >
                <LottieAudioLines
                  size={16}
                  alt="Recording"
                />
                <span style={{ fontSize: '12px', fontWeight: '500' }}>说话中</span>
              </motion.div>
            )}
          </div>
        )}
      </div>
      <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
        <div className={`ai-header-right ${showControls ? 'show' : 'hide'}`}>
          {/* 高度选择下拉框 */}
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <select
                className="ai-height-selector"
                value={heightPercentage}
                onChange={async (e) => {
                  const newHeight = Number(e.target.value);

                  // 更新本地状态
                  onHeightChange(newHeight);

                  // 同步更新数据库中的用户设置
                  try {
                    await userSettingsService.updateSettings({
                      floating_window_height: newHeight
                    });
                  } catch (error) {
                    logger.error(`更新窗口高度设置失败: ${error}`);
                  }
                }}
              >
                <option value={50}>50%</option>
                <option value={75}>75%</option>
                <option value={100}>100%</option>
              </select>
            </Tooltip.Trigger>
            <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
              选择窗口显示的高度
              <Tooltip.Arrow className="radix-tooltip-arrow" />
            </Tooltip.Content>
          </Tooltip.Root>
          
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button 
                className="ai-header-btn"
                onClick={() => {
                  try {
                    (window as any).electronAPI?.showAIQuestionHistory?.();
                  } catch {}
                  onOpenHistory && onOpenHistory();
                }}
              >
                <History size={16} />
                <span className="ai-header-btn-text">AI 提问历史记录</span>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
              点击切换历史记录窗口
              <Tooltip.Arrow className="radix-tooltip-arrow" />
            </Tooltip.Content>
          </Tooltip.Root>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button 
                className="ai-header-btn"
                onClick={onClose}
              >
                <X size={16} />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
              关闭当前窗口
              <Tooltip.Arrow className="radix-tooltip-arrow" />
            </Tooltip.Content>
          </Tooltip.Root>
        </div>
      </Tooltip.Provider>
    </div>
  );
}


