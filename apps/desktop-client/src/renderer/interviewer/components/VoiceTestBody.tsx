import * as Tooltip from '@radix-ui/react-tooltip';
import { ChevronDown } from 'lucide-react';
import React from 'react';

interface RecognitionResult {
  text: string;
  error: string;
  timestamp: number;
}

interface VoiceTestBodyProps {
  micDevices: MediaDeviceInfo[];
  speakerDevices: MediaDeviceInfo[];
  selectedMic: string;
  onChangeMic: (id: string) => void;
  selectedSpeaker: string;
  onChangeSpeaker: (id: string) => void;
  micStatus: 'untested' | 'testing' | 'success' | 'failed';
  speakerStatus: 'untested' | 'testing' | 'success' | 'failed';
  onTestMicrophone: () => void | Promise<void>;
  onTestSpeaker: () => void | Promise<void>;
  showingMicResult: boolean;
  showingSpeakerResult: boolean;
  micRecognitionResult: RecognitionResult;
  speakerRecognitionResult: RecognitionResult;
  onStatusClick: (device: 'mic' | 'speaker') => void;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
}

export function VoiceTestBody({
  micDevices,
  speakerDevices,
  selectedMic,
  onChangeMic,
  selectedSpeaker,
  onChangeSpeaker,
  micStatus,
  speakerStatus,
  onTestMicrophone,
  onTestSpeaker,
  showingMicResult,
  showingSpeakerResult,
  micRecognitionResult,
  speakerRecognitionResult,
  onStatusClick,
  getStatusColor,
  getStatusText,
  getStatusIcon,
}: VoiceTestBodyProps) {
  return (
    <div className="voice-test-panel">
      <div className="test-section">
        <h4 className="test-section-title">麦克风测试</h4>
        <div className="test-row">
          <div className="device-select-wrapper">
            <select
              className="device-select"
              value={selectedMic}
              onChange={(e) => onChangeMic(e.target.value)}
            >
              {micDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || '默认麦克风'}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="select-icon" />
          </div>

          <div
            className={`test-status ${getStatusColor(micStatus)}`}
            onClick={() => onStatusClick('mic')}
            style={{ cursor: 'pointer' }}
            title="点击查看麦克风识别结果"
          >
            {getStatusIcon(micStatus)}
            {getStatusText(micStatus)}
          </div>

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                className="test-button"
                onClick={onTestMicrophone}
                disabled={micStatus === 'testing' || speakerStatus === 'testing'}
              >
                测试
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                className="radix-tooltip-content"
                sideOffset={5}
              >
                请说：上午好，下午好，晚上好
                <Tooltip.Arrow className="radix-tooltip-arrow" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>
      </div>

      <div className="test-section">
        <h4 className="test-section-title">扬声器测试</h4>
        <div className="test-row">
          <div className="device-select-wrapper">
            <select
              className="device-select"
              value={selectedSpeaker}
              onChange={(e) => onChangeSpeaker(e.target.value)}
            >
              {speakerDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || '默认扬声器'}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="select-icon" />
          </div>

          <div
            className={`test-status ${getStatusColor(speakerStatus)}`}
            onClick={() => onStatusClick('speaker')}
            style={{ cursor: 'pointer' }}
            title="点击查看扬声器识别结果"
          >
            {getStatusIcon(speakerStatus)}
            {getStatusText(speakerStatus)}
          </div>

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                className="test-button"
                onClick={onTestSpeaker}
                disabled={speakerStatus === 'testing' || micStatus === 'testing'}
              >
                测试
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                className="radix-tooltip-content"
                sideOffset={5}
              >
                播放测试音频
                <Tooltip.Arrow className="radix-tooltip-arrow" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>
      </div>

      {showingMicResult && (micRecognitionResult.text || micRecognitionResult.error) && (
        <div className="recognition-result">
          <h5>麦克风识别结果：</h5>
          {micRecognitionResult.text && (
            <div className="recognized-text">{micRecognitionResult.text}</div>
          )}
          {micRecognitionResult.error && (
            <div className="error-text" style={{ color: '#ff6b6b', marginTop: '8px' }}>
              {micRecognitionResult.error}
            </div>
          )}
          {micRecognitionResult.timestamp > 0 && (
            <div className="timestamp" style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
              {new Date(micRecognitionResult.timestamp).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}

      {showingSpeakerResult && (speakerRecognitionResult.text || speakerRecognitionResult.error) && (
        <div className="recognition-result">
          <h5>扬声器识别结果：</h5>
          {speakerRecognitionResult.text && (
            <div className="recognized-text">{speakerRecognitionResult.text}</div>
          )}
          {speakerRecognitionResult.error && (
            <div className="error-text" style={{ color: '#ff6b6b', marginTop: '8px' }}>
              {speakerRecognitionResult.error}
            </div>
          )}
          {speakerRecognitionResult.timestamp > 0 && (
            <div className="timestamp" style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
              {new Date(speakerRecognitionResult.timestamp).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


