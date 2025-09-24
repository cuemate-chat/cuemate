import { ClockIcon, MicrophoneIcon, StopIcon } from '@heroicons/react/24/outline';
import { Button, Card, Form, Input, InputNumber, Select, Spin, Switch, Tabs } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { getAsrConfig, saveAsrConfig, type AsrConfig } from '../../api/asr';
import { message } from '../../components/Message';
import { webSocketService } from '../../services/webSocketService';
import { getAsrServices, normalizeWebSocketUrl, type AsrService } from '../../utils/asr';

// 默认配置值
const DEFAULT_CONFIG = {
  name: 'ASR-Gateway',
  funasr_host: 'localhost',
  funasr_port: 10095,
  funasr_chunk_interval: 5,
  funasr_chunk_size_start: 5,
  funasr_chunk_size_middle: 10,
  funasr_chunk_size_end: 5,
  funasr_mode: 'online' as const,
  funasr_sample_rate: 16000,
  audiotee_sample_rate: 16000 as const,
  audiotee_chunk_duration: 0.2,
  audiotee_include_processes: '[]',
  audiotee_exclude_processes: '[]',
  audiotee_mute_processes: false,
  piper_default_language: 'zh-CN' as const,
  piper_speech_speed: 1.0,
  piper_python_path: 'python3',
  microphone_device_id: '',
  microphone_device_name: '默认麦克风',
  speaker_device_id: '',
  speaker_device_name: '默认扬声器',
  test_duration_seconds: 60,
  recognition_timeout_seconds: 15,
  min_recognition_length: 5,
  max_recognition_length: 30,
};

