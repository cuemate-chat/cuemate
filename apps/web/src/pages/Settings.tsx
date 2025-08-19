import {
  Cog6ToothIcon,
  EyeIcon,
  EyeSlashIcon,
  GlobeAltIcon,
  PaintBrushIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { Select as AntSelect } from 'antd';
import 'antd/dist/reset.css';
import { useEffect, useState } from 'react';
import { changePassword, fetchMe, updateMe } from '../api/auth';
import { storage } from '../api/http';
import { listModels, selectUserModel } from '../api/models';
import { message } from '../components/Message';

type Theme = 'light' | 'dark' | 'system';

export default function Settings() {
  const [form, setForm] = useState({
    id: '',
    name: '',
    email: '',
    created_at: 0,
    theme: 'system' as Theme,
    locale: 'zh-CN',
    version: 'v0.1.0',
    timezone: 'Asia/Shanghai',
    selected_model_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [modelOptions, setModelOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    const u = storage.getUser();
    if (!u) {
      fetchMe()
        .then((res) => {
          const user = (res as any).user;
          if (user) {
            initForm(user);
            // 覆盖缓存，确保后续读取的就是服务端的 timezone
            storage.setUser(user);
          }
        })
        .catch(() => {});
    } else {
      initForm(u);
    }
  }, []);

  // 监听密码编辑器事件：单独请求修改密码，不混入其它字段
  useEffect(() => {
    const handler = (e: any) => {
      const { oldPassword, newPassword } = e.detail || {};
      if (!oldPassword || !newPassword) return;
      (async () => {
        try {
          await changePassword(oldPassword, newPassword);
          message.success('密码已更新');
        } catch (err: any) {
          message.error(err?.message || '修改密码失败');
        }
      })();
    };
    window.addEventListener('settings-set-password', handler as any);
    return () => window.removeEventListener('settings-set-password', handler as any);
  }, []);

  function initForm(u: any) {
    setForm({
      id: u.id,
      name: u.name || '',
      email: u.email || '',
      created_at: u.created_at || 0,
      theme: (u.theme || 'system') as Theme,
      locale: u.locale || 'zh-CN',
      version: 'v0.1.0',
      timezone: u.timezone || 'Asia/Shanghai',
      selected_model_id: u.selected_model_id || '',
    });
  }

  useEffect(() => {
    (async () => {
      try {
        const res: any = await listModels({ type: 'llm' });
        const opts = (res.list || []).map((m: any) => ({
          label: `${m.name} (${m.model_name})`,
          value: m.id,
        }));
        setModelOptions(opts);
      } catch (error) {
        console.error('Failed to load model options:', error);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      {/* 系统偏好设置 */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <header className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
          <Cog6ToothIcon className="w-5 h-5 text-slate-700" />
          <h2 className="text-slate-900 font-semibold">系统偏好设置</h2>
        </header>
        <div className="divide-y divide-slate-200">
          {/* 语言 */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="flex items-center gap-2 text-slate-800 font-medium">
              <GlobeAltIcon className="w-5 h-5 text-slate-600" />
              <span>语言</span>
            </div>
            <div className="md:col-span-2">
              <div className="w-full">
                <AntSelect
                  value={form.locale}
                  onChange={(v) => setForm((f) => ({ ...f, locale: v }))}
                  options={[
                    { value: 'zh-CN', label: '简体中文' },
                    { value: 'zh-TW', label: '繁體中文' },
                  ]}
                  className="w-full"
                  popupMatchSelectWidth
                  style={{ height: 40 }}
                  dropdownStyle={{ padding: 0 }}
                />
              </div>
              <p className="text-xs text-slate-600 mt-2">选择界面显示语言</p>
            </div>
          </div>

          {/* 主题 */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="flex items-center gap-2 text-slate-800 font-medium">
              <PaintBrushIcon className="w-5 h-5 text-slate-600" />
              <span>主题</span>
            </div>
            <div className="md:col-span-2">
              <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden bg-white shadow-sm">
                <button
                  className={`px-4 py-2 text-sm ${form.theme === 'light' ? 'bg-blue-50 text-blue-700' : 'text-slate-800 hover:bg-slate-50'}`}
                  onClick={() => setForm((f) => ({ ...f, theme: 'light' }))}
                >
                  浅色
                </button>
                <button
                  className={`px-4 py-2 text-sm border-l border-slate-300 ${form.theme === 'dark' ? 'bg-blue-50 text-blue-700' : 'text-slate-800 hover:bg-slate-50'}`}
                  onClick={() => setForm((f) => ({ ...f, theme: 'dark' }))}
                >
                  深色
                </button>
                <button
                  className={`px-4 py-2 text-sm border-l border-slate-300 ${form.theme === 'system' ? 'bg-blue-50 text-blue-700' : 'text-slate-800 hover:bg-slate-50'}`}
                  onClick={() => setForm((f) => ({ ...f, theme: 'system' }))}
                >
                  自动
                </button>
              </div>
              <p className="text-xs text-slate-600 mt-2">切换浅色/深色或跟随系统</p>
            </div>
          </div>

          {/* 时区 */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="flex items-center gap-2 text-slate-800 font-medium">
              <GlobeAltIcon className="w-5 h-5 text-slate-600" />
              <span>时区</span>
            </div>
            <div className="md:col-span-2">
              <div className="w-full">
                <AntSelect
                  value={form.timezone}
                  onChange={(v) => setForm((f) => ({ ...f, timezone: v }))}
                  options={[
                    { value: 'Asia/Shanghai', label: '北京时间 (UTC+8)' },
                    { value: 'Asia/Hong_Kong', label: '香港时间 (UTC+8)' },
                    { value: 'Asia/Tokyo', label: '日本时间 (UTC+9)' },
                    { value: 'America/Los_Angeles', label: '太平洋时间 (UTC-8)' },
                    { value: 'Europe/London', label: '伦敦时间 (UTC+0)' },
                  ]}
                  className="w-full"
                  popupMatchSelectWidth
                  style={{ height: 40 }}
                  dropdownStyle={{ padding: 0 }}
                />
              </div>
              <p className="text-xs text-slate-600 mt-2">设置显示的时区</p>
            </div>
          </div>

          {/* 版本号 */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="text-slate-800 font-medium">软件版本</div>
            <div className="md:col-span-2">
              <input
                value={form.version}
                disabled
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
              />
            </div>
          </div>

          {/* 当前绑定模型 */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="text-slate-800 font-medium">大模型供应商</div>
            <div className="md:col-span-2">
              <div className="w-full">
                <AntSelect
                  value={form.selected_model_id}
                  onChange={(v) => setForm((f) => ({ ...f, selected_model_id: v }))}
                  options={modelOptions}
                  className="w-full"
                  popupMatchSelectWidth
                  style={{ height: 40 }}
                />
              </div>
              <p className="text-xs text-slate-600 mt-2">
                为当前账号绑定一个模型。你也可以前往“模型设置”页面管理模型。
              </p>
              <div className="mt-2">
                <button
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm"
                  onClick={async () => {
                    if (!form.selected_model_id) return;
                    try {
                      await selectUserModel(form.selected_model_id);
                      // 绑定后立即拉取用户并落地缓存与表单，确保前端与数据库一致
                      const res = await fetchMe();
                      const user = (res as any).user;
                      if (user) {
                        storage.setUser(user);
                        initForm(user);
                      }
                      message.success('已绑定');
                    } catch (e: any) {
                      message.error(e?.message || '绑定失败');
                    }
                  }}
                >
                  立即绑定
                </button>
              </div>
            </div>
          </div>

          {/* 政策协议 */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="text-slate-800 font-medium">政策协议</div>
            <div className="md:col-span-2">
              <div className="flex items-center gap-4 text-sm">
                <a className="text-blue-700 hover:underline" href="/legal/user-agreement">
                  用户协议
                </a>
                <a className="text-blue-700 hover:underline" href="/legal/privacy">
                  隐私政策
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 账户信息 */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <header className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
          <UserCircleIcon className="w-5 h-5 text-slate-700" />
          <h2 className="text-slate-900 font-semibold">账户信息</h2>
        </header>
        <div className="divide-y divide-slate-200">
          {/* ID */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="text-slate-800 font-medium">ID</div>
            <div className="md:col-span-2">
              <input
                value={form.id}
                disabled
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
              />
            </div>
          </div>
          {/* 用户名 */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="text-slate-800 font-medium">用户名</div>
            <div className="md:col-span-2">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </div>
          </div>
          {/* 邮箱 */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="text-slate-800 font-medium">邮箱</div>
            <div className="md:col-span-2">
              <input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </div>
          </div>
          {/* 创建时间 */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="text-slate-800 font-medium">创建时间</div>
            <div className="md:col-span-2">
              <input
                value={form.created_at ? new Date(form.created_at).toLocaleString() : ''}
                disabled
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
              />
            </div>
          </div>
          {/* 密码修改 */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="text-slate-800 font-medium">密码</div>
            <div className="md:col-span-2">
              <PasswordEditor />
            </div>
          </div>
        </div>
        <div className="px-6 py-6 border-t border-slate-200 flex justify-center bg-slate-50">
          <button
            disabled={saving}
            onClick={() => {
              const payload: any = {
                name: form.name,
                email: form.email,
                theme: form.theme,
                locale: form.locale,
                timezone: form.timezone,
                selected_model_id: form.selected_model_id,
              };
              // 直接复用 onSave 逻辑
              (async () => {
                setSaving(true);
                try {
                  await updateMe(payload);
                  message.success('已保存');
                } catch (e: any) {
                  message.error(e?.message || '保存失败');
                } finally {
                  setSaving(false);
                }
              })();
            }}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white shadow-sm"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </section>
    </div>
  );
}

function PasswordEditor() {
  const [editing, setEditing] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    // 清空输入
    if (!editing) {
      setOldPwd('');
      setNewPwd('');
    }
  }, [editing]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="relative">
          <input
            placeholder="原密码（至少6位）"
            type={showOld ? 'text' : 'password'}
            disabled={!editing}
            className={`w-full rounded-lg border border-slate-300 px-3 pr-10 py-2 text-slate-900 ${!editing ? 'bg-slate-50' : ''}`}
            value={oldPwd}
            onChange={(e) => setOldPwd(e.target.value)}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
            onClick={() => setShowOld((v) => !v)}
          >
            {showOld ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
          </button>
          {editing && oldPwd.length > 0 && oldPwd.length < 6 && (
            <p className="mt-1 text-xs text-red-600">原密码长度至少 6 位</p>
          )}
        </div>
        <div className="relative">
          <input
            placeholder="新密码（至少6位）"
            type={showNew ? 'text' : 'password'}
            disabled={!editing}
            className={`w-full rounded-lg border border-slate-300 px-3 pr-10 py-2 text-slate-900 ${!editing ? 'bg-slate-50' : ''}`}
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
            onClick={() => setShowNew((v) => !v)}
          >
            {showNew ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
          </button>
          {editing && newPwd.length > 0 && newPwd.length < 6 && (
            <p className="mt-1 text-xs text-red-600">新密码长度至少 6 位</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm"
          onClick={() => {
            if (!editing) {
              setEditing(true);
            } else {
              // 校验最小长度
              if (oldPwd.length < 6 || newPwd.length < 6) {
                message.error('密码长度至少 6 位');
                return;
              }
              // 保存密码到本页 form（通过自定义事件传递）
              const ev = new CustomEvent('settings-set-password', {
                detail: { oldPassword: oldPwd, newPassword: newPwd },
              });
              window.dispatchEvent(ev);
              setEditing(false);
            }
          }}
        >
          {editing ? '保存密码' : '修改密码'}
        </button>
        {editing && (
          <span className="text-xs text-slate-600">
            不少于 6 位。保存密码后，再点击页面底部“保存”应用其他设置
          </span>
        )}
      </div>
    </div>
  );
}
