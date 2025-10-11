import {
  EyeInvisibleOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { Button, Input, Select, Switch, Tabs } from 'antd';
import { useEffect, useState } from 'react';
import { testModelConnectivity } from '../../api/models';
import DrawerProviderLevel2, { DrawerContent, DrawerFooter, DrawerHeader } from '../../components/DrawerProviderLevel2';
import { message } from '../../components/Message';
import { findProvider } from '../../providers';

interface ModelEditDrawerProps {
  open: boolean;
  onClose: () => void;
  data: any;
  selectedProvider?: any;
  onBackToProvider?: () => void;
  onOk: (formData: any) => Promise<void>;
}

export default function ModelEditDrawer({
  open,
  onClose,
  data,
  selectedProvider,
  onBackToProvider,
  onOk
}: ModelEditDrawerProps) {
  const [form, setForm] = useState<any>(data || { scope: 'public', type: 'llm', params: [] });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const base = data || { scope: 'public', type: 'llm', params: [] };
    
    // 获取provider的默认凭据值
    const defaultCredentials = base.provider ? getDefaultCredentialsByProvider(base.provider) : {};
    
    // 若包含 credentials(JSON 文本或对象)，展开到表单字段，便于编辑
    try {
      const raw = (base as any).credentials;
      const obj = typeof raw === 'string' ? JSON.parse(raw) : raw || {};
      if (obj && typeof obj === 'object') {
        const merged = { ...defaultCredentials, ...base, ...obj };
        setForm(merged);
        return;
      }
    } catch (error) {
      message.error('Failed to get model details:' + error);
    }
    
    // 合并默认值和基础数据
    const merged = { ...defaultCredentials, ...base };
    setForm(merged);
  }, [data]);

  // 初始化：从 provider manifest 预置默认参数到表格
  useEffect(() => {
    if (form.provider && form.model_name) {
      const preset = getDefaultParamsByProvider(form.provider, form.model_name);
      if (preset && preset.length > 0) {
        setForm((f: any) => ({ ...f, params: preset }));
      }
    }
  }, [form.provider, form.model_name]);

  // 测试连接功能
  const handleTestConnection = async () => {
    if (!form.provider || !form.model_name) {
      message.warning('请先选择供应商和基础模型');
      return;
    }

    // 检查是否有模型ID（如果是编辑已有模型）
    if (!form.id) {
      message.warning('请先保存模型后再测试连接');
      return;
    }

    setTesting(true);
    try {
      const result = await testModelConnectivity(form.id);
      console.debug('测试连接结果:', result);
      message.success('连接测试成功！模型可以正常使用');
    } catch (error: any) {
      console.error('测试连接失败:', error);
      message.error(error?.message || '连接测试失败，请检查配置信息');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
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
                      <div className="mb-1 text-slate-700">
                        模型名称<span className="text-red-500"> *</span>
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
                    {/* 模型情况：上下结构 */}
                    <div className="w-full">
                      <div className="mb-2 text-slate-700">
                        模型情况<span className="text-red-500"> *</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 w-full">
                        <button
                          className={`border rounded-lg px-3 py-2 text-left ${form.scope === 'private' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
                          onClick={() => setForm((f: any) => ({ ...f, scope: 'private' }))}
                        >
                          <div className="font-medium">私有</div>
                          <div className="text-xs text-slate-500">
                            私有部署为主，数据在您的设备或自有环境内处理与存储
                          </div>
                        </button>
                        <button
                          className={`border rounded-lg px-3 py-2 text-left ${form.scope === 'public' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
                          onClick={() => setForm((f: any) => ({ ...f, scope: 'public' }))}
                        >
                          <div className="font-medium">公有</div>
                          <div className="text-xs text-slate-500">
                            线上大模型，数据在供应商的云端处理与存储（默认存本地，供应商不主动收集）
                          </div>
                        </button>
                      </div>
                    </div>
                    {/* 模型类型：上下结构 */}
                    <div className="w-full">
                      <div className="mb-1 text-slate-700">
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
                        <div className="text-slate-700">
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
                        <div className="mb-1 text-slate-700">
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
                                    className="text-slate-700"
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
                      <div className="text-slate-800">模型参数</div>
                      <button className="text-blue-600" onClick={() => addParamRow(setForm)}>
                        + 添加
                      </button>
                    </div>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      {/* 表头 */}
                      <div className="grid grid-cols-12 bg-slate-50 text-slate-600 text-sm px-3 py-2">
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
                          className="grid grid-cols-12 gap-2 items-center px-3 py-2 border-t border-slate-200"
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
            disabled={saving || testing || !form.provider || !form.model_name}
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