export default function AsrSettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AsrConfig | null>(null);
  const [services, setServices] = useState<AsrService[]>([]);
  const [form] = Form.useForm();

  // 语音测试相关状态
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [testService, setTestService] = useState('');
  const websocketRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isConnectingRef = useRef(false);
  const lastSendTimeRef = useRef<number>(0);
  const pendingChunksRef = useRef<number>(0);

  // 系统音频扬声器相关状态
  const [isSystemAudioCapturing, setIsSystemAudioCapturing] = useState(false);
  const systemAudioQueueRef = useRef<Blob[]>([]);

  // 音频设备相关状态
  const [availableMicDevices, setAvailableMicDevices] = useState<Array<{ deviceId: string; label: string }>>([]);
  const [availableSpeakerDevices, setAvailableSpeakerDevices] = useState<Array<{ deviceId: string; label: string }>>([]);
  const [selectedMicDevice, setSelectedMicDevice] = useState<string>('');

  // 获取麦克风设备
  const loadMicDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const micDevices = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `麦克风 ${device.deviceId.slice(0, 8)}...`
        }));

      setAvailableMicDevices(micDevices);
      if (micDevices.length > 0 && !selectedMicDevice) {
        setSelectedMicDevice(micDevices[0].deviceId);
      }
    } catch (error) {
      console.error('获取麦克风设备失败:', error);
      setAvailableMicDevices([{ deviceId: '', label: '默认麦克风' }]);
    }
  };

  // 获取扬声器设备
  const loadSpeakerDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const speakerDevices = devices
        .filter(device => device.kind === 'audiooutput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `扬声器 ${device.deviceId.slice(0, 8)}...`
        }));

      setAvailableSpeakerDevices(speakerDevices);
    } catch (error) {
      console.error('获取扬声器设备失败:', error);
      setAvailableSpeakerDevices([{ deviceId: '', label: '默认扬声器' }]);
    }
  };

  // 加载配置
  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await getAsrConfig();
      setConfig(data.config);

      // 使用后端返回的服务列表，如果没有则使用默认配置
      let asrServices: AsrService[];
      if (data.services && data.services.length > 0) {
        asrServices = data.services.map(s => ({
          name: s.name,
          url: normalizeWebSocketUrl(s.url, s.name),
          displayName: '统一语音识别',
          description: '支持麦克风和扬声器音频输入'
        }));
      } else {
        asrServices = getAsrServices();
      }

      setServices(asrServices);
      if (!testService && asrServices.length > 0) {
        setTestService(asrServices[0].url);
      }
      if (data.config) {
        // 设置表单值
        form.setFieldsValue({
          ...data.config,
          // 处理JSON字符串字段
          audiotee_include_processes: data.config.audiotee_include_processes || '[]',
          audiotee_exclude_processes: data.config.audiotee_exclude_processes || '[]',
        });
      }
    } catch (error: any) {
      console.error('加载配置失败：', error);
    } finally {
      setLoading(false);
    }
  };

  // 保存配置
  const saveConfig = async (values: any) => {
    setSaving(true);
    try {
      const data = await saveAsrConfig(values);
      message.success(data.message || '配置已保存');
      setConfig(data.config);
    } catch (error: any) {
      console.error('保存失败：', error);
    } finally {
      setSaving(false);
    }
  };

  // 绘制默认波形（未录音状态）
  const drawDefaultWaveform = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerY = canvas.height / 2;
    const time = Date.now() * 0.002;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制中心基线
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();

    // 绘制慢速脉冲波形
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let x = 0; x < canvas.width; x += 2) {
      const frequency = 0.02;
      const amplitude = Math.sin(time + x * frequency) * 8;
      const y = centerY + amplitude * Math.sin(time * 0.5);

      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // 添加"等待录音"文字
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('等待音频输入...', canvas.width / 2, centerY + 25);

    if (!isRecording) {
      animationRef.current = requestAnimationFrame(drawDefaultWaveform);
    }
  };

  // 音频波形绘制（录音状态）
  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;

    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制渐变背景
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(24, 144, 255, 0.1)');
    gradient.addColorStop(0.5, 'rgba(24, 144, 255, 0.05)');
    gradient.addColorStop(1, 'rgba(24, 144, 255, 0.1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制中心基线
    const centerY = canvas.height / 2;
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();

    // 绘制音频波形
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1890ff';
    ctx.beginPath();

    const sliceWidth = canvas.width / bufferLength;
    let x = 0;
    let maxAmplitude = 0;

    // 计算最大振幅用于动态缩放
    for (let i = 0; i < bufferLength; i++) {
      const amplitude = Math.abs(dataArray[i] - 128);
      maxAmplitude = Math.max(maxAmplitude, amplitude);
    }

    // 动态调整缩放因子
    const scaleFactor = maxAmplitude > 0 ? Math.min(2, 60 / maxAmplitude) : 1;

    for (let i = 0; i < bufferLength; i++) {
      const v = (dataArray[i] - 128) / 128.0;
      const y = centerY + (v * centerY * scaleFactor);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();

    // 绘制波形填充
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#1890ff';
    ctx.fill();
    ctx.globalAlpha = 1;

    // 显示音量级别
    const volumeLevel = Math.round((maxAmplitude / 128) * 100);
    ctx.fillStyle = volumeLevel > 30 ? '#52c41a' : '#faad14';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`音量: ${volumeLevel}%`, canvas.width - 10, 15);

    animationRef.current = requestAnimationFrame(drawWaveform);
  };

  // 语音测试功能

  // 面试者模式：麦克风音频识别（直接通过浏览器获取麦克风）
  const startIntervieweeRecording = async () => {
    try {
      console.log('启动面试者麦克风音频识别模式');

      // 1. 获取麦克风权限和音频流（使用配置中的设备）
      const micDeviceId = config?.microphone_device_id || selectedMicDevice;
      const constraints: MediaStreamConstraints = {
        audio: micDeviceId ? { deviceId: { exact: micDeviceId } } : true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // 2. 设置音频上下文用于波形显示
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // 开始绘制波形
      drawWaveform();

      // 3. 连接ASR服务
      const asrServiceUrl = testService;
      websocketRef.current = new WebSocket(asrServiceUrl);

      websocketRef.current.onopen = () => {
        console.log('面试者ASR WebSocket连接成功:', asrServiceUrl);
        message.success('麦克风识别服务已连接');
        setTranscriptText("麦克风识别已启动，请开始说话...");
        isConnectingRef.current = false;
      };

      websocketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('麦克风音频识别结果:', data);

          if (pendingChunksRef.current > 0) {
            pendingChunksRef.current--;
          }

          // 构建显示文本
          let displayText = '';

          // 处理已确认的转录行
          if (data.lines && Array.isArray(data.lines)) {
            data.lines.forEach((line: any) => {
              let lineText = '';
              if (line.speaker === -2) {
                lineText = `[静音 ${line.beg || ''}-${line.end || ''}]`;
              } else if (line.speaker > 0) {
                lineText = `说话人${line.speaker}: ${line.text || ''}`;
              } else if (line.text) {
                lineText = line.text;
              }
              if (lineText) {
                displayText += lineText + '\n';
              }
            });
          }

          // 添加缓冲区内容
          if (data.buffer_transcription) {
            displayText += `[转录中] ${data.buffer_transcription}\n`;
          }

          if (displayText.trim()) {
            setTranscriptText(displayText.trim());
          } else if (data.status === "no_audio_detected") {
            setTranscriptText("未检测到语音信号，请检查麦克风...");
          }

        } catch (error) {
          console.error('处理麦克风音频识别结果失败:', error);
        }
      };

      websocketRef.current.onerror = (error) => {
        console.error('麦克风音频识别WebSocket错误:', error);
        message.error('麦克风识别服务连接失败');
        setTranscriptText('[错误] 麦克风识别服务连接失败\n请检查ASR服务是否启动');
        isConnectingRef.current = false;
        stopRecording();
      };

      // 4. 设置MediaRecorder录制麦克风音频并发送到ASR服务
      recorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      recorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          if (websocketRef.current?.readyState === WebSocket.OPEN) {
            try {
              const now = Date.now();
              const timeSinceLastSend = now - lastSendTimeRef.current;

              if (timeSinceLastSend < 200) {
                console.debug('发送频率过高，跳过此次数据');
                return;
              }

              if (pendingChunksRef.current > 5) {
                console.warn('服务端处理较慢，跳过此次数据发送');
                return;
              }

              websocketRef.current.send(event.data);
              lastSendTimeRef.current = now;
              pendingChunksRef.current++;
              console.debug('麦克风音频数据已发送:', event.data.size, 'bytes');
            } catch (error) {
              console.error('发送麦克风音频数据失败:', error);
              stopRecording();
            }
          }
        }
      };

      recorderRef.current.onerror = (event) => {
        console.error('麦克风录音器错误:', event);
        message.error('录音过程中发生错误');
        isConnectingRef.current = false;
        stopRecording();
      };

      // 启动录制，250ms间隔发送
      recorderRef.current.start(250);

      setIsRecording(true);
      setRecordingTime(0);

      // 启动计时器
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      message.error('无法访问麦克风，请检查浏览器权限');
      console.error('麦克风识别错误:', error);
      isConnectingRef.current = false;
    }
  };

  // 统一的启动入口，根据服务类型选择不同的识别模式
  const startRecording = async () => {
    if (isConnectingRef.current || isRecording) {
      console.log('正在连接中或已在录音，跳过');
      return;
    }

    isConnectingRef.current = true;
    setTranscriptText("正在连接语音识别服务...");

    // 确保之前的连接完全清理
    await stopRecording();

    // 等待一小段时间确保资源完全释放
    await new Promise(resolve => setTimeout(resolve, 500));

    // 根据选择的服务确定音频源和识别模式
    const isUnifiedService = testService.includes('10095');

    if (isUnifiedService) {
      // 统一服务：支持麦克风和扬声器模式
      await startIntervieweeRecording();
    } else {
      // 兼容性：麦克风识别
      await startIntervieweeRecording();
    }
  };

  // 停止录音功能

  const stopRecording = async () => {
    // 重置连接状态标志
    isConnectingRef.current = false;
    lastSendTimeRef.current = 0;
    pendingChunksRef.current = 0;

    // 停止系统音频扬声器捕获
    if (isSystemAudioCapturing) {
      webSocketService.stopSystemAudioCapture();
      setIsSystemAudioCapturing(false);
      systemAudioQueueRef.current = [];
    }

    // 停止音频波形动画
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    // 停止录音器
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch (error) {
        console.warn('停止录音器时出错:', error);
      }
      recorderRef.current = null;
    }

    // 停止媒体流
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('媒体轨道已停止:', track.kind);
      });
      streamRef.current = null;
    }

    // 清理分析器引用
    if (analyserRef.current) {
      analyserRef.current = null;
    }

    // 清理音频上下文
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        await audioContextRef.current.close();
        console.log('AudioContext 已关闭');
      } catch (error) {
        console.warn('关闭 AudioContext 时出错:', error);
      }
      audioContextRef.current = null;
    }

    // 关闭 WebSocket 连接
    if (websocketRef.current) {
      if (websocketRef.current.readyState === WebSocket.OPEN) {
        try {
          // 发送结束信号
          const emptyBlob = new Blob([], { type: 'audio/webm' });
          websocketRef.current.send(emptyBlob);
        } catch (error) {
          console.warn('发送结束信号时出错:', error);
        }
      }

      if (websocketRef.current.readyState !== WebSocket.CLOSED) {
        websocketRef.current.close();
      }
      websocketRef.current = null;
    }

    // 停止计时器
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // 清空画布
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }

    setIsRecording(false);

    // 恢复默认波形动画
    setTimeout(() => {
      drawDefaultWaveform();
    }, 200);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    loadConfig();
    loadMicDevices();      // 加载麦克风设备
    loadSpeakerDevices();  // 加载扬声器设备

    // 启动默认波形动画
    setTimeout(() => {
      drawDefaultWaveform();
    }, 100);

    // 设置WebSocket消息监听
    const handleSystemAudioData = (message: any) => {
      if (message.data?.audioData && websocketRef.current?.readyState === WebSocket.OPEN) {
        try {
          // 将base64音频数据转换为Blob
          const audioData = atob(message.data.audioData);
          const audioBuffer = new Uint8Array(audioData.length);
          for (let i = 0; i < audioData.length; i++) {
            audioBuffer[i] = audioData.charCodeAt(i);
          }
          const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });

          // 发送到ASR WebSocket
          websocketRef.current.send(audioBlob);
          console.debug('System audio data sent to ASR:', audioBlob.size, 'bytes');
        } catch (error) {
          console.error('处理系统音频扬声器数据失败:', error);
        }
      }
    };

    const handleSystemAudioStatus = (wsMessage: any) => {
      console.log('System audio status:', wsMessage.type, wsMessage.data);

      switch (wsMessage.type) {
        case 'SYSTEM_AUDIO_CAPTURE_STARTED':
          message.success('系统音频扬声器捕获已开始');
          setTranscriptText('系统音频扬声器捕获已启动，等待音频输入...');
          break;

        case 'SYSTEM_AUDIO_CAPTURE_FAILED':
        case 'SYSTEM_AUDIO_ERROR':
          message.error(`系统音频扬声器捕获失败: ${wsMessage.data?.error || '未知错误'}`);
          setIsSystemAudioCapturing(false);
          setTranscriptText(`[错误] ${wsMessage.data?.error || '系统音频扬声器捕获失败'}`);
          break;

        case 'SYSTEM_AUDIO_CAPTURE_STOPPED':
          message.info('系统音频扬声器捕获已停止');
          setIsSystemAudioCapturing(false);
          console.log('系统音频扬声器捕获已停止');
          break;
      }
    };

    // 注册消息监听器
    webSocketService.onMessage('SYSTEM_AUDIO_DATA', handleSystemAudioData);
    webSocketService.onMessage('SYSTEM_AUDIO_CAPTURE_STARTED', handleSystemAudioStatus);
    webSocketService.onMessage('SYSTEM_AUDIO_CAPTURE_FAILED', handleSystemAudioStatus);
    webSocketService.onMessage('SYSTEM_AUDIO_ERROR', handleSystemAudioStatus);
    webSocketService.onMessage('SYSTEM_AUDIO_CAPTURE_STOPPED', handleSystemAudioStatus);

    // 清理函数
    return () => {
      // 异步清理资源
      stopRecording().catch(error => {
        console.warn('清理资源时出错:', error);
      });

      // 移除消息监听器
      webSocketService.offMessage('SYSTEM_AUDIO_DATA', handleSystemAudioData);
      webSocketService.offMessage('SYSTEM_AUDIO_CAPTURE_STARTED', handleSystemAudioStatus);
      webSocketService.offMessage('SYSTEM_AUDIO_CAPTURE_FAILED', handleSystemAudioStatus);
      webSocketService.offMessage('SYSTEM_AUDIO_ERROR', handleSystemAudioStatus);
      webSocketService.offMessage('SYSTEM_AUDIO_CAPTURE_STOPPED', handleSystemAudioStatus);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <header>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-semibold text-slate-900">语音识别设置</h1>
        </div>
      </header>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={saveConfig}
          initialValues={config || {}}
        >
          <Tabs
            items={[
              {
                key: 'devices',
                label: '设备配置',
                children: (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Form.Item
                        name="microphone_device_id"
                        label="麦克风音源"
                      >
                        <Select
                          placeholder="选择麦克风设备"
                          loading={availableMicDevices.length === 0}
                          options={availableMicDevices.map(device => ({
                            value: device.deviceId,
                            label: device.label
                          }))}
                          onChange={(value) => {
                            const selectedDevice = availableMicDevices.find(d => d.deviceId === value);
                            if (selectedDevice) {
                              form.setFieldValue('microphone_device_name', selectedDevice.label);
                            }
                          }}
                        />
                      </Form.Item>

                      <Form.Item
                        name="microphone_device_name"
                        label="麦克风设备名称"
                      >
                        <Input placeholder="默认麦克风" />
                      </Form.Item>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Form.Item
                        name="speaker_device_id"
                        label="扬声器音源"
                      >
                        <Select
                          placeholder="选择扬声器设备"
                          loading={availableSpeakerDevices.length === 0}
                          options={availableSpeakerDevices.map(device => ({
                            value: device.deviceId,
                            label: device.label
                          }))}
                          onChange={(value) => {
                            const selectedDevice = availableSpeakerDevices.find(d => d.deviceId === value);
                            if (selectedDevice) {
                              form.setFieldValue('speaker_device_name', selectedDevice.label);
                            }
                          }}
                        />
                      </Form.Item>

                      <Form.Item
                        name="speaker_device_name"
                        label="扬声器设备名称"
                      >
                        <Input placeholder="默认扬声器" />
                      </Form.Item>
                    </div>
                  </div>
                ),
              },
              {
                key: 'funasr',
                label: 'FunASR 配置',
                children: (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Form.Item
                        name="name"
                        label="配置名称"
                        rules={[{ required: true, message: '请输入配置名称' }]}
                      >
                        <Input placeholder="ASR-Gateway" />
                      </Form.Item>

                      <Form.Item
                        name="funasr_host"
                        label="FunASR 主机地址"
                        rules={[{ required: true, message: '请输入主机地址' }]}
                      >
                        <Input placeholder="localhost" />
                      </Form.Item>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Form.Item
                        name="funasr_port"
                        label="FunASR 端口"
                        rules={[{ required: true, message: '请输入端口' }]}
                      >
                        <InputNumber
                          min={1}
                          max={65535}
                          style={{ width: '100%' }}
                          placeholder="10095"
                        />
                      </Form.Item>

                      <Form.Item
                        name="funasr_mode"
                        label="识别模式"
                        rules={[{ required: true, message: '请选择识别模式' }]}
                      >
                        <Select placeholder="选择模式">
                          <Select.Option value="online">在线模式</Select.Option>
                          <Select.Option value="offline">离线模式</Select.Option>
                          <Select.Option value="2pass">两遍模式</Select.Option>
                        </Select>
                      </Form.Item>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Form.Item
                        name="funasr_sample_rate"
                        label="采样率 (Hz)"
                        rules={[{ required: true, message: '请输入采样率' }]}
                      >
                        <InputNumber
                          min={8000}
                          max={48000}
                          step={1000}
                          style={{ width: '100%' }}
                          placeholder="16000"
                        />
                      </Form.Item>

                      <Form.Item
                        name="funasr_chunk_interval"
                        label="音频块间隔"
                      >
                        <InputNumber
                          min={1}
                          max={20}
                          style={{ width: '100%' }}
                          placeholder="5"
                        />
                      </Form.Item>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <Form.Item
                        name="funasr_chunk_size_start"
                        label="起始块大小"
                      >
                        <InputNumber
                          min={1}
                          max={20}
                          style={{ width: '100%' }}
                          placeholder="5"
                        />
                      </Form.Item>

                      <Form.Item
                        name="funasr_chunk_size_middle"
                        label="中间块大小"
                      >
                        <InputNumber
                          min={1}
                          max={20}
                          style={{ width: '100%' }}
                          placeholder="10"
                        />
                      </Form.Item>

                      <Form.Item
                        name="funasr_chunk_size_end"
                        label="结束块大小"
                      >
                        <InputNumber
                          min={1}
                          max={20}
                          style={{ width: '100%' }}
                          placeholder="5"
                        />
                      </Form.Item>
                    </div>
                  </div>
                ),
              },
              {
                key: 'audiotee',
                label: 'AudioTee 配置',
                children: (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Form.Item
                        name="audiotee_sample_rate"
                        label="AudioTee 采样率"
                        rules={[{ required: true, message: '请选择采样率' }]}
                      >
                        <Select placeholder="选择采样率">
                          <Select.Option value={8000}>8000 Hz</Select.Option>
                          <Select.Option value={16000}>16000 Hz (推荐)</Select.Option>
                          <Select.Option value={22050}>22050 Hz</Select.Option>
                          <Select.Option value={24000}>24000 Hz</Select.Option>
                          <Select.Option value={32000}>32000 Hz</Select.Option>
                          <Select.Option value={44100}>44100 Hz</Select.Option>
                          <Select.Option value={48000}>48000 Hz</Select.Option>
                        </Select>
                      </Form.Item>

                      <Form.Item
                        name="audiotee_chunk_duration"
                        label="音频块时长 (秒)"
                      >
                        <InputNumber
                          min={0.1}
                          max={2.0}
                          step={0.1}
                          style={{ width: '100%' }}
                          placeholder="0.2"
                        />
                      </Form.Item>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Form.Item
                        name="audiotee_include_processes"
                        label="包含进程列表 (JSON)"
                      >
                        <Input.TextArea
                          placeholder='["1234", "5678"]'
                          rows={2}
                        />
                      </Form.Item>

                      <Form.Item
                        name="audiotee_exclude_processes"
                        label="排除进程列表 (JSON)"
                      >
                        <Input.TextArea
                          placeholder='["9999"]'
                          rows={2}
                        />
                      </Form.Item>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <Form.Item
                        name="audiotee_mute_processes"
                        valuePropName="checked"
                        label="静音被捕获的进程"
                      >
                        <Switch />
                      </Form.Item>
                    </div>
                  </div>
                ),
              },
              {
                key: 'piper',
                label: 'Piper TTS 配置',
                children: (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Form.Item
                        name="piper_default_language"
                        label="默认语言"
                        rules={[{ required: true, message: '请选择默认语言' }]}
                      >
                        <Select placeholder="选择语言">
                          <Select.Option value="zh-CN">中文 (zh-CN)</Select.Option>
                          <Select.Option value="en-US">英文 (en-US)</Select.Option>
                        </Select>
                      </Form.Item>

                      <Form.Item
                        name="piper_speech_speed"
                        label="语音速度"
                      >
                        <InputNumber
                          min={0.5}
                          max={2.0}
                          step={0.1}
                          style={{ width: '100%' }}
                          placeholder="1.0"
                        />
                      </Form.Item>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <Form.Item
                        name="piper_python_path"
                        label="Python 可执行文件路径"
                      >
                        <Input placeholder="python3" />
                      </Form.Item>
                    </div>
                  </div>
                ),
              },
              {
                key: 'testing',
                label: '测试配置',
                children: (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Form.Item
                        name="test_duration_seconds"
                        label="测试持续时间 (秒)"
                      >
                        <InputNumber
                          min={10}
                          max={300}
                          style={{ width: '100%' }}
                          placeholder="60"
                        />
                      </Form.Item>

                      <Form.Item
                        name="recognition_timeout_seconds"
                        label="识别超时时间 (秒)"
                      >
                        <InputNumber
                          min={5}
                          max={60}
                          style={{ width: '100%' }}
                          placeholder="15"
                        />
                      </Form.Item>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Form.Item
                        name="min_recognition_length"
                        label="最小识别长度"
                      >
                        <InputNumber
                          min={1}
                          max={50}
                          style={{ width: '100%' }}
                          placeholder="5"
                        />
                      </Form.Item>

                      <Form.Item
                        name="max_recognition_length"
                        label="最大识别长度"
                      >
                        <InputNumber
                          min={10}
                          max={200}
                          style={{ width: '100%' }}
                          placeholder="30"
                        />
                      </Form.Item>
                    </div>
                  </div>
                ),
              },
            ]}
          />

          <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
            <Button
              onClick={() => {
                form.resetFields();
                form.setFieldsValue(DEFAULT_CONFIG);
              }}
            >
              重置
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
            >
              保存配置
            </Button>
          </div>
        </Form>

        {/* 语音识别测试 */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-lg font-medium mb-4">语音识别测试</h3>

          {/* 服务选择 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择测试服务
            </label>
            <Select
              value={testService}
              onChange={setTestService}
              style={{ width: '100%' }}
              options={services.map(service => ({
                value: service.url,
                label: `${service.displayName} - ${service.description} (${service.url})`
              }))}
            />
          </div>


          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左侧：录音控制 */}
            <div className="space-y-4">
              <div className="border rounded-lg p-6 text-center">
                <div className="mb-4">
                  <Button
                    type={isRecording ? 'default' : 'primary'}
                    danger={isRecording}
                    size="large"
                    icon={isRecording ? <StopIcon className="w-6 h-6" /> : <MicrophoneIcon className="w-6 h-6" />}
                    onClick={isRecording ? stopRecording : startRecording}
                    className="px-8 py-6 h-auto text-lg"
                  >
                    {isRecording
                      ? '停止捕获'
                      : '开始录音'
                    }
                  </Button>
                </div>

                {/* 音频波形 */}
                <div className="mb-4 p-2 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg border-2 border-dashed border-slate-200">
                  <canvas
                    ref={canvasRef}
                    width={300}
                    height={60}
                    className="rounded bg-white shadow-inner mx-auto"
                    style={{
                      width: '300px',
                      height: '60px',
                      boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
                    }}
                  />
                  <div className="text-xs text-center mt-1 text-slate-500">
                    {isRecording ? '正在捕获音频信号...' : '音频波形显示区域'}
                  </div>
                </div>

                {/* 录音状态信息 */}
                <div className="space-y-2 text-sm">
                  {isRecording && (
                    <div className="flex items-center gap-2 text-lg font-mono text-red-500">
                      <ClockIcon className="w-5 h-5" />
                      {formatTime(recordingTime)}
                    </div>
                  )}
                </div>
              </div>

              {/* 使用说明 */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">使用说明：</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 确保 Docker 服务已启动</li>
                  <li>• 选择要测试的服务端口</li>
                  <li>• 允许麦克风权限</li>
                  <li>• 直接对着麦克风说话进行测试</li>
                  <li>• 支持实时语音转录</li>
                  <li>• 音频波形显示捕获状态</li>
                  <li>• 右侧显示实时转录结果</li>
                </ul>
              </div>
            </div>

            {/* 右侧：转录结果 */}
            <div>
              <h4 className="font-medium text-gray-800 mb-2">实时转录结果</h4>
              <div
                className="border rounded-lg p-4 min-h-80 bg-gray-50 whitespace-pre-wrap overflow-y-auto"
                style={{ fontFamily: 'monospace', fontSize: '14px' }}
              >
                {transcriptText || '点击"开始录音"测试语音识别功能...'}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}