import {
  DeleteOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { Input, Modal, Select, Switch, Tabs, Tree } from 'antd';
import 'antd/dist/reset.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  deleteModel,
  getModel,
  listModels,
  selectUserModel,
  testModelConnectivity,
  upsertModel,
} from '../api/models';
import CollapsibleSidebar from '../components/CollapsibleSidebar';
import { message } from '../components/Message';
import PaginationBar from '../components/PaginationBar';
import { findProvider, providerManifests } from '../providers';

export default function Models() {
  const [loading, setLoading] = useState(false);
  const [testingModelId, setTestingModelId] = useState<string | null>(null); // 正在测试的模型ID
  const [list, setList] = useState<any[]>([]);
  const [filter, setFilter] = useState<{
    type?: string;
    keyword?: string;
    scope?: 'public' | 'private';
    providerId?: string;
  }>({ type: 'llm' });
  const [editing, setEditing] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const [total, setTotal] = useState(0);
  const [selectedTitle, setSelectedTitle] = useState<string>('全部模型');
  const [selectedKeys, setSelectedKeys] = useState<string[]>(['all']);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // 中央区域高度：视口 - Header(56) - Footer(48) - Main 上下内边距(48)
  const MAIN_HEIGHT = 'calc(100vh - 56px - 48px - 48px)';
  // 纵向间距自适应（行间距）：大屏更大，小屏较小
  const [rowGap, setRowGap] = useState<number>(16);

  useEffect(() => {
    const computeGap = () => {
      const h = window.innerHeight;
      // 小屏(<=800): 16px, 中屏(<=900): 24px, 大屏: 32px
      const gap = h > 900 ? 32 : h > 800 ? 24 : 16;
      setRowGap(gap);
    };
    computeGap();
    window.addEventListener('resize', computeGap);
    return () => window.removeEventListener('resize', computeGap);
  }, []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const requestIdRef = useRef(0);

  const providers = useMemo(
    () => ({
      public: providerManifests
        .filter((p) => p.scope === 'public')
        .map((p) => ({ id: p.id, name: p.name, icon: p.icon })),
      private: providerManifests
        .filter((p) => p.scope === 'private')
        .map((p) => ({ id: p.id, name: p.name, icon: p.icon })),
    }),
    [],
  );

  const treeData = useMemo(() => {
    const iconNode = (svg?: string) => {
      if (!svg) return null;
      const src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
      return <img src={src} alt="" style={{ width: 16, height: 16 }} />;
    };
    const map = (scope: 'public' | 'private', title: string) => ({
      key: `scope:${scope}`,
      title,
      children: providers[scope].map((p) => ({
        key: `provider:${p.id}`,
        title: (
          <div className="flex items-center gap-2">
            {iconNode(p.icon)}
            <span>{p.name}</span>
          </div>
        ),
      })),
    });
    return [
      {
        key: 'all',
        title: '全部模型',
        children: [map('public', '公有模型'), map('private', '私有模型')],
      },
    ];
  }, [providers]);

  const fetchList = async () => {
    const reqId = ++requestIdRef.current;
    setLoading(true);
    try {
      const res: any = await listModels({
        type: filter.type,
        keyword: filter.keyword,
        scope: filter.scope,
        provider: filter.providerId,
      });
      const all = (res.list || []) as any[];
      const totalCount = all.length;
      const lastPage = Math.max(1, Math.ceil(totalCount / pageSize));

      if (page > lastPage) {
        const newPage = lastPage;
        if (requestIdRef.current === reqId) {
          setTotal(totalCount);
          const startIdx = (newPage - 1) * pageSize;
          setList(all.slice(startIdx, startIdx + pageSize));
          setPage(newPage);
        }
        return;
      }

      if (requestIdRef.current === reqId) {
        setTotal(totalCount);
        const start = (page - 1) * pageSize;
        setList(all.slice(start, start + pageSize));
      }
    } catch (e: any) {
      message.error(e?.message || '获取模型失败');
    } finally {
      setLoading(false);
    }
  };

  async function handleEdit(m: any) {
    // 进入编辑。如果当前用户未绑定模型，则默认绑定一次（后端 /models/select 需要登录态）。
    try {
      const me = (JSON.parse(localStorage.getItem('auth_user') || 'null') || {}) as any;
      if (!me?.selected_model_id) {
        try {
          await selectUserModel(m.id);
        } catch (error) {
          console.error('Failed to select user model:', error);
        }
      }
    } catch (error) {
      console.error('Failed to get user info:', error);
    }
    try {
      const res: any = await getModel(m.id);
      const detail = res || {};
      if (detail.model) {
        const normalizedParams = (detail.params || []).map((p: any) => ({
          ...p,
          required: !!p.required,
        }));
        setEditing({ ...detail.model, params: normalizedParams });
        return;
      }
    } catch (error) {
      console.error('Failed to get model details:', error);
    }
    setEditing(m);
  }

  async function handleDelete(id: string) {
    await deleteModel(id);
    message.success('已删除');
    // 删除后立即刷新，保障页码回退逻辑生效
    await fetchList();
  }

  useEffect(() => {
    fetchList();
  }, [filter.type, filter.keyword, filter.scope, filter.providerId, page, pageSize]);

  return (
    <div className="flex gap-4 relative" style={{ height: MAIN_HEIGHT }}>
      {/* 测试连通性加载遮罩 */}
      {testingModelId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <div className="text-slate-700 font-medium">正在测试连通性，请稍候...</div>
          </div>
        </div>
      )}

      {/* 左侧树 */}
      <CollapsibleSidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        title="大模型供应商"
        className="h-full"
      >
        <div className="p-4 h-full overflow-y-auto">
          <Tree
            defaultExpandAll
            selectedKeys={selectedKeys as any}
            onSelect={(keys) => {
              const k = (keys?.[0] as string) || 'all';
              setSelectedKeys(keys as string[]);
              if (k === 'all') setFilter((f) => ({ ...f, scope: undefined, providerId: undefined }));
              else if (k.startsWith('scope:'))
                setFilter((f) => ({ ...f, scope: k.split(':')[1] as any, providerId: undefined }));
              else if (k.startsWith('provider:'))
                setFilter((f) => ({ ...f, providerId: k.split(':')[1] }));
              setPage(1);
              // 设置右侧标题
              if (k === 'all') setSelectedTitle('全部模型');
              else if (k.startsWith('scope:')) {
                const sc = k.split(':')[1];
                setSelectedTitle(sc === 'public' ? '公有模型' : '私有模型');
              } else if (k.startsWith('provider:')) {
                const pid = k.split(':')[1];
                setSelectedTitle(findProvider(pid)?.name || '全部模型');
              }
            }}
            treeData={treeData as any}
          />
        </div>
      </CollapsibleSidebar>

      {/* 右侧卡片 + 搜索 + 分页 */}
      <section className="flex-1 h-full min-h-0">
        <div className="mb-3 flex justify-between items-center">
          <div className="text-slate-900 font-semibold text-lg">{selectedTitle}</div>
          <div className="flex items-center gap-2">
            <Input.Search
              allowClear
              placeholder="搜索模型"
              style={{ width: 300 }}
              onSearch={(v) => {
                setFilter((f) => ({ ...f, keyword: v || undefined }));
                setPage(1);
              }}
            />
            <button
              className="h-8 px-4 rounded-lg bg-blue-600 text-white shadow-sm"
              onClick={() => {
                const k = selectedKeys[0] || 'all';
                if (k && k.startsWith('provider:')) {
                  // 已选中具体供应商，直接进入表单
                  const pid = k.split(':')[1];
                  const defaultCredentials = getDefaultCredentialsByProvider(pid);
                  setEditing({
                    scope: filter.scope || 'public',
                    type: 'llm',
                    provider: pid,
                    params: getDefaultParamsByProvider(pid),
                    ...defaultCredentials,
                  });
                } else {
                  setPickerOpen(true);
                }
              }}
            >
              添加模型
            </button>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 h-[calc(100%-56px)] overflow-y-auto">
          {loading && <div className="text-slate-500 text-sm">加载中…</div>}
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: rowGap }}>
            {list.map((m, idx) => {
              const providerCn = findProvider(m.provider)?.name || m.provider;
              const typeCn = m.type === 'llm' ? '大语言模型' : m.type || '-';
              const creatorCn = m.created_by === 'admin' ? '管理员' : m.created_by || '-';
              return (
                <div
                  key={m.id}
                  className="group border p-4 bg-white shadow-sm relative overflow-hidden"
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
                      {(() => {
                        const icon = findProvider(m.provider)?.icon;
                        if (icon) {
                          const src = `data:image/svg+xml;utf8,${encodeURIComponent(icon)}`;
                          return <img src={src} alt="" className="w-5 h-5" />;
                        }
                        return null;
                      })()}
                      <div className="font-semibold text-slate-900 text-base">{m.name}</div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${m.scope === 'public' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}
                      >
                        {m.scope === 'public' ? '公有' : '私有'}
                      </span>
                      {m.status && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${m.status === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
                        >
                          {m.status === 'ok' ? '已连通' : '不可用'}
                        </span>
                      )}
                    </div>
                    {/* 右上角操作：仅悬停卡片时显示 */}
                    <div className="hidden group-hover:flex items-center gap-3">
                      <button
                        className="inline-flex items-center justify-center"
                        title="测试连通性"
                        onClick={async () => {
                          try {
                            setTestingModelId(m.id); // 显示加载遮罩
                            const res: any = await testModelConnectivity(m.id);
                            message[res?.ok ? 'success' : 'error'](
                              res?.ok ? '连通正常' : '连通失败',
                            );
                            fetchList();
                          } catch {
                            message.error('测试失败');
                          } finally {
                            setTestingModelId(null); // 隐藏加载遮罩
                          }
                        }}
                      >
                        <LinkOutlined style={{ fontSize: 18, color: '#0ea5e9' }} />
                      </button>
                      <button
                        className="inline-flex items-center justify-center"
                        title="编辑"
                        onClick={() => handleEdit(m)}
                      >
                        <EditOutlined style={{ fontSize: 18, color: '#2563eb' }} />
                      </button>
                      <button
                        className="inline-flex items-center justify-center"
                        title="删除"
                        onClick={() => handleDelete(m.id)}
                      >
                        <DeleteOutlined style={{ fontSize: 18, color: '#dc2626' }} />
                      </button>
                    </div>
                  </div>
                  {/* 横线分割 */}
                  <div className="my-3 h-px bg-slate-200" />
                  {/* 详情信息：每项不换行，值溢出省略（时间不省略） */}
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm pl-6">
                    <div className="flex items-baseline gap-1 min-w-0">
                      <span className="text-slate-500 shrink-0 whitespace-nowrap">供应商：</span>
                      <span className="text-slate-800 font-medium truncate">{providerCn}</span>
                    </div>
                    <div className="flex items-baseline gap-1 min-w-0">
                      <span className="text-slate-500 shrink-0 whitespace-nowrap">模型类型：</span>
                      <span className="text-slate-800 font-medium truncate">{typeCn}</span>
                    </div>
                    <div className="flex items-baseline gap-1 min-w-0">
                      <span className="text-slate-500 shrink-0 whitespace-nowrap">基础模型：</span>
                      <span className="text-slate-800 truncate">{m.model_name}</span>
                    </div>
                    <div className="flex items-baseline gap-1 min-w-0">
                      <span className="text-slate-500 shrink-0 whitespace-nowrap">版本号：</span>
                      <span className="text-slate-800 truncate">{m.version || '-'}</span>
                    </div>
                    <div className="flex items-baseline gap-1 min-w-0">
                      <span className="text-slate-500 shrink-0 whitespace-nowrap">创建者：</span>
                      <span className="text-slate-800 truncate">{creatorCn}</span>
                    </div>
                    <div className="flex items-baseline gap-1 min-w-0">
                      <span className="text-slate-500 shrink-0 whitespace-nowrap">创建时间：</span>
                      <span className="text-slate-800 whitespace-nowrap">
                        {m.created_at ? new Date(m.created_at).toLocaleString() : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-center gap-3 text-sm text-slate-500">
            <PaginationBar
              page={page}
              pageSize={pageSize}
              total={total}
              onChange={(p) => setPage(p)}
            />
          </div>
        </div>
      </section>

      <EditModal
        open={!!editing}
        data={editing}
        onClose={() => setEditing(null)}
        onOk={async (v: any) => {
          // 组装 credentials：根据 provider 定义的字段收集
          const provider = findProvider(v.provider);
          const fields =
            provider?.credentialFieldsPerModel?.[v.model_name] ||
            provider?.credentialFieldsPerModel?.default ||
            provider?.credentialFields ||
            [];
          const credentials: Record<string, any> = {};
          fields.forEach((f) => {
            if (v[f.key] !== undefined && v[f.key] !== '') credentials[f.key] = v[f.key];
          });
          const payload: any = {
            ...v,
            icon: v.icon ?? `/logo-icon.png`,
            version: v.version ?? v.model_name,
            credentials,
            params: (v.params || []).map((p: any) => ({
              ...p,
              required: !!p.required,
            })),
          };
          await upsertModel(payload);
          setEditing(null);
          message.success('已保存');
          fetchList();
        }}
      />
      <ProviderPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(pid: string) => {
          setPickerOpen(false);
          const defaultCredentials = getDefaultCredentialsByProvider(pid);
          setEditing({
            scope: filter.scope || 'public',
            type: 'llm',
            provider: pid,
            params: getDefaultParamsByProvider(pid),
            ...defaultCredentials,
          });
        }}
        providers={providers}
        filterKey={selectedKeys[0] || 'all'}
      />
    </div>
  );
}

function getDefaultParamsByProvider(pid?: string) {
  const m = pid ? findProvider(pid) : undefined;
  return m?.defaultParams || [];
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

function EditModal({ open, data, onClose, onOk }: any) {
  const [form, setForm] = useState<any>(data || { scope: 'public', type: 'llm', params: [] });
  const [pickerOpenInner, setPickerOpenInner] = useState(false);
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
      console.error('Failed to get model details:', error);
    }
    
    // 合并默认值和基础数据
    const merged = { ...defaultCredentials, ...base };
    setForm(merged);
  }, [data]);

  // 初始化：从 provider manifest 预置默认参数到表格
  useEffect(() => {
    if (data?.provider && (!data?.params || data.params.length === 0)) {
      const preset = getDefaultParamsByProvider(data.provider);
      setForm((f: any) => ({ ...f, params: preset && preset.length ? preset : f.params }));
    }
  }, [data?.provider]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={() => onOk(form)}
      okText="保存"
      cancelText="取消"
      title={
        <div className="flex items-center gap-2">
          <button
            className="text-blue-600 hover:underline"
            onClick={() => setPickerOpenInner(true)}
          >
            选择供应商
          </button>
          <span className="text-slate-400">-＞</span>
          {(() => {
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
          })()}
        </div>
      }
      width={800}
      style={{ overflow: 'hidden' }}
    >
      {/* 内部供应商选择器 */}
      <ProviderPicker
        open={pickerOpenInner}
        onClose={() => setPickerOpenInner(false)}
        onPick={(pid: string) => {
          setPickerOpenInner(false);
          const defaultCredentials = getDefaultCredentialsByProvider(pid);
          setForm((f: any) => ({ 
            ...f, 
            provider: pid, 
            params: getDefaultParamsByProvider(pid),
            ...defaultCredentials
          }));
        }}
        providers={{
          public: providerManifests
            .filter((p) => p.scope === 'public')
            .map((p) => ({ id: p.id, name: p.name, icon: p.icon })),
          private: providerManifests
            .filter((p) => p.scope === 'private')
            .map((p) => ({ id: p.id, name: p.name, icon: p.icon })),
        }}
        filterKey={'all'}
      />
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
                        value: m,
                        label: m,
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
                        暂无参数，点击右上角“添加”创建
                      </div>
                    )}
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

