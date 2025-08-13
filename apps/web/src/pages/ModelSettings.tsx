import { Input, Modal, Select, Switch } from 'antd';
import 'antd/dist/reset.css';
import { useEffect, useMemo, useState } from 'react';
import { deleteModel, listModels, selectUserModel, upsertModel } from '../api/models';
import { message } from '../components/Message';
import { findProvider, providerManifests } from '../providers';

type Scope = 'public' | 'private' | 'local';

// 说明：旧的硬编码提供商列表已移除，改为通过 providers 目录的 manifest.ts 自动收集

// 同上：私有/本地提供商也统一走自动收集

export default function ModelSettings() {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<any[]>([]);
  const [filter, setFilter] = useState<{ type?: string; keyword?: string }>({ type: 'llm' });
  const [editing, setEditing] = useState<any | null>(null);

  const providers = useMemo(() => ({
    public: providerManifests.filter(p=>p.scope==='public').map(p=>({ value:p.id, label:p.name })),
    private: providerManifests.filter(p=>p.scope==='private').map(p=>({ value:p.id, label:p.name })),
    local: providerManifests.filter(p=>p.scope==='local').map(p=>({ value:p.id, label:p.name })),
  }), []);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res: any = await listModels({ type: filter.type, keyword: filter.keyword });
      setList(res.list || []);
    } catch (e: any) {
      message.error(e?.message || '获取模型失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, [filter.type, filter.keyword]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Select value={filter.type} style={{ width: 160 }} onChange={(v: string)=>setFilter(f=>({...f,type: v}))} options={[{value:'llm',label:'大语言模型'}]} />
          <Input.Search allowClear placeholder="搜索模型" style={{ width: 260 }} onSearch={(v)=>setFilter(f=>({...f,keyword:v}))} />
        </div>
        <button className="px-3 py-2 rounded-lg bg-blue-600 text-white shadow-sm" onClick={()=>setEditing({ scope:'public', type:'llm', params: [] })}>添加模型</button>
      </div>

      {/* 分组：公有/私有/本地 */}
      {(['public','private','local'] as Scope[]).map((scope)=> (
        <section key={scope} className="bg-white border border-slate-200 rounded-xl">
          <header className="px-4 py-2 border-b border-slate-200 text-slate-800 font-medium">{scope==='public'?'公有模型':scope==='private'?'私有模型':'本地模型'}</header>
          <div className="p-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {loading && <div className="text-slate-500 text-sm">加载中…</div>}
            {list.filter(m=>m.scope===scope).map(m=> (
              <div key={m.id} className="border rounded-xl p-4 bg-white shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-slate-900">{m.name}</div>
                  <div className="flex items-center gap-2">
                    <button className="text-blue-600" onClick={()=>setEditing(m)}>编辑</button>
                    <button className="text-red-600" onClick={async()=>{ await deleteModel(m.id); message.success('已删除'); fetchList(); }}>删除</button>
                    <button className="text-slate-700" onClick={async()=>{ await selectUserModel(m.id); message.success('已绑定为当前模型'); }}>绑定</button>
                  </div>
                </div>
                <div className="text-xs text-slate-600 mt-2">{m.provider} · {m.model_name}</div>
              </div>
            ))}
            {!list.filter(m=>m.scope===scope).length && (
              <div className="text-slate-500 text-sm">暂无数据</div>
            )}
          </div>
        </section>
      ))}

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
            <label className="flex items-center gap-2 text-sm"><Switch checked={form.scope==='local'} onChange={(v)=>setForm((f:any)=>({...f,scope:v?'local':'private'}))}/> 本地</label>
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
              options={[...providers.public, ...providers.private, ...providers.local]}
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


