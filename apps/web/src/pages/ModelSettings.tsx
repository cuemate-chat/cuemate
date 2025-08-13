import { Input, Modal, Pagination, Select, Switch, Tree } from 'antd';
import 'antd/dist/reset.css';
import { useEffect, useMemo, useState } from 'react';
import { deleteModel, listModels, selectUserModel, upsertModel } from '../api/models';
import { message } from '../components/Message';
import { findProvider, providerManifests } from '../providers';

type Scope = 'public' | 'private';

// 说明：旧的硬编码提供商列表已移除，改为通过 providers 目录的 manifest.ts 自动收集

// 同上：私有/本地提供商也统一走自动收集

export default function ModelSettings() {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<any[]>([]);
  const [filter, setFilter] = useState<{ type?: string; keyword?: string; scope?: 'public'|'private'; providerId?: string }>({ type: 'llm' });
  const [editing, setEditing] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const [total, setTotal] = useState(0);
  const [selectedTitle, setSelectedTitle] = useState<string>('全部模型');
  const [selectedKeys, setSelectedKeys] = useState<string[]>(['all']);
  const PAGE_HEIGHT = 675;

  const providers = useMemo(() => ({
    public: providerManifests.filter(p=>p.scope==='public'),
    private: providerManifests.filter(p=>p.scope==='private'),
  }), []);

  const treeData = useMemo(()=>{
    const iconNode = (svg?: string) => {
      if (!svg) return null;
      const src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
      return <img src={src} alt="" style={{ width: 16, height: 16 }} />;
    };
    const map = (scope: 'public'|'private', title: string) => ({
      key: `scope:${scope}`,
      title,
      children: providers[scope].map(p=>({ key: `provider:${p.id}`, title: <div className="flex items-center gap-2">{iconNode(p.icon)}<span>{p.name}</span></div> })),
    });
    return [
      { key: 'all', title: '全部模型', children: [map('public','公有模型'), map('private','私有模型')] },
    ];
  }, [providers]);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res: any = await listModels({ type: filter.type, keyword: filter.keyword, scope: filter.scope, provider: filter.providerId });
      const all = (res.list || []) as any[];
      setTotal(all.length);
      const start = (page - 1) * pageSize;
      setList(all.slice(start, start + pageSize));
    } catch (e: any) {
      message.error(e?.message || '获取模型失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, [filter.type, filter.keyword, filter.scope, filter.providerId, page, pageSize]);

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* 左侧树 */}
      <aside className="col-span-3 bg-white border border-slate-200 rounded-xl p-3" style={{ height: PAGE_HEIGHT, overflowY: 'auto' }}>
        <div className="flex items-center mb-2">
          <div className="text-slate-800 font-medium">大模型供应商</div>
        </div>
        <Tree
          defaultExpandAll
          selectedKeys={selectedKeys as any}
          onSelect={(keys)=>{
            const k = (keys?.[0] as string) || 'all';
            setSelectedKeys(keys as string[]);
            if (k==='all') setFilter(f=>({...f, scope: undefined, providerId: undefined }));
            else if (k.startsWith('scope:')) setFilter(f=>({...f, scope: k.split(':')[1] as any, providerId: undefined }));
            else if (k.startsWith('provider:')) setFilter(f=>({...f, providerId: k.split(':')[1] }));
            setPage(1);
            // 设置右侧标题
            if (k==='all') setSelectedTitle('全部模型');
            else if (k.startsWith('scope:')) {
              const sc = k.split(':')[1];
              setSelectedTitle(sc==='public' ? '公有模型' : '私有模型');
            } else if (k.startsWith('provider:')) {
              const pid = k.split(':')[1];
              setSelectedTitle(findProvider(pid)?.name || '全部模型');
            }
          }}
          treeData={treeData as any}
        />
      </aside>

      {/* 右侧卡片 + 搜索 + 分页 */}
      <section className="col-span-9" style={{ height: PAGE_HEIGHT }}>
        <div className="mb-3 flex justify-between items-center">
          <div className="text-slate-900 font-semibold text-lg">{selectedTitle}</div>
          <div className="flex items-center gap-2">
            <Input.Search allowClear placeholder="搜索模型" style={{ width: 300 }} onSearch={(v)=>{ setFilter(f=>({...f, keyword:v||undefined })); setPage(1); }} />
            <button className="h-8 px-4 rounded-lg bg-blue-600 text-white shadow-sm" onClick={()=>setEditing({ scope:'public', type:'llm', params: [] })}>添加模型</button>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4" style={{ height: PAGE_HEIGHT - 56, overflowY: 'auto' }}>
          {loading && <div className="text-slate-500 text-sm">加载中…</div>}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((m)=> (
              <div key={m.id} className="border rounded-xl p-4 bg-white shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const icon = findProvider(m.provider)?.icon;
                      if (icon) {
                        const src = `data:image/svg+xml;utf8,${encodeURIComponent(icon)}`;
                        return <img src={src} alt="" className="w-5 h-5" />;
                      }
                      return null;
                    })()}
                    <div className="font-medium text-slate-900">{m.name}</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${m.scope==='public'?'bg-blue-50 text-blue-700':'bg-amber-50 text-amber-700'}`}>{m.scope==='public'?'公有':'私有'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-blue-600" onClick={()=>setEditing(m)}>编辑</button>
                    <button className="text-red-600" onClick={async()=>{ await deleteModel(m.id); message.success('已删除'); fetchList(); }}>删除</button>
                    <button className="text-slate-700" onClick={async()=>{ await selectUserModel(m.id); message.success('已绑定为当前模型'); }}>绑定</button>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                  <div>供应商标识：{m.provider}</div>
                  <div>模型类型：{m.type || 'llm'}</div>
                  <div>基础模型：{m.model_name}</div>
                  <div>版本号：{m.version || '-'}</div>
                  <div>创建者：{m.created_by || '-'}</div>
                  <div>创建时间：{m.created_at ? new Date(m.created_at).toLocaleString() : '-'}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center gap-3 text-sm text-slate-500">
            <span>共 {total} 条</span>
            <Pagination current={page} pageSize={pageSize} total={total} onChange={(p)=>{ setPage(p); }} showSizeChanger={false} showTotal={(t)=>`共 ${t} 条`} />
          </div>
        </div>
      </section>

      <EditModal open={!!editing} data={editing} onClose={()=>setEditing(null)} onOk={async(v:any)=>{ await upsertModel(v); setEditing(null); message.success('已保存'); fetchList(); }} providers={providers} />
    </div>
  );
}

function getDefaultParamsByProvider(pid?: string) {
  const m = pid ? findProvider(pid) : undefined;
  return m?.defaultParams || [];
}

function EditModal({ open, data, onClose, onOk, providers }: any) {
  const [form, setForm] = useState<any>(data || { scope: 'public', type: 'llm', params: [] });
  useEffect(()=>{ setForm(data || { scope:'public', type:'llm', params: [] }); }, [data]);

  return (
    <Modal open={open} onCancel={onClose} onOk={()=>onOk(form)} title={`添加 ${form.provider || ''}`} okText="保存">
      <div className="space-y-3">
        <div className="grid grid-cols-3 items-center gap-2">
          <div className="text-right text-slate-700">模型名称</div>
          <div className="col-span-2"><Input value={form.name} onChange={(e)=>setForm((f:any)=>({...f,name:e.target.value}))} /></div>
        </div>
        <div className="grid grid-cols-3 items-center gap-2">
          <div className="text-right text-slate-700">权限</div>
          <div className="col-span-2 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm"><Switch checked={form.scope==='public'} onChange={(v)=>setForm((f:any)=>({...f,scope:v?'public':'private'}))}/> 公有</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={form.scope==='private'} onChange={(v)=>setForm((f:any)=>({...f,scope:v?'private':'public'}))}/> 私有</label>
          </div>
        </div>
        <div className="grid grid-cols-3 items-center gap-2">
          <div className="text-right text-slate-700">模型类型</div>
          <div className="col-span-2">
            <Select value={form.type} style={{ width: 220 }} onChange={(v)=>setForm((f:any)=>({...f,type:v}))} options={[{value:'llm',label:'大语言模型'}]} />
          </div>
        </div>
        <div className="grid grid-cols-3 items-center gap-2">
          <div className="text-right text-slate-700">提供商</div>
          <div className="col-span-2">
            <Select
              value={form.provider}
              style={{ width: 320 }}
              onChange={(v: string)=>setForm((f: any)=>({
                ...f,
                provider:v,
                params: getDefaultParamsByProvider(v),
              }))}
              options={[...providers.public, ...providers.private]}
              showSearch
            />
          </div>
        </div>
        <div className="grid grid-cols-3 items-center gap-2">
          <div className="text-right text-slate-700">基础模型</div>
          <div className="col-span-2"><Input placeholder="如 deepseek-r1:1.5b 或 gpt-4o-mini" value={form.model_name} onChange={(e)=>setForm((f:any)=>({...f,model_name:e.target.value}))} /></div>
        </div>
        <div className="grid grid-cols-3 items-center gap-2">
          <div className="text-right text-slate-700">凭证</div>
          <div className="col-span-2 space-y-2">
            {(findProvider(form.provider)?.credentialFields || []).map((f) => (
              <Input
                key={f.key}
                type={f.type === 'password' ? 'password' : 'text'}
                placeholder={f.placeholder || ''}
                value={(form as any)[f.key] || ''}
                onChange={(e)=>setForm((prev:any)=>({ ...prev, [f.key]: e.target.value }))}
              />
            ))}
          </div>
        </div>

        <div className="pt-2">
          <div className="text-slate-800 font-medium mb-2">高级设置</div>
          <div className="space-y-2">
            {form.params?.map((p:any, idx:number)=> (
              <div key={idx} className="grid grid-cols-3 items-center gap-2">
                <Input value={p.label} onChange={(e)=>updateParam(setForm, idx, { label: e.target.value })} placeholder="显示名称" />
                <Input value={p.param_key} onChange={(e)=>updateParam(setForm, idx, { param_key: e.target.value })} placeholder="参数键" />
                <Input value={p.value} onChange={(e)=>updateParam(setForm, idx, { value: e.target.value })} placeholder="默认值" />
              </div>
            ))}
          </div>
        </div>
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


