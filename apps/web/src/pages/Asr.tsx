import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { Button, Card, Form, Input, InputNumber, Select, Spin, Switch, Tabs } from 'antd';
import { useEffect, useState } from 'react';
import { message } from '../components/Message';

interface AsrConfig {
  id: number;
  name: string;
  language: string;
  model: string;
  backend: string;
  task: string;
  min_chunk_size: number;
  no_vad: boolean;
  no_vac: boolean;
  vac_chunk_size: number | null;
  confidence_validation: boolean;
  diarization: boolean;
  punctuation_split: boolean;
  diarization_backend: string;
  buffer_trimming: string | null;
  buffer_trimming_sec: number | null;
  log_level: string;
  frame_threshold: number | null;
  beams: number | null;
  decoder: string | null;
  audio_max_len: number | null;
  audio_min_len: number | null;
  never_fire: boolean;
  init_prompt: string | null;
  static_init_prompt: string | null;
  max_context_tokens: number | null;
  created_at: number;
  updated_at: number;
}

export default function AsrSettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AsrConfig | null>(null);
  const [form] = Form.useForm();

  // 加载配置
  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/asr/config');
      if (!response.ok) {
        throw new Error('加载配置失败');
      }
      const data = await response.json();
      setConfig(data.config);
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
      message.error('加载配置失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 保存配置
  const saveConfig = async (values: any) => {
    setSaving(true);
    try {
      const response = await fetch('/api/asr/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        message.success(data.message || '配置已保存');
        setConfig(data.config);
      } else {
        message.error(data.message || '保存失败');
      }
    } catch (error: any) {
      message.error('保存失败：' + error.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadConfig();
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

        {/* 服务状态 */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-lg font-medium mb-4">ASR 服务状态</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircleIcon className="w-5 h-5 text-green-500" />
                <span className="font-medium">面试者语音识别</span>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-600">
                  服务地址: <a href="http://localhost:8001" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">http://localhost:8001</a>
                </p>
                <p className="text-sm text-slate-500">WebSocket: ws://localhost:8001/asr</p>
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircleIcon className="w-5 h-5 text-green-500" />
                <span className="font-medium">面试官语音识别</span>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-600">
                  服务地址: <a href="http://localhost:8002" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">http://localhost:8002</a>
                </p>
                <p className="text-sm text-slate-500">WebSocket: ws://localhost:8002/asr</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}