function ProviderPicker({ open, onClose, onPick, providers, filterKey }: any) {
  // 根据左侧当前节点过滤
  let list: any[] = [];
  if (filterKey?.startsWith('scope:')) {
    const sc = filterKey.split(':')[1];
    list = providers[sc] || [];
  } else {
    list = [...providers.public, ...providers.private];
  }

  // 复制功能
  const handleCopy = () => {
    const content = list.map((p) => `${p.name}: ${p.id}`).join('\n');
    navigator.clipboard
      .writeText(content)
      .then(() => {
        message.success('已复制到剪贴板');
      })
      .catch(() => {
        message.error('复制失败');
      });
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title="选择供应商"
      width={900}
      style={{ overflow: 'hidden' }}
    >
      <div className="flex flex-col h-full">
        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto pb-4">
          <div className="grid grid-cols-2 gap-3">
            {list.map((p) => (
              <button
                key={p.id}
                onClick={() => onPick(p.id)}
                className="flex items-center border rounded-lg px-4 py-3 hover:bg-slate-50"
              >
                {p.icon &&
                  (() => {
                    const src = `data:image/svg+xml;utf8,${encodeURIComponent(p.icon)}`;
                    return <img src={src} alt="" className="w-6 h-6" />;
                  })()}
                <span className="ml-3 font-medium text-slate-800">{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 底部按钮区域 */}
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
          <button
            onClick={handleCopy}
            className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
          >
            复制
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            关闭
          </button>
        </div>
      </div>
    </Modal>
  );
}
