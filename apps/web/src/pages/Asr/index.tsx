import { Button, Card, Form, Input, InputNumber, Select, Switch, Tabs } from 'antd';
import { useEffect, useState } from 'react';
import { getAsrConfig, saveAsrConfig, type AsrConfig } from '../../api/asr';
import { message } from '../../components/Message';
import PageLoading from '../../components/PageLoading';
import { useLoading } from '../../hooks/useLoading';
import { webSocketService } from '../../services/webSocketService';

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
  const { loading, start: startLoading, end: endLoading } = useLoading();
  const { loading: saving, start: startSaving, end: endSaving } = useLoading();
  const [config, setConfig] = useState<AsrConfig | null>(null);
  const [form] = Form.useForm();

  // 音频设备相关状态
  const [availableMicDevices, setAvailableMicDevices] = useState<Array<{ deviceId: string; label: string }>>([]);
  const [availableSpeakerDevices, setAvailableSpeakerDevices] = useState<Array<{ deviceId: string; label: string }>>([]);

  // 通过 WebSocket 拉取 desktop 的设备列表
  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        if (!webSocketService.getConnectionState()) {
          await webSocketService.connect();
        }
        const handler = (msg: any) => {
          const data = msg.data || {};
          if (Array.isArray(data.microphones)) {
            setAvailableMicDevices(
              data.microphones.map((m: any) => ({ deviceId: m.id, label: m.name || '麦克风' })),
            );
          }
          if (Array.isArray(data.speakers)) {
            setAvailableSpeakerDevices(
              data.speakers.map((s: any) => ({ deviceId: s.id, label: s.name || '扬声器' })),
            );
          }
        };
        webSocketService.onMessage('ASR_DEVICES', handler);
        unsub = () => webSocketService.offMessage('ASR_DEVICES', handler);
        // 请求 desktop 上报
        webSocketService.send({ type: 'REQUEST_ASR_DEVICES' } as any);
      } catch {}
    })();
    return () => { try { unsub?.(); } catch {} };
  }, []);

  // 获取麦克风设备
  const loadMicDevices = async () => {
    try {
      // 先请求麦克风权限，这样才能获取到设备的 label 信息
      await navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        stream.getTracks().forEach(track => track.stop());
      }).catch(() => {
        // 用户拒绝权限，继续获取设备列表（但 label 可能为空）
      });

      const devices = await navigator.mediaDevices.enumerateDevices();
      const micDevices = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `麦克风 ${device.deviceId.slice(0, 8)}...`
        }));

      setAvailableMicDevices(micDevices);
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
    startLoading();
    try {
      const data = await getAsrConfig();
      setConfig(data.config);

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
      await endLoading();
    }
  };

  // 保存配置
  const saveConfig = async (values: any) => {
    startSaving();
    try {
      const data = await saveAsrConfig(values);
      message.success(data.message || '配置已保存');
      setConfig(data.config);
    } catch (error: any) {
      console.error('保存失败：', error);
    } finally {
      await endSaving();
    }
  };

  useEffect(() => {
    loadConfig();
    loadMicDevices();      // 加载麦克风设备
    loadSpeakerDevices();  // 加载扬声器设备
  }, []);

  if (loading) {
    return <PageLoading tip="正在加载 ASR 配置..." />;
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
                        label={<span>麦克风音源</span>}
                        rules={[{ required: true, message: '请选择麦克风设备' }]}
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
                        <Input placeholder="默认麦克风" disabled />
                      </Form.Item>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Form.Item
                        name="speaker_device_id"
                        label={<span>扬声器音源</span>}
                        rules={[{ required: true, message: '请选择扬声器设备' }]}
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
                        <Input placeholder="默认扬声器" disabled />
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
                try {
                  webSocketService.send({ type: 'REQUEST_ASR_DEVICES' } as any);
                } catch {}
                loadMicDevices();
                loadSpeakerDevices();
              }}
            >
              刷新
            </Button>
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

      </Card>
    </div>
  );
}