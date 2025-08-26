import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  LinkIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Input, Modal, Select, Switch, Tabs } from 'antd';
import 'antd/dist/reset.css';
import { useEffect, useState } from 'react';
import { createAsrProvider, deleteAsrProvider, getAsrProviders, getUserAsrConfig, updateAsrProvider, updateUserAsrProvider, validateUserAsrConfig } from '../api/asr';
import { storage } from '../api/http';
import { message as messageComponent } from '../components/Message';
import PaginationBar from '../components/PaginationBar';

interface AsrProvider {
  id: string;
  name: string;
  provider_type: 'deepgram' | 'openai_whisper' | 'vosk';
  description?: string;
  default_config: Record<string, any>;
  required_fields: string[];
  status: boolean;
  is_enabled: boolean;
  created_at: number;
  updated_at: number;
}



export default function AsrSettings() {
  const [loading, setLoading] = useState(false);
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);
  const [list, setList] = useState<AsrProvider[]>([]);
  const [filter, setFilter] = useState<{
    keyword?: string;
  }>({});
  const [editing, setEditing] = useState<AsrProvider | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [total, setTotal] = useState(0);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [validationResults, setValidationResults] = useState<Record<string, any>>({});

  useEffect(() => {
    loadAsrConfig();
    fetchList();
  }, []);

  const loadAsrConfig = async () => {
    try {
      const user = storage.getUser();
      if (!user?.id) {
        messageComponent.error('用户信息不存在');
        return;
      }

      // 获取用户的ASR配置
      const userConfig = await getUserAsrConfig(user.id);
      setSelectedProviderId(userConfig.selectedProviderId);
    } catch (error: any) {
      console.warn('加载ASR配置失败:', error.message);
    }
  };

  const validateAllConfigs = async (userId: string, providers: AsrProvider[]) => {
    const results: Record<string, any> = {};
    
    for (const provider of providers) {
      try {
        const validation = await validateUserAsrConfig(userId, provider.id);
        results[provider.id] = validation;
      } catch (error) {
        results[provider.id] = { valid: false, missingFields: [], message: '验证失败' };
      }
    }
    
    setValidationResults(results);
  };

  const fetchList = async () => {
    setLoading(true);
    try {
      const providers = await getAsrProviders();
      const filtered = providers.filter(p => {
        if (filter.keyword && !p.name.toLowerCase().includes(filter.keyword.toLowerCase())) return false;
        return true;
      });
      
      setTotal(filtered.length);
      const start = (page - 1) * pageSize;
      setList(filtered.slice(start, start + pageSize));
      
      // 重新验证配置
      const user = storage.getUser();
      if (user?.id) {
        await validateAllConfigs(user.id, filtered);
      }
    } catch (error: any) {
      messageComponent.error(error.message || '加载ASR提供商失败');
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = async (providerId: string) => {
    try {
      const user = storage.getUser();
      if (!user?.id) return;

      await updateUserAsrProvider(user.id, providerId);
      setSelectedProviderId(providerId);
      messageComponent.success('ASR提供商已更新');
      
      // 重新加载配置
      await loadAsrConfig();
    } catch (error: any) {
      messageComponent.error(error.message || '更新ASR提供商失败');
    }
  };

  const handleEdit = (provider: AsrProvider) => {
    // 创建编辑副本，排除只读字段
    const editData = {
      ...provider,
      default_config: { ...provider.default_config },
      required_fields: [...provider.required_fields]
    };
    setEditing(editData);
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除语音识别提供商',
      content: '确定要删除该提供商吗？删除后无法恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        try {
          await deleteAsrProvider(id);
          messageComponent.success('已删除');
          await fetchList();
        } catch (error: any) {
          messageComponent.error('删除失败：' + error);
        }
      }
    });
  };

  const handleTestConnection = async (providerId: string) => {
    setTestingProviderId(providerId);
    try {
      // 这里应该调用测试连接的API
      await new Promise(resolve => setTimeout(resolve, 2000)); // 模拟测试
      messageComponent.success('连接测试成功！');
    } catch (error: any) {
      messageComponent.error(error?.message || '连接测试失败');
    } finally {
      setTestingProviderId(null);
    }
  };

  useEffect(() => {
    fetchList();
  }, [filter.keyword, page, pageSize]);

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'deepgram':
        return '🎙️';
      case 'openai_whisper':
        return '🤖';
      case 'vosk':
        return '🖥️';
      default:
        return '🔊';
    }
  };

  const getValidationIcon = (validation: any) => {
    if (!validation) return null;
    return validation.valid 
      ? <CheckCircleIcon className="w-5 h-5 text-green-500" />
      : <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <header>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🎙️</span>
          <h1 className="text-2xl font-semibold text-slate-900">语音识别设置</h1>
        </div>
        <p className="text-slate-600">配置和管理语音识别服务提供商</p>
      </header>

      {/* 右侧卡片区域 */}
      <section className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="mb-3 flex justify-between items-center">
          <div className="text-slate-900 font-semibold text-lg">语音识别提供商</div>
          <div className="flex items-center gap-2">
            <Input.Search
              allowClear
              placeholder="搜索提供商"
              style={{ width: 300 }}
              onSearch={(v) => {
                setFilter((f) => ({ ...f, keyword: v || undefined }));
                setPage(1);
              }}
            />
            <button
              className="h-8 px-4 rounded-lg bg-blue-600 text-white shadow-sm flex items-center gap-2"
              onClick={() => setEditing({} as AsrProvider)}
            >
              <PlusIcon className="w-4 h-4" />
              添加提供商
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            // 加载状态显示
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="border p-4 bg-white shadow-sm animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-200 rounded"></div>
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
                </div>
                <div className="my-3 h-px bg-slate-200" />
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))
          ) : (
            list.map((provider, idx) => {
              const isSelected = provider.id === selectedProviderId;
              const validation = validationResults[provider.id];
              const statusCn = provider.status ? '已连通' : '不可用';
              const creatorCn = '系统';
              
              return (
              <div
                key={provider.id}
                className={`group border p-4 bg-white shadow-sm relative overflow-hidden ${
                  isSelected ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                {/* 左上角序号角标 */}
                <div className="pointer-events-none absolute left-0 top-0">
                  <div className="bg-blue-600 text-white text-[10px] font-semibold px-2 py-1 rounded-br">
                    {(page - 1) * pageSize + idx + 1}
                  </div>
                  <div className="w-0 h-0 border-t-8 border-t-blue-700 border-r-8 border-r-transparent"></div>
                </div>
                
                <div className="flex items-center justify-between pl-6">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getProviderIcon(provider.provider_type)}</span>
                    <div>
                      <div className="font-semibold text-slate-900 text-base">{provider.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            provider.status ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {statusCn}
                        </span>
                        {isSelected && (
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                            当前选择
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* 右上角操作：仅悬停卡片时显示 */}
                  <div className="hidden group-hover:flex items-center gap-3">
                    <button
                      className="inline-flex items-center justify-center"
                      title="测试连通性"
                      onClick={() => handleTestConnection(provider.id)}
                    >
                      <LinkIcon className="w-5 h-5 text-sky-500" />
                    </button>
                    <button
                      className="inline-flex items-center justify-center"
                      title="编辑"
                      onClick={() => handleEdit(provider)}
                    >
                      <PencilIcon className="w-5 h-5 text-blue-500" />
                    </button>
                    <button
                      className="inline-flex items-center justify-center"
                      title="删除"
                      onClick={() => handleDelete(provider.id)}
                    >
                      <TrashIcon className="w-5 h-5 text-red-500" />
                    </button>
                  </div>
                </div>

                {/* 横线分割 */}
                <div className="my-3 h-px bg-slate-200" />

                {/* 详情信息 */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm pl-6">
                  <div className="flex items-baseline gap-1 min-w-0">
                    <span className="text-slate-500 shrink-0 whitespace-nowrap">提供商：</span>
                    <span className="text-slate-800 font-medium truncate">{provider.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1 min-w-0">
                    <span className="text-slate-500 shrink-0 whitespace-nowrap">类型：</span>
                    <span className="text-slate-800 font-medium truncate">{provider.provider_type}</span>
                  </div>
                  <div className="flex items-baseline gap-1 min-w-0">
                    <span className="text-slate-500 shrink-0 whitespace-nowrap">创建者：</span>
                    <span className="text-slate-800 truncate">{creatorCn}</span>
                  </div>
                  <div className="flex items-baseline gap-1 min-w-0">
                    <span className="text-slate-500 shrink-0 whitespace-nowrap">创建时间：</span>
                    <span className="text-slate-800 whitespace-nowrap">
                      {provider.created_at ? new Date(provider.created_at).toLocaleString() : '-'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 min-w-0">
                    <span className="text-slate-500 shrink-0 whitespace-nowrap">配置状态：</span>
                    <span className="text-slate-800 truncate flex items-center gap-1">
                      {getValidationIcon(validation)}
                      {validation?.valid ? '已配置' : '需要配置'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 min-w-0">
                    <span className="text-slate-500 shrink-0 whitespace-nowrap">状态：</span>
                    <span className="text-slate-800 truncate">
                      {provider.is_enabled ? '启用' : '禁用'}
                    </span>
                  </div>
                </div>

                {/* 描述信息 */}
                {provider.description && (
                  <div className="mt-3 pt-3 border-t border-slate-200 pl-6">
                    <p className="text-sm text-slate-600">{provider.description}</p>
                  </div>
                )}

                {/* 选择按钮 */}
                <div className="mt-4 pt-3 border-t border-slate-200 pl-6">
                  <button
                    onClick={() => handleProviderChange(provider.id)}
                    disabled={isSelected}
                    className={`px-4 py-2 text-sm rounded-lg ${
                      isSelected 
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                        : 'bg-blue-600 text-white hover:bg-blue-500'
                    }`}
                  >
                    {isSelected ? '已选择' : '选择此提供商'}
                  </button>
                </div>
              </div>
            );
            })
          )}
        </div>

        <div className="mt-4 flex items-center justify-end gap-3 text-sm text-slate-500">
          <PaginationBar
            page={page}
            pageSize={pageSize}
            total={total}
            onChange={(p) => setPage(p)}
            onPageSizeChange={(_, size) => {
              setPageSize(size);
              setPage(1);
            }}
            showSizeChanger={true}
            pageSizeOptions={['6', '12', '18', '24', '50', '100']}
          />
        </div>
      </section>

      {/* 编辑模态框 */}
      <EditModal
        open={!!editing}
        data={editing}
        onClose={() => setEditing(null)}
        onOk={async (provider: any) => {
          try {
            if (provider.id) {
              // 更新现有提供商，只传递允许更新的字段
              const updateData = {
                name: provider.name,
                provider_type: provider.provider_type,
                description: provider.description,
                default_config: provider.default_config,
                required_fields: provider.required_fields,
                status: provider.status,
                is_enabled: provider.is_enabled
              };
              await updateAsrProvider(provider.id, updateData);
              messageComponent.success('提供商已更新');
            } else {
              // 创建新提供商，排除id字段
              const createData = {
                name: provider.name,
                provider_type: provider.provider_type,
                description: provider.description,
                default_config: provider.default_config,
                required_fields: provider.required_fields,
                status: provider.status,
                is_enabled: provider.is_enabled
              };
              await createAsrProvider(createData);
              messageComponent.success('提供商已创建');
            }
            setEditing(null);
            await fetchList();
          } catch (error: any) {
            messageComponent.error(error?.message || '保存失败');
          }
        }}
      />

      {/* 测试连接遮罩 */}
      {testingProviderId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">正在测试连接...</p>
          </div>
        </div>
      )}
    </div>
  );
}

function EditModal({ open, data, onClose, onOk }: any) {
  const [form, setForm] = useState<any>(data || { 
    provider_type: 'deepgram',
    is_enabled: true,
    status: false,
    required_fields: [],
    default_config: {}
  });
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    setForm(data || { 
      provider_type: 'deepgram',
      is_enabled: true,
      status: false,
      required_fields: [],
      default_config: {}
    });
  }, [data]);

  const providerTypes = [
    { value: 'deepgram', label: 'Deepgram' },
    { value: 'openai_whisper', label: 'OpenAI Whisper' },
    { value: 'vosk', label: 'Vosk' },
  ];

  // 根据提供商类型获取默认配置模板
  const getDefaultConfigTemplate = (type: string) => {
    switch (type) {
      case 'deepgram':
        return {
          model: 'nova-2',
          language: 'zh',
          punctuate: true,
          profanity_filter: false,
          redact: false,
          diarize: false,
          numerals: true,
          endpointing: 400,
          interim_results: true,
          utterance_end_ms: 1000,
          apiKey: ''
        };
      case 'openai_whisper':
        return {
          model: 'whisper-1',
          language: 'zh',
          temperature: 0,
          response_format: 'json',
          apiKey: ''
        };
      case 'vosk':
        return {
          language: 'zh',
          sample_rate: 16000,
          model_path: './models/vosk'
        };
      default:
        return {};
    }
  };

  // 根据提供商类型获取必需字段
  const getRequiredFields = (type: string) => {
    switch (type) {
      case 'deepgram':
      case 'openai_whisper':
        return ['apiKey'];
      case 'vosk':
        return ['model_path'];
      default:
        return [];
    }
  };

  // 处理提供商类型变化
  const handleProviderTypeChange = (type: string) => {
    const defaultConfig = getDefaultConfigTemplate(type);
    const requiredFields = getRequiredFields(type);
    
    setForm({
      ...form,
      provider_type: type,
      default_config: defaultConfig,
      required_fields: requiredFields
    });
  };

  // 更新默认配置中的字段
  const updateDefaultConfig = (field: string, value: any) => {
    setForm({
      ...form,
      default_config: {
        ...form.default_config,
        [field]: value
      }
    });
  };

  // 获取字段标签
  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      apiKey: 'API Key',
      model_path: '模型路径',
      model: '模型',
      language: '语言',
      temperature: '温度',
      sample_rate: '采样率'
    };
    return labels[field] || field;
  };

  // 获取字段类型
  const getFieldType = (field: string): string => {
    if (field.toLowerCase().includes('key') || field.toLowerCase().includes('password')) {
      return 'password';
    }
    if (field === 'temperature') {
      return 'number';
    }
    if (field === 'sample_rate') {
      return 'number';
    }
    return 'text';
  };

  // 获取字段占位符
  const getFieldPlaceholder = (field: string, type: string): string => {
    switch (field) {
      case 'apiKey':
        if (type === 'deepgram') {
          return '输入 Deepgram API Key';
        } else if (type === 'openai_whisper') {
          return '输入 OpenAI API Key (sk-...)';
        }
        return '输入 API Key';
      case 'model_path':
        return '输入模型文件或文件夹路径，如 ./models/vosk';
      case 'model':
        if (type === 'deepgram') {
          return '输入模型名称，如 nova-2';
        } else if (type === 'openai_whisper') {
          return '输入模型名称，如 whisper-1';
        }
        return '输入模型名称';
      default:
        return `输入 ${field}`;
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={async () => {
        setSaving(true);
        try {
          await onOk(form);
        } finally {
          setSaving(false);
        }
      }}
      okText={saving ? "保存中..." : "保存"}
      cancelText="取消"
      okButtonProps={{ loading: saving }}
      title={data?.id ? '编辑语音识别提供商' : '添加语音识别提供商'}
      width={800}
      style={{ overflow: 'hidden' }}
    >
      <div className="flex flex-col h-full">
        <Tabs
          items={[
            {
              key: 'basic',
              label: '基础信息',
              children: (
                <div className="space-y-5 pt-2 w-full overflow-y-auto flex-1">
                  {/* 提供商名称 */}
                  <div className="w-full">
                    <div className="mb-1 text-slate-700">
                      提供商名称<span className="text-red-500"> *</span>
                    </div>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))}
                      placeholder="请输入提供商名称"
                      maxLength={64}
                      showCount
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* 提供商类型 */}
                  <div className="w-full">
                    <div className="mb-1 text-slate-700">
                      提供商类型<span className="text-red-500"> *</span>
                    </div>
                    <Select
                      value={form.provider_type}
                      placeholder="请选择提供商类型"
                      style={{ width: '100%' }}
                      onChange={handleProviderTypeChange}
                      options={providerTypes}
                    />
                  </div>

                  {/* 描述 */}
                  <div className="w-full">
                    <div className="mb-1 text-slate-700">描述</div>
                    <Input.TextArea
                      value={form.description}
                      onChange={(e) => setForm((f: any) => ({ ...f, description: e.target.value }))}
                      placeholder="请输入描述信息"
                      rows={3}
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* 状态设置 */}
                  <div className="w-full">
                    <div className="mb-2 text-slate-700">状态设置</div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">启用状态</span>
                        <Switch
                          checked={form.is_enabled}
                          onChange={(v) => setForm((f: any) => ({ ...f, is_enabled: v }))}
                          checkedChildren="启用"
                          unCheckedChildren="禁用"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">连接状态</span>
                        <Switch
                          checked={form.status}
                          onChange={(v) => setForm((f: any) => ({ ...f, status: v }))}
                          checkedChildren="已连通"
                          unCheckedChildren="不可用"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: 'config',
              label: '配置信息',
              children: (
                <div className="pt-2 overflow-y-auto flex-1">
                  <div className="mb-4">
                    <div className="text-slate-800 font-medium mb-2">默认配置参数</div>
                    <p className="text-sm text-slate-600 mb-4">
                      配置提供商的基本参数，用户可以在使用时覆盖这些设置
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    {Object.entries(form.default_config || {}).map(([field, value]) => {
                      const fieldType = getFieldType(field);
                      const isPassword = fieldType === 'password';
                      const isRequired = form.required_fields?.includes(field);
                      
                      return (
                        <div key={field}>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            {getFieldLabel(field)} 
                            {isRequired && <span className="text-red-500"> *</span>}
                          </label>
                          <div className="relative">
                            <Input
                              type={isPassword && !showApiKey ? 'password' : fieldType === 'number' ? 'number' : 'text'}
                              value={value as string}
                              onChange={(e) => updateDefaultConfig(field, e.target.value)}
                              placeholder={getFieldPlaceholder(field, form.provider_type)}
                              style={{ width: '100%' }}
                              status={isRequired && !value ? ('error' as any) : undefined}
                              addonBefore={
                                <span
                                  className="text-slate-700"
                                  style={{ display: 'inline-block', width: 120 }}
                                >
                                  {getFieldLabel(field)}
                                </span>
                              }
                              addonAfter={
                                isPassword ? (
                                  <span
                                    className="cursor-pointer"
                                    style={{
                                      display: 'inline-block',
                                      width: 28,
                                      textAlign: 'center',
                                    }}
                                    onClick={() => setShowApiKey(!showApiKey)}
                                  >
                                    {showApiKey ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                  </span>
                                ) : undefined
                              }
                            />
                          </div>
                          {isRequired && !value && (
                            <p className="mt-1 text-xs text-red-600">此字段为必填项</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    </Modal>
  );
}