import {
  DeleteOutlined,
  EditOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { Button, Input, Modal, Tree } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { storage } from '../../api/http';
import {
  deleteModel,
  getModel,
  listModels,
  selectUserModel,
  testModelConnectivity,
  upsertModel,
} from '../../api/models';
import CollapsibleSidebar from '../../components/CollapsibleSidebar';
import FullScreenOverlay from '../../components/FullScreenOverlay';
import { message } from '../../components/Message';
import PageLoading from '../../components/PageLoading';
import PaginationBar from '../../components/PaginationBar';
import { useLoading } from '../../hooks/useLoading';
import { findProvider, providerManifests } from '../../providers';
import ModelEditDrawer from './ModelEditDrawer';
import ProviderPickerDrawer from './ProviderPickerDrawer';

export default function ModelsList() {
  const { loading, start: startLoading, end: endLoading } = useLoading();
  const [testingModelId, setTestingModelId] = useState<string | null>(null);
  const [testingInDrawer, setTestingInDrawer] = useState(false); // 编辑抽屉中的测试状态
  const { loading: operationLoading, start: startOperation, end: endOperation } = useLoading();
  const [list, setList] = useState<any[]>([]);
  const [filter, setFilter] = useState<{
    type?: string;
    keyword?: string;
    scope?: 'public' | 'private';
    providerId?: string;
  }>({ type: 'llm' });
  const [editing, setEditing] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [total, setTotal] = useState(0);
  const [selectedTitle, setSelectedTitle] = useState<string>('全部模型');
  const [selectedKeys, setSelectedKeys] = useState<string[]>(['all']);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // 侧拉弹框状态
  const [providerPickerOpen, setProviderPickerOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  
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

  const fetchList = async (showSuccessMessage: boolean = false) => {
    const reqId = ++requestIdRef.current;
    startLoading();
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

        if (showSuccessMessage) {
          message.success('已刷新模型列表');
        }
      }
    } catch {
      
    } finally {
      await endLoading();
    }
  };

  async function handleEdit(m: any) {
    // 进入编辑。如果当前用户未绑定模型，则默认绑定一次（后端 /models/select 需要登录态）。
    try {
      const me = (JSON.parse(localStorage.getItem('auth_user') || 'null') || {}) as any;
      if (!me?.selected_model_id) {
        try {
          await selectUserModel(m.id);
        } catch {
          
        }
      }
    } catch {
      // localStorage 解析失败，忽略
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
    } catch {
      
    }
    setEditing(m);
  }

  async function handleDelete(model: any) {
    const providerCn = findProvider(model.provider)?.name || model.provider;
    Modal.confirm({
      title: '确认删除模型',
      content: (
        <div>
          <p>确定要删除以下模型吗？删除后无法恢复。</p>
          <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <div className="space-y-1">
              <div><span className="font-medium">模型名称：</span>{model.name}</div>
              <div><span className="font-medium">供应商：</span>{providerCn}</div>
              <div><span className="font-medium">基础模型：</span>{model.model_name}</div>
            </div>
          </div>
        </div>
      ),
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        startOperation();
        try {
          await deleteModel(model.id);
          message.success('已删除');
          // 删除后立即刷新，保障页码回退逻辑生效
          await fetchList();
        } catch {
          
        } finally {
          await endOperation();
        }
      }
    });
  }

  useEffect(() => {
    fetchList();
  }, [filter.type, filter.keyword, filter.scope, filter.providerId, page, pageSize]);

  const handleAddModel = () => {
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
      setProviderPickerOpen(true);
    }
  };

  const handleProviderPick = (providerId: string) => {
    // 不关闭一级侧拉框，保存选中的供应商信息
    const provider = findProvider(providerId);
    setSelectedProvider(provider);
    
    // 打开二级侧拉框
    const defaultCredentials = getDefaultCredentialsByProvider(providerId);
    setEditing({
      scope: filter.scope || 'public',
      type: 'llm',
      provider: providerId,
      params: getDefaultParamsByProvider(providerId),
      ...defaultCredentials,
    });
  };

  const handleBackToProviderPicker = () => {
    // 关闭二级侧拉框，回到一级侧拉框
    setEditing(null);
    setSelectedProvider(null);
  };

  const handleModelSave = async (formData: any) => {
    startOperation();
    try {
      // 组装 credentials：根据 provider 定义的字段收集
      const provider = findProvider(formData.provider);
      const fields =
        provider?.credentialFieldsPerModel?.[formData.model_name] ||
        provider?.credentialFieldsPerModel?.default ||
        provider?.credentialFields ||
        [];
      const credentials: Record<string, any> = {};
      fields.forEach((f) => {
        // 优先使用用户填写的值，如果没有则使用 defaultValue
        const value = formData[f.key];
        if (value !== undefined && value !== '') {
          credentials[f.key] = value;
        } else if (f.defaultValue !== undefined && f.defaultValue !== '') {
          credentials[f.key] = f.defaultValue;
        }
      });
      // 获取 provider 的 icon_url 路径，用于存储到数据库
      const providerIconUrl = provider?.icon_url ?? null;

      const payload: any = {
        ...formData,
        icon: providerIconUrl,
        version: formData.version || 'v1',
        credentials,
        params: (formData.params || []).map((p: any) => ({
          ...p,
          required: !!p.required,
        })),
      };

      const updatedModel = await upsertModel(payload);

      // 同步更新 localStorage 中的用户数据
      const currentUser = storage.getUser();
      if (currentUser && currentUser.selected_model_id === formData.id) {
        // 如果保存的是当前用户选中的模型，则更新 localStorage
        const updatedUser = {
          ...currentUser,
          model: {
            ...updatedModel,
            credentials: JSON.stringify(credentials), // 确保 credentials 是 JSON 字符串
          },
          model_params: (formData.params || []).map((p: any) => ({
            ...p,
            model_id: formData.id,
            required: !!p.required,
          })),
        };
        storage.setUser(updatedUser);
      }

      // 保存成功后关闭所有侧拉框
      setEditing(null);
      setProviderPickerOpen(false);
      setSelectedProvider(null);

      message.success('已保存');
      fetchList();
    } finally {
      await endOperation();
    }
  };

  // 初始加载时显示全屏 loading
  if (loading) {
    return <PageLoading tip="正在加载模型列表..." />;
  }

  // 保存/删除操作时显示全屏 loading
  if (operationLoading) {
    return <PageLoading tip="正在处理，请稍候..." type="saving" />;
  }

  return (
    <div className="flex gap-4 relative" style={{ height: MAIN_HEIGHT }}>
      {/* 全屏遮罩组件 - 列表中的测试 */}
      <FullScreenOverlay
        visible={!!testingModelId}
        title="正在测试连通性"
        subtitle="请稍候，正在验证模型连接..."
        type="testing"
      />

      {/* 全屏遮罩组件 - 编辑抽屉中的测试 */}
      <FullScreenOverlay
        visible={testingInDrawer}
        title="正在测试连通性"
        subtitle="请稍候，正在验证模型连接..."
        type="testing"
      />

      {/* 左侧树 */}
      <CollapsibleSidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        title="大模型供应商"
        className="h-full"
      >
        <div className="p-4 h-full overflow-y-auto [&_.ant-tree]:text-slate-900 [&_.ant-tree]:dark:text-slate-100 [&_.ant-tree_.ant-tree-node-content-wrapper]:text-slate-900 [&_.ant-tree_.ant-tree-node-content-wrapper]:dark:text-slate-100 [&_.ant-tree_.ant-tree-title]:text-slate-900 [&_.ant-tree_.ant-tree-title]:dark:text-slate-100 [&_.ant-tree_.ant-tree-node-selected_.ant-tree-node-content-wrapper]:!bg-blue-100 [&_.ant-tree_.ant-tree-node-selected_.ant-tree-node-content-wrapper]:dark:!bg-blue-900/30 [&_.ant-tree_.ant-tree-node-selected_.ant-tree-title]:!text-blue-700 [&_.ant-tree_.ant-tree-node-selected_.ant-tree-title]:dark:!text-blue-300 [&_.ant-tree_.ant-tree-node-content-wrapper:hover]:!bg-slate-100 [&_.ant-tree_.ant-tree-node-content-wrapper:hover]:dark:!bg-slate-700 [&_.ant-tree_.ant-tree-node-selected_.ant-tree-node-content-wrapper:hover]:!bg-blue-100 [&_.ant-tree_.ant-tree-node-selected_.ant-tree-node-content-wrapper:hover]:dark:!bg-blue-900/30 [&_.ant-tree_.ant-tree-node-selected_.ant-tree-title:hover]:!text-blue-700 [&_.ant-tree_.ant-tree-node-selected_.ant-tree-title:hover]:dark:!text-blue-300">
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
                setFilter((f) => ({ ...f, scope: undefined, providerId: k.split(':')[1] }));
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
        <div className="mb-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="text-slate-900 dark:text-slate-100 font-semibold text-lg">{selectedTitle}</div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Input.Search
              allowClear
              placeholder="搜索模型"
              className="w-full sm:w-[300px]"
              onSearch={(v) => {
                setFilter((f) => ({ ...f, keyword: v || undefined }));
                setPage(1);
              }}
            />
            <Button onClick={() => fetchList(true)} disabled={loading} className="h-[32px]">
              刷新
            </Button>
            <Button type="primary" onClick={handleAddModel} className="h-[32px]">
              <span className="hidden sm:inline">添加模型</span>
              <span className="sm:hidden">添加</span>
            </Button>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 h-[calc(100%-56px)] overflow-y-auto">
          {loading && <div className="text-slate-500 text-sm">加载中…</div>}
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: rowGap }}>
            {list.map((m, idx) => {
              const providerCn = findProvider(m.provider)?.name || m.provider;
              const typeCn = m.type === 'llm' ? '大语言模型' : m.type || '-';
              const creatorCn = m.created_by === 'admin' ? '管理员' : m.created_by || '-';
              return (
                <div
                  key={m.id}
                  className="group border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800 shadow-sm relative overflow-hidden"
                >
                  {/* 左上角序号角标 */}
                  <div className="pointer-events-none absolute left-0 top-0">
                    <div className="bg-blue-600 text-white text-[10px] font-semibold px-2 py-1 rounded-br">
                      {(page - 1) * pageSize + idx + 1}
                    </div>
                    <div className="w-0 h-0 border-t-8 border-t-blue-700 border-r-8 border-r-transparent"></div>
                  </div>
                  <div className="pl-6">
                    {/* 标题和标签行 */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {(() => {
                          const icon = findProvider(m.provider)?.icon;
                          if (icon) {
                            const src = `data:image/svg+xml;utf8,${encodeURIComponent(icon)}`;
                            return <img src={src} alt="" className="w-5 h-5 shrink-0" />;
                          }
                          return null;
                        })()}
                        <div className="font-semibold text-slate-900 dark:text-slate-100 text-base truncate">{m.name}</div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${m.scope === 'public' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'}`}
                          >
                            {m.scope === 'public' ? '公有' : '私有'}
                          </span>
                          {m.status && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${m.status === 'ok' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}
                            >
                              {m.status === 'ok' ? '已连通' : '不可用'}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* 操作按钮：仅悬停卡片时显示 */}
                      <div className="hidden group-hover:flex items-center gap-3 shrink-0">
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
                          onClick={() => handleDelete(m)}
                        >
                          <DeleteOutlined style={{ fontSize: 18, color: '#dc2626' }} />
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* 横线分割 */}
                  <div className="my-3 h-px bg-slate-200 dark:bg-slate-700" />
                  {/* 详情信息：每项不换行，值溢出省略（时间不省略） */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm pl-6">
                    <div className="flex items-baseline gap-1 min-w-0">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0 whitespace-nowrap">供应商：</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium truncate">{providerCn}</span>
                    </div>
                    <div className="flex items-baseline gap-1 min-w-0">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0 whitespace-nowrap">模型类型：</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium truncate">{typeCn}</span>
                    </div>
                    <div className="flex items-baseline gap-1 min-w-0">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0 whitespace-nowrap">基础模型：</span>
                      <span className="text-slate-800 dark:text-slate-200 truncate">{m.model_name}</span>
                    </div>
                    <div className="flex items-baseline gap-1 min-w-0">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0 whitespace-nowrap">版本号：</span>
                      <span className="text-slate-800 dark:text-slate-200 truncate">{m.version || '-'}</span>
                    </div>
                    <div className="flex items-baseline gap-1 min-w-0">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0 whitespace-nowrap">创建者：</span>
                      <span className="text-slate-800 dark:text-slate-200 truncate">{creatorCn}</span>
                    </div>
                    <div className="flex items-baseline gap-1 min-w-0">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0 whitespace-nowrap">创建时间：</span>
                      <span className="text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {m.created_at ? new Date(m.created_at).toLocaleString() : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
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
        </div>
      </section>

      {/* 侧拉弹框组件 */}
      <ProviderPickerDrawer
        open={providerPickerOpen}
        onClose={() => {
          setProviderPickerOpen(false);
          setSelectedProvider(null);
        }}
        onPick={handleProviderPick}
        providers={providers}
        filterKey={selectedKeys[0] || 'all'}
      />

      <ModelEditDrawer
        open={!!editing}
        data={editing}
        selectedProvider={selectedProvider}
        onClose={() => {
          if (selectedProvider) {
            // 如果是从供应商选择来的，回到供应商选择
            handleBackToProviderPicker();
          } else {
            // 如果是直接编辑，直接关闭
            setEditing(null);
          }
        }}
        onBackToProvider={handleBackToProviderPicker}
        onOk={handleModelSave}
        onTestingChange={setTestingInDrawer}
      />
    </div>
  );
}

function getDefaultParamsByProvider(_pid?: string) {
  // 默认参数已移到 baseModels 的 default_params 中,这里返回空数组
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
