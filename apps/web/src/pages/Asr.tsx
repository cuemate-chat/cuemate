import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/outline';
import { Button, Card, Form, Input, InputNumber, Select, Spin, Switch, Tabs } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { getAsrConfig, saveAsrConfig, type AsrConfig } from '../api/asr';
import { message } from '../components/Message';
import { getAsrServices, normalizeWebSocketUrl, type AsrService } from '../utils/asr';

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
          displayName: s.name === 'asr-user' ? '面试者语音识别' : '面试官语音识别',
          description: s.name === 'asr-user' ? '麦克风输入' : '系统音频输出'
        }));
      } else {
        asrServices = getAsrServices();
      }

      setServices(asrServices);
      if (!testService && asrServices.length > 0) {
        setTestService(asrServices[0].url);
      }
      if (data.config) {
        // 确保表单获得完整的数据
        form.setFieldsValue({
          ...data.config,
          // 处理可能的 null 值
          vac_chunk_size: data.config.vac_chunk_size || undefined,
          buffer_trimming_sec: data.config.buffer_trimming_sec || undefined,
          frame_threshold: data.config.frame_threshold || undefined,
          beams: data.config.beams || undefined,
          audio_max_len: data.config.audio_max_len || undefined,
          audio_min_len: data.config.audio_min_len || undefined,
          max_context_tokens: data.config.max_context_tokens || undefined,
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
  const startRecording = async () => {
    try {
      // 防止重复连接
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
      
      // 根据选择的服务确定音频源
      const isInterviewerService = testService.includes('8002');
      let stream;
      
      if (isInterviewerService) {
        // 面试官服务：尝试捕获系统音频
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({ 
            video: false, 
            audio: true 
          });
          message.info('已开始捕获系统音频输出');
        } catch (error) {
          message.warning('无法直接捕获系统音频，将使用麦克风替代测试');
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
      } else {
        // 面试者服务：使用麦克风
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      
      // 保存流的引用
      streamRef.current = stream;
      
      // 设置音频上下文和分析器
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      // 开始绘制波形
      drawWaveform();
      
      // 连接 WebSocket
      websocketRef.current = new WebSocket(testService);
      
      websocketRef.current.onopen = () => {
        console.log('WebSocket 连接成功:', testService);
        message.success('已连接到语音识别服务');
        setTranscriptText("已连接，等待语音输入...");
        isConnectingRef.current = false; // 连接成功后重置标志
      };
      
      websocketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('收到 WebSocket 数据:', data);
          
          // 收到响应时减少待处理计数
          if (pendingChunksRef.current > 0) {
            pendingChunksRef.current--;
          }

          if (data.type === "ready_to_stop") {
            console.log("Ready to stop received");
            setTranscriptText(prev => `${prev}\n\n[处理完成]`);
            if (websocketRef.current) {
              websocketRef.current.close();
              websocketRef.current = null;
            }
            return;
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
          
          if (data.buffer_diarization) {
            displayText += `[分离中] ${data.buffer_diarization}\n`;
          }

          // 显示处理延迟信息
          if (data.remaining_time_transcription > 0 || data.remaining_time_diarization > 0) {
            displayText += `[延迟: 转录${(data.remaining_time_transcription || 0).toFixed(1)}s`;
            if (data.remaining_time_diarization > 0) {
              displayText += `, 分离${data.remaining_time_diarization.toFixed(1)}s`;
            }
            displayText += ']\n';
          }

          // 处理其他可能的文本格式
          if (!displayText && data.text) {
            displayText = data.text;
          }

          // 更新转录结果
          if (displayText.trim()) {
            setTranscriptText(displayText.trim());
          } else if (data.status === "no_audio_detected") {
            setTranscriptText("未检测到音频输入，请对着麦克风说话...");
          }

        } catch (error) {
          console.error('解析 WebSocket 数据失败:', error, event.data);
        }
      };
      
      websocketRef.current.onclose = (event) => {
        console.log('WebSocket 连接关闭', { code: event.code, reason: event.reason, wasClean: event.wasClean });
        if (!event.wasClean && isRecording) {
          message.warning('与语音识别服务的连接意外断开');
        }
        isConnectingRef.current = false;
      };
      
      websocketRef.current.onerror = (error) => {
        console.error('WebSocket 连接错误:', error);
        const servicePort = testService.includes('8001') ? '8001' : '8002';
        message.error(`ASR 服务 (${servicePort}) 连接失败`);
        setTranscriptText(`❌ WebSocket 连接失败\n服务地址: ${testService}\n请检查 Docker 服务是否启动`);
        isConnectingRef.current = false; // 重置连接标志
        stopRecording();
      };
      
      // 设置录音器
      recorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      recorderRef.current.ondataavailable = (event) => {
        // 只有当数据大小大于0且WebSocket连接正常时才发送
        if (event.data && event.data.size > 0) {
          if (websocketRef.current?.readyState === WebSocket.OPEN) {
            try {
              const now = Date.now();
              const timeSinceLastSend = now - lastSendTimeRef.current;
              
              // 限制发送频率，避免服务端过载
              if (timeSinceLastSend < 200) { // 最小200ms间隔
                console.debug('发送频率过高，跳过此次数据');
                return;
              }
              
              // 检查待处理的数据包数量
              if (pendingChunksRef.current > 5) { // 限制待处理数据包数量
                console.warn('服务端处理较慢，跳过此次数据发送');
                return;
              }
              
              websocketRef.current.send(event.data);
              lastSendTimeRef.current = now;
              pendingChunksRef.current++;
              console.debug('音频数据已发送:', event.data.size, 'bytes', `待处理:${pendingChunksRef.current}`);
            } catch (error) {
              console.error('发送音频数据失败:', error);
              // 发送失败时停止录音，避免持续错误
              stopRecording();
            }
          } else if (websocketRef.current?.readyState === WebSocket.CONNECTING) {
            console.debug('WebSocket正在连接中，跳过此次数据发送');
          } else {
            console.warn('WebSocket连接已断开，停止录音', { 
              readyState: websocketRef.current?.readyState,
              isRecording 
            });
            isConnectingRef.current = false;
            stopRecording();
          }
        }
      };
      
      recorderRef.current.onerror = (event) => {
        console.error('录音器错误:', event);
        message.error('录音过程中发生错误');
        isConnectingRef.current = false;
        stopRecording();
      };
      
      // 根据服务类型调整发送频率，减少服务端负载
      const chunkInterval = isInterviewerService ? 500 : 250; // 面试官服务降低发送频率
      recorderRef.current.start(chunkInterval);
      setIsRecording(true);
      setRecordingTime(0);
      
      // 启动计时器
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      message.error('无法访问麦克风，请检查浏览器权限');
      console.error('Recording error:', error);
      isConnectingRef.current = false; // 重置连接标志
    }
  };
  
  const stopRecording = async () => {
    // 重置连接状态标志
    isConnectingRef.current = false;
    lastSendTimeRef.current = 0;
    pendingChunksRef.current = 0;
    
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
    
    // 启动默认波形动画
    setTimeout(() => {
      drawDefaultWaveform();
    }, 100);
    
    // 清理函数
    return () => {
      // 异步清理资源
      stopRecording().catch(error => {
        console.warn('清理资源时出错:', error);
      });
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
                key: 'basic',
                label: '基础配置',
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
                        name="language"
                        label="识别语言"
                        rules={[{ required: true, message: '请选择识别语言' }]}
                      >
                        <Select placeholder="选择语言">
                          <Select.Option value="zh">中文</Select.Option>
                          <Select.Option value="en">英文</Select.Option>
                          <Select.Option value="ja">日文</Select.Option>
                          <Select.Option value="ko">韩文</Select.Option>
                          <Select.Option value="auto">自动检测</Select.Option>
                        </Select>
                      </Form.Item>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Form.Item
                        name="model"
                        label="Whisper 模型"
                        rules={[{ required: true, message: '请选择模型' }]}
                      >
                        <Select placeholder="选择模型">
                          <Select.Option value="tiny">tiny (39MB)</Select.Option>
                          <Select.Option value="base">base (74MB)</Select.Option>
                          <Select.Option value="small">small (244MB)</Select.Option>
                          <Select.Option value="medium">medium (769MB)</Select.Option>
                          <Select.Option value="large">large (1550MB)</Select.Option>
                        </Select>
                      </Form.Item>

                      <Form.Item
                        name="backend"
                        label="处理后端"
                        rules={[{ required: true, message: '请选择后端' }]}
                      >
                        <Select placeholder="选择后端">
                          <Select.Option value="simulstreaming">SimulStreaming (推荐)</Select.Option>
                          <Select.Option value="faster-whisper">Faster Whisper</Select.Option>
                          <Select.Option value="whisper_timestamped">Whisper Timestamped</Select.Option>
                          <Select.Option value="mlx-whisper">MLX Whisper (Apple Silicon)</Select.Option>
                          <Select.Option value="openai-api">OpenAI API</Select.Option>
                        </Select>
                      </Form.Item>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Form.Item
                        name="task"
                        label="任务类型"
                      >
                        <Select>
                          <Select.Option value="transcribe">转录 (transcribe)</Select.Option>
                          <Select.Option value="translate">翻译 (translate)</Select.Option>
                        </Select>
                      </Form.Item>

                      <Form.Item
                        name="min_chunk_size"
                        label="最小音频块大小 (秒)"
                      >
                        <InputNumber
                          min={0.1}
                          max={10}
                          step={0.1}
                          style={{ width: '100%' }}
                          placeholder="1.0"
                        />
                      </Form.Item>
                    </div>
                  </div>
                ),
              },
              {
                key: 'audio',
                label: '音频处理',
                children: (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <Form.Item 
                          name="no_vad" 
                          valuePropName="checked" 
                          label="禁用 VAD (语音活动检测)"
                        >
                          <Switch />
                        </Form.Item>

                        <Form.Item 
                          name="no_vac" 
                          valuePropName="checked"
                          label="禁用 VAC (语音活动控制器)"
                        >
                          <Switch />
                        </Form.Item>

                        <Form.Item 
                          name="confidence_validation" 
                          valuePropName="checked"
                          label="启用置信度验证"
                        >
                          <Switch />
                        </Form.Item>
                      </div>

                      <div className="space-y-4">
                        <Form.Item
                          name="vac_chunk_size"
                          label="VAC 采样大小 (秒)"
                        >
                          <InputNumber
                            min={0.1}
                            step={0.1}
                            style={{ width: '100%' }}
                            placeholder="可选"
                          />
                        </Form.Item>

                        <Form.Item
                          name="buffer_trimming"
                          label="缓冲区修剪策略"
                        >
                          <Select allowClear placeholder="选择修剪策略">
                            <Select.Option value="sentence">句子</Select.Option>
                            <Select.Option value="segment">片段</Select.Option>
                          </Select>
                        </Form.Item>

                        <Form.Item
                          name="buffer_trimming_sec"
                          label="缓冲区修剪阈值 (秒)"
                        >
                          <InputNumber
                            min={1}
                            step={1}
                            style={{ width: '100%' }}
                            placeholder="可选"
                          />
                        </Form.Item>
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'speaker',
                label: '说话人分离',
                children: (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <Form.Item 
                          name="diarization" 
                          valuePropName="checked"
                          label="启用说话人分离"
                        >
                          <Switch />
                        </Form.Item>

                        <Form.Item 
                          name="punctuation_split" 
                          valuePropName="checked"
                          label="使用标点符号改进边界检测"
                        >
                          <Switch />
                        </Form.Item>
                      </div>

                      <div>
                        <Form.Item
                          name="diarization_backend"
                          label="分离后端"
                        >
                          <Select>
                            <Select.Option value="sortformer">Sortformer (推荐)</Select.Option>
                            <Select.Option value="diart">Diart</Select.Option>
                          </Select>
                        </Form.Item>
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'advanced',
                label: '高级选项',
                children: (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <Form.Item
                          name="log_level"
                          label="日志级别"
                        >
                          <Select>
                            <Select.Option value="DEBUG">DEBUG</Select.Option>
                            <Select.Option value="INFO">INFO</Select.Option>
                            <Select.Option value="WARNING">WARNING</Select.Option>
                            <Select.Option value="ERROR">ERROR</Select.Option>
                            <Select.Option value="CRITICAL">CRITICAL</Select.Option>
                          </Select>
                        </Form.Item>

                        <Form.Item
                          name="frame_threshold"
                          label="帧阈值 (SimulStreaming)"
                        >
                          <InputNumber
                            min={1}
                            max={100}
                            style={{ width: '100%' }}
                            placeholder="25"
                          />
                        </Form.Item>

                        <Form.Item
                          name="beams"
                          label="束搜索数量"
                        >
                          <InputNumber
                            min={1}
                            max={10}
                            style={{ width: '100%' }}
                            placeholder="1"
                          />
                        </Form.Item>

                        <Form.Item
                          name="decoder"
                          label="解码器类型"
                        >
                          <Select allowClear placeholder="自动选择">
                            <Select.Option value="beam">Beam Search</Select.Option>
                            <Select.Option value="greedy">Greedy</Select.Option>
                            <Select.Option value="auto">自动</Select.Option>
                          </Select>
                        </Form.Item>
                      </div>

                      <div className="space-y-4">
                        <Form.Item
                          name="audio_max_len"
                          label="最大音频长度 (秒)"
                        >
                          <InputNumber
                            min={1}
                            max={120}
                            style={{ width: '100%' }}
                            placeholder="30.0"
                          />
                        </Form.Item>

                        <Form.Item
                          name="audio_min_len"
                          label="最小音频长度 (秒)"
                        >
                          <InputNumber
                            min={0}
                            max={10}
                            step={0.1}
                            style={{ width: '100%' }}
                            placeholder="0.0"
                          />
                        </Form.Item>

                        <Form.Item 
                          name="never_fire" 
                          valuePropName="checked"
                          label="从不截断不完整单词"
                        >
                          <Switch />
                        </Form.Item>

                        <Form.Item
                          name="max_context_tokens"
                          label="最大上下文 Token 数"
                        >
                          <InputNumber
                            min={0}
                            max={10000}
                            style={{ width: '100%' }}
                            placeholder="可选"
                          />
                        </Form.Item>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Form.Item
                        name="init_prompt"
                        label="初始提示词"
                      >
                        <Input.TextArea
                          placeholder="为模型提供初始提示词，应使用目标语言"
                          rows={2}
                        />
                      </Form.Item>

                      <Form.Item
                        name="static_init_prompt"
                        label="静态提示词"
                      >
                        <Input.TextArea
                          placeholder="不会滚动的静态文本，可包含相关术语"
                          rows={2}
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
                if (config) {
                  form.setFieldsValue(config);
                }
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
                      : testService.includes('8002') 
                        ? '开始捕获系统音频' 
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
                    <div className="text-lg font-mono text-red-500">
                      ⏱️ {formatTime(recordingTime)}
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
                  {testService.includes('8002') ? (
                    <>
                      <li>• <strong>面试官音频：</strong>点击按钮选择"共享系统音频"</li>
                      <li>• 播放音频文件或视频时会被捕获</li>
                      <li>• 如果无法捕获系统音频，会降级为麦克风</li>
                    </>
                  ) : (
                    <>
                      <li>• <strong>面试者音频：</strong>允许麦克风权限</li>
                      <li>• 直接对着麦克风说话进行测试</li>
                    </>
                  )}
                  <li>• 音频波形显示捕获状态</li>
                  <li>• 右侧显示实时转录和说话人分离结果</li>
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