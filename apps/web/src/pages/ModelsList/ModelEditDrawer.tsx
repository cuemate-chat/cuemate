import {
  EyeInvisibleOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { Button, Input, Modal, Select, Switch, Tabs } from 'antd';
import { useEffect, useState } from 'react';
import { testModelConfig } from '../../api/models';
import DrawerProviderLevel2, { DrawerContent, DrawerFooter, DrawerHeader } from '../../components/DrawerProviderLevel2';
import { message } from '../../components/Message';
import { findProvider } from '../../providers';
import { getWebSocketBridge } from '../../utils/websocketBridge';

interface ModelEditDrawerProps {
  open: boolean;
  onClose: () => void;
  data: any;
  selectedProvider?: any;
  onBackToProvider?: () => void;
  onOk: (formData: any) => Promise<void>;
  onTestingChange?: (testing: boolean) => void; // 通知父组件测试状态
}

// 判断是否运行在 Electron 环境中
const isElectron = () => {
  return (
    (typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent)) ||
    (typeof window !== 'undefined' && (window as any).process?.versions?.electron)
  );
};

export default function ModelEditDrawer({
  open,
  onClose,
  data,
  selectedProvider,
  onBackToProvider,
  onOk,
  onTestingChange
}: ModelEditDrawerProps) {
  const [form, setForm] = useState<any>(data || { scope: 'public', type: 'llm', params: [] });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // 处理跳转到配置文档
  const handleJumpToDoc = (e: React.MouseEvent) => {
    e.preventDefault();
    const provider = findProvider(form.provider);
    const jumpLink = provider?.jump_link;
    if (!jumpLink) return;

    Modal.confirm({
      title: '确认跳转到外部网站',
      content: (
        <div className="space-y-3">
          <div className="text-sm text-slate-600 dark:text-slate-200">
            即将跳转到 {provider?.name || ''} 模型配置页面：
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-100 break-all">
            {jumpLink}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-300">
            链接将在{isElectron() ? '外部浏览器' : '新标签页'}中打开
          </div>
        </div>
      ),
      okText: '确认跳转',
      cancelText: '取消',
      onOk: () => {
        if (isElectron()) {
          try {
            const bridge = getWebSocketBridge();
            bridge.openExternal(jumpLink);
          } catch {
            window.open(jumpLink, '_blank');
          }
        } else {
          window.open(jumpLink, '_blank', 'noopener,noreferrer');
        }
      }
    });
  };

  useEffect(() => {
    const base = data || { scope: 'public', type: 'llm', params: [] };

    // 获取 provider 的默认凭据值和 scope
    const defaultCredentials = base.provider ? getDefaultCredentialsByProvider(base.provider) : {};
    const providerScope = base.provider ? getProviderScope(base.provider) : undefined;

    // 若包含 credentials(JSON 文本或对象)，展开到表单字段，便于编辑
    try {
      const raw = (base as any).credentials;
      const obj = typeof raw === 'string' ? JSON.parse(raw) : raw || {};
      if (obj && typeof obj === 'object') {
        const merged = { ...defaultCredentials, ...base, ...obj };
        // 如果有 provider，使用 provider 的 scope
        if (providerScope) {
          merged.scope = providerScope;
        }
        setForm(merged);
        return;
      }
    } catch (error) {
      message.error('Failed to get model details:' + error);
    }

    // 合并默认值和基础数据
    const merged = { ...defaultCredentials, ...base };
    // 如果有 provider，使用 provider 的 scope
    if (providerScope) {
      merged.scope = providerScope;
    }
    setForm(merged);
  }, [data]);

  // 初始化：从 provider manifest 预置默认参数和 scope 到表格
  useEffect(() => {
    if (form.provider) {
      // 更新 scope
      const providerScope = getProviderScope(form.provider);
      if (providerScope) {
        setForm((f: any) => ({ ...f, scope: providerScope }));
      }

      // 更新参数
      if (form.model_name) {
        const preset = getDefaultParamsByProvider(form.provider, form.model_name);
        if (preset && preset.length > 0) {
          setForm((f: any) => ({ ...f, params: preset }));
        }
      }
    }
  }, [form.provider, form.model_name]);

  // 测试连接功能
  const handleTestConnection = async () => {
    if (!form.provider || !form.model_name) {
      message.warning('请先选择供应商和基础模型');
      return;
    }

    // 验证必填的凭证字段
    const provider = findProvider(form.provider);
    const credentialFields = provider?.credentialFieldsPerModel?.[form.model_name]
      || provider?.credentialFieldsPerModel?.default
      || provider?.credentialFields
      || [];

    const missingFields: string[] = [];
    credentialFields.forEach((field) => {
      if (field.required && !form[field.key]) {
        missingFields.push(field.label);
      }
    });

    if (missingFields.length > 0) {
      message.warning(`请填写必填字段: ${missingFields.join(', ')}`);
      return;
    }

    setTesting(true);
    onTestingChange?.(true); // 通知父组件开始测试
    try {
      // 构建凭证对象
      const credentials: Record<string, any> = {};
      credentialFields.forEach((field) => {
        if (form[field.key]) {
          credentials[field.key] = form[field.key];
        }
      });

      // 使用表单中的值直接测试
      const result: any = await testModelConfig({
        provider: form.provider,
        model_name: form.model_name,
        credentials,
        params: form.params || [],
      });

      console.debug('测试连接结果:', result);

      if (result?.ok) {
        message.success('连接测试成功！模型可以正常使用');
      } else {
        const errorMsg = result?.error || result?.chatError || result?.embedError || '连接测试失败';
        message.error(errorMsg);
      }
    } catch {
      
    } finally {
      setTesting(false);
      onTestingChange?.(false); // 通知父组件测试结束
    }
  };

  const handleSave = async () => {
    // 验证必填字段
    if (!form.name) {
      message.warning('请输入模型名称');
      return;
    }
    if (!form.provider) {
      message.warning('请选择供应商');
      return;
    }
    if (!form.model_name) {
      message.warning('请选择基础模型');
      return;
    }

    // 验证必填的凭证字段
    const provider = findProvider(form.provider);
    const credentialFields = provider?.credentialFieldsPerModel?.[form.model_name]
      || provider?.credentialFieldsPerModel?.default
      || provider?.credentialFields
      || [];

    const missingFields: string[] = [];
    credentialFields.forEach((field) => {
      if (field.required && !form[field.key]) {
        missingFields.push(field.label);
      }
    });

    if (missingFields.length > 0) {
      message.warning(`请填写必填字段: ${missingFields.join(', ')}`);
      return;
    }

    setSaving(true);
    try {
      await onOk(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DrawerProviderLevel2
      open={open}
      onClose={onClose}
      width="55%"
    >
      <DrawerHeader>
        <div className="flex items-center gap-2">
          {selectedProvider ? (
            // 添加模式：显示面包屑导航
            <>
              <button
                className="text-[#1d4ed8] hover:text-[#2563eb] hover:underline transition-colors"
                onClick={onBackToProvider}
              >
                重新选择供应商
              </button>
              <span className="text-slate-400">→</span>
              <span className="flex items-center gap-2 font-medium">
                {selectedProvider.icon && (
                  <img 
                    src={`data:image/svg+xml;utf8,${encodeURIComponent(selectedProvider.icon)}`} 
                    alt="" 
                    className="w-4 h-4" 
                  />
                )}
                添加 {selectedProvider.name}
              </span>
            </>
          ) : (
            // 编辑模式：直接显示标题
            (() => {
              const isEdit = !!(data && data.id);
              const p = findProvider(form.provider || '');
              if (!p) return <span className="font-medium">{isEdit ? '编辑' : '添加'}</span>;
              const icon = p.icon ? `data:image/svg+xml;utf8,${encodeURIComponent(p.icon)}` : '';
              return (
                <span className="flex items-center gap-2 font-medium">
                  {p.icon && <img src={icon} alt="" className="w-4 h-4" />}
                  {isEdit ? '编辑' : '添加'} {p.name}
                </span>
              );
            })()
          )}
        </div>
      </DrawerHeader>
      <DrawerContent>
        <div className="flex flex-col h-full">
          <Tabs
            items={[
              {
                key: 'basic',
                label: '基础信息',
                children: (
                  <div className="space-y-5 pt-2 w-full overflow-y-auto flex-1">
                    {/* 模型名称：上下结构 */}
                    <div className="w-full">
                      <div className="mb-1 flex items-center justify-between">
                        <div className="text-slate-700 dark:text-slate-200">
                          模型名称<span className="text-red-500"> *</span>
                        </div>
                        {findProvider(form.provider)?.jump_link && (
                          <button
                            onClick={handleJumpToDoc}
                            className="text-xs text-blue-500 hover:text-blue-600 hover:underline"
                          >
                            查看配置文档
                          </button>
                        )}
                      </div>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))}
                        placeholder="请给基础模型设置一个名称"
                        maxLength={64}
                        showCount
                        style={{ width: '100%' }}
                      />
                    </div>
                    {/* 模型情况：根据 provider 自动选中，不可更改 */}
                    <div className="w-full">
                      <div className="mb-2 text-slate-700 dark:text-slate-200">
                        模型情况<span className="text-red-500"> *</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 w-full">
                        <div
                          className={`border rounded-lg px-3 py-2 text-left ${
                            form.scope === 'private'
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-50'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 opacity-60'
                          }`}
                        >
                          <div className={`font-medium ${
                            form.scope === 'private'
                              ? 'text-slate-900'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}>私有模型</div>
                          <div className={`text-xs mt-1 ${
                            form.scope === 'private'
                              ? 'text-slate-600'
                              : 'text-slate-500 dark:text-slate-300'
                          }`}>
                            本地部署，数据在您的设备或环境内处理与存储
                          </div>
                          <div className={`text-xs mt-1.5 ${
                            form.scope === 'private'
                              ? 'text-slate-500'
                              : 'text-slate-400 dark:text-slate-400'
                          }`}>
                            示例：Ollama、vLLM、Xinference、本地模型
                          </div>
                        </div>
                        <div
                          className={`border rounded-lg px-3 py-2 text-left ${
                            form.scope === 'public'
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-50'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 opacity-60'
                          }`}
                        >
                          <div className={`font-medium ${
                            form.scope === 'public'
                              ? 'text-slate-900'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}>公有模型</div>
                          <div className={`text-xs mt-1 ${
                            form.scope === 'public'
                              ? 'text-slate-600'
                              : 'text-slate-500 dark:text-slate-300'
                          }`}>
                            云端服务，数据通过网络在供应商云端处理推理
                          </div>
                          <div className={`text-xs mt-1.5 ${
                            form.scope === 'public'
                              ? 'text-slate-500'
                              : 'text-slate-400 dark:text-slate-400'
                          }`}>
                            示例：OpenAI、Claude、Gemini、DeepSeek
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* 模型类型：上下结构 */}
                    <div className="w-full">
                      <div className="mb-1 text-slate-700 dark:text-slate-200">
                        模型类型<span className="text-red-500"> *</span>
                      </div>
                      <Select
                        value={form.type}
                        placeholder="请选择模型类型"
                        style={{ width: '100%' }}
                        onChange={(v) => setForm((f: any) => ({ ...f, type: v }))}
                        options={[{ value: 'llm', label: '大语言模型' }]}
                      />
                    </div>
                    {/* 基础模型：标题与红字同一行，输入在下方 */}
                    <div className="w-full">
                      <div className="mb-1 flex items-center justify-between">
                        <div className="text-slate-700 dark:text-slate-200">
                          基础模型<span className="text-red-500"> *</span>
                        </div>
                        <div className="text-xs text-red-500">
                          列表中未列出的模型，直接输入模型名称，回车即可添加 *
                        </div>
                      </div>
                      <Select
                        mode="tags"
                        value={form.model_name ? [form.model_name] : []}
                        onChange={(vals) =>
                          setForm((f: any) => ({
                            ...f,
                            model_name: (vals as string[])[(vals as string[]).length - 1] || '',
                          }))
                        }
                        options={(findProvider(form.provider)?.baseModels || []).map((m) => ({
                          value: typeof m === 'string' ? m : m.name,
                          label: typeof m === 'string' ? m : m.name,
                        }))}
                        showSearch
                        style={{ width: '100%' }}
                        placeholder="自定义输入基础模型后回车即可"
                      />
                    </div>
                    {/* 凭证：选择基础模型后显示，纵向排列 */}
                    {!!form.model_name && (
                      <div className="w-full">
                        <div className="mb-1 text-slate-700 dark:text-slate-200">
                          凭证<span className="text-red-500"> *</span>
                        </div>
                        <div className="space-y-2">
                          {(
                            findProvider(form.provider)?.credentialFieldsPerModel?.[
                              form.model_name
                            ] ||
                            findProvider(form.provider)?.credentialFieldsPerModel?.default ||
                            findProvider(form.provider)?.credentialFields ||
                            []
                          ).map((f) => {
                            const isPassword = f.type === 'password';
                            return (
                              <Input
                                key={f.key}
                                type={
                                  isPassword ? (form.__show_api_key ? 'text' : 'password') : 'text'
                                }
                                placeholder={f.placeholder || ''}
                                value={(form as any)[f.key] || f.defaultValue || ''}
                                onChange={(e) =>
                                  setForm((prev: any) => ({ ...prev, [f.key]: e.target.value }))
                                }
                                style={{ width: '100%' }}
                                status={
                                  f.required && !(form as any)[f.key] ? ('error' as any) : undefined
                                }
                                addonBefore={
                                  <span
                                    className="text-slate-700 dark:text-slate-200"
                                    style={{ display: 'inline-block', width: 120 }}
                                  >
                                    {f.label}
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
                                      onClick={() =>
                                        setForm((prev: any) => ({
                                          ...prev,
                                          __show_api_key: !prev.__show_api_key,
                                        }))
                                      }
                                    >
                                      {form.__show_api_key ? (
                                        <EyeInvisibleOutlined />
                                      ) : (
                                        <EyeOutlined />
                                      )}
                                    </span>
                                  ) : undefined
                                }
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'advanced',
                label: '高级设置',
                children: (
                  <div className="pt-2 overflow-y-auto flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-slate-800 dark:text-slate-200">模型参数</div>
                      <button className="text-blue-600 dark:text-blue-400" onClick={() => addParamRow(setForm)}>
                        + 添加
                      </button>
                    </div>
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                      {/* 表头 */}
                      <div className="grid grid-cols-12 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm px-3 py-2">
                        <div className="col-span-3">显示名称</div>
                        <div className="col-span-3">参数</div>
                        <div className="col-span-2">组件类型</div>
                        <div className="col-span-2">默认值</div>
                        <div className="col-span-1 text-center">必填</div>
                        <div className="col-span-1 text-center">操作</div>
                      </div>
                      {/* 行 */}
                      {(form.params || []).map((p: any, idx: number) => (
                        <div
                          key={idx}
                          className="grid grid-cols-12 gap-2 items-center px-3 py-2 border-t border-slate-200 dark:border-slate-700"
                        >
                          <div className="col-span-3">
                            <Input
                              value={p.label}
                              onChange={(e) => updateParam(setForm, idx, { label: e.target.value })}
                              placeholder="温度"
                            />
                          </div>
                          <div className="col-span-3">
                            <Input
                              value={p.param_key}
                              onChange={(e) =>
                                updateParam(setForm, idx, { param_key: e.target.value })
                              }
                              placeholder="temperature / max_tokens"
                            />
                          </div>
                          <div className="col-span-2">
                            <Select
                              style={{ width: '100%' }}
                              value={p.ui_type || 'input'}
                              onChange={(v: string) => updateParam(setForm, idx, { ui_type: v })}
                              options={[
                                { value: 'input', label: '输入框' },
                                { value: 'slider', label: '滑块' },
                                { value: 'switch', label: '开关' },
                                { value: 'select', label: '下拉选择' },
                              ]}
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              value={p.value}
                              onChange={(e) => updateParam(setForm, idx, { value: e.target.value })}
                              placeholder="0.7 / 800"
                            />
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <Switch
                              size="small"
                              checked={!!p.required}
                              onChange={(v) => updateParam(setForm, idx, { required: v })}
                            />
                          </div>
                          <div className="col-span-1 text-center">
                            <button
                              className="text-red-600"
                              onClick={() => removeParamRow(setForm, idx)}
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      ))}
                      {!(form.params || []).length && (
                        <div className="text-center text-slate-500 py-6">
                          暂无参数，点击右上角"添加"创建
                        </div>
                      )}
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </DrawerContent>
      <DrawerFooter>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={saving || testing}>
            取消
          </Button>
          <Button
            onClick={handleTestConnection}
            disabled={saving || testing}
            loading={testing}
          >
            {testing ? "测试中..." : "测试连接"}
          </Button>
          <Button 
            type="primary" 
            onClick={handleSave}
            loading={saving}
            disabled={saving || testing}
          >
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </DrawerFooter>
    </DrawerProviderLevel2>
  );
}

function updateParam(setForm: any, i: number, delta: any) {
  setForm((f: any) => {
    const params = [...(f.params || [])];
    params[i] = { ...params[i], ...delta };
    return { ...f, params };
  });
}

function addParamRow(setForm: any) {
  setForm((f: any) => {
    const params = [...(f.params || [])];
    params.push({ label: '', param_key: '', ui_type: 'input', value: '', required: false });
    return { ...f, params };
  });
}

function removeParamRow(setForm: any, index: number) {
  setForm((f: any) => {
    const params = [...(f.params || [])];
    params.splice(index, 1);
    return { ...f, params };
  });
}

function getDefaultParamsByProvider(pid?: string, modelName?: string) {
  const m = pid ? findProvider(pid) : undefined;

  // 如果指定了模型名称,尝试从 baseModels 中获取该模型的参数
  if (modelName && m?.baseModels) {
    const model = m.baseModels.find((bm) =>
      typeof bm === 'string' ? bm === modelName : bm.name === modelName
    );
    if (model && typeof model !== 'string' && model.default_params) {
      return model.default_params;
    }
  }

  // 默认参数已全部移到 baseModels 中,这里返回空数组
  return [];
}

function getDefaultCredentialsByProvider(pid?: string) {
  const m = pid ? findProvider(pid) : undefined;
  const credentials: Record<string, any> = {};

  const fields = m?.credentialFields || [];
  fields.forEach((f) => {
    if (f.defaultValue) {
      credentials[f.key] = f.defaultValue;
    }
  });

  return credentials;
}

function getProviderScope(pid?: string) {
  const m = pid ? findProvider(pid) : undefined;
  return m?.scope;
}
