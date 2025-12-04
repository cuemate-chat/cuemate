import {
    ArrowsPointingOutIcon,
    ClockIcon,
    Cog6ToothIcon,
    CubeIcon,
    CursorArrowRaysIcon,
    DocumentTextIcon,
    EyeIcon,
    EyeSlashIcon,
    GlobeAltIcon,
    InformationCircleIcon,
    PaintBrushIcon,
    UserCircleIcon,
    WindowIcon,
} from '@heroicons/react/24/outline';
import { Select as AntSelect, Button } from 'antd';
import 'antd/dist/reset.css';
import { useEffect, useState } from 'react';
import { changePassword, defaultUserForm, fetchMe, updateMe, userToFormData } from '../../api/auth';
import { storage } from '../../api/http';
import { listModels } from '../../api/models';
import { message } from '../../components/Message';
import PageLoading from '../../components/PageLoading';
import { useLoading } from '../../hooks/useLoading';
import { findProvider } from '../../providers';

export default function Settings() {
  const [form, setForm] = useState(defaultUserForm);
  const { loading: saving, start: startSaving, end: endSaving } = useLoading();
  const { loading, start: startLoading, end: endLoading } = useLoading();
  const [modelOptions, setModelOptions] = useState<{ label: string; value: string; provider?: string }[]>([]);

  useEffect(() => {
    const loadData = async () => {
      startLoading();
      try {
        const user = await fetchMe();
        if (user) {
          setForm(userToFormData(user));
          storage.setUser(user);
        }
      } catch {
        // error handled by global http client
      } finally {
        await endLoading();
      }
    };
    loadData();
  }, [startLoading, endLoading]);

  // 监听用户设置更新事件（如顶部语言选择器修改），同步更新表单
  useEffect(() => {
    const handler = (e: any) => {
      const updatedUser = e.detail;
      if (updatedUser) {
        setForm(userToFormData(updatedUser));
      }
    };
    window.addEventListener('user-settings-updated', handler);
    return () => window.removeEventListener('user-settings-updated', handler);
  }, []);

  // 监听密码编辑器事件：单独请求修改密码，不混入其它字段
  useEffect(() => {
    const handler = (e: any) => {
      const { oldPassword, newPassword } = e.detail || {};
      if (!oldPassword || !newPassword) return;
      (async () => {
        startSaving();
        try {
          await changePassword(oldPassword, newPassword);
          message.success('密码已更新');
        } catch {
          
        } finally {
          await endSaving();
        }
      })();
    };
    window.addEventListener('settings-set-password', handler as any);
    return () => window.removeEventListener('settings-set-password', handler as any);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await listModels({ type: 'llm' });
        const opts = (res.list || []).map((m: any) => ({
          label: `${m.name} (${m.modelName})`,
          value: m.id,
          provider: m.provider, // 保存 provider 信息用于显示图标
        }));
        setModelOptions(opts);
      } catch {
        // 加载模型选项失败，忽略
      }
    })();
  }, []);

  // 初次加载时显示全屏 loading
  if (loading) {
    return <PageLoading tip="正在加载系统设置..." />;
  }

  // 保存操作时显示全屏 loading
  if (saving) {
    return <PageLoading tip="正在保存设置..." type="saving" />;
  }

  return (
    <div className="space-y-6">
      {/* 系统偏好设置 */}
      <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
        <header className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
          <Cog6ToothIcon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          <h2 className="text-slate-900 dark:text-slate-100 font-semibold">系统偏好设置</h2>
        </header>
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {/* 语言 */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-medium">
              <GlobeAltIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
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
                    { value: 'en-US', label: 'English' },
                  ]}
                  className="w-full"
                  popupMatchSelectWidth
                  style={{ height: 40 }}
                  dropdownStyle={{ padding: 0 }}
                />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">选择界面显示语言</p>
            </div>
          </div>

          {/* 主题 */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-medium">
              <PaintBrushIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <span>主题</span>
            </div>
            <div className="md:col-span-2">
              <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden bg-white dark:bg-slate-700 shadow-sm">
                <button
                  className={`px-4 py-2 text-sm ${form.theme === 'light' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                  onClick={() => setForm((f) => ({ ...f, theme: 'light' }))}
                >
                  浅色
                </button>
                <button
                  className={`px-4 py-2 text-sm border-l border-slate-300 dark:border-slate-600 ${form.theme === 'dark' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                  onClick={() => setForm((f) => ({ ...f, theme: 'dark' }))}
                >
                  深色
                </button>
                <button
                  className={`px-4 py-2 text-sm border-l border-slate-300 dark:border-slate-600 ${form.theme === 'system' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                  onClick={() => setForm((f) => ({ ...f, theme: 'system' }))}
                >
                  自动
                </button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">切换浅色/深色或跟随系统</p>
            </div>
          </div>

          {/* 时区 */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-medium">
              <ClockIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
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
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">设置显示的时区</p>
            </div>
          </div>

          {/* 版本号 */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-medium">
              <InformationCircleIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <span>软件版本</span>
            </div>
            <div className="md:col-span-2">
              <input
                value={form.version || 'v0.1.0'}
                disabled
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* 当前绑定模型 */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-medium">
              <CubeIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <span>大模型供应商</span>
            </div>

            <div className="md:col-span-2">
              <div className="w-full">
                <AntSelect
                  value={form.selectedModelId}
                  onChange={(v) => setForm((f) => ({ ...f, selectedModelId: v }))}
                  options={modelOptions}
                  className="w-full"
                  popupMatchSelectWidth
                  style={{ height: 40 }}
                  optionRender={(option) => {
                    const providerData = option.data.provider;
                    const provider = providerData ? findProvider(providerData) : undefined;
                    const icon = provider?.icon;
                    return (
                      <div className="flex items-center gap-2">
                        {icon && (
                          <img
                            src={`data:image/svg+xml;utf8,${encodeURIComponent(icon)}`}
                            alt=""
                            className="w-5 h-5 shrink-0"
                          />
                        )}
                        <span>{option.label}</span>
                      </div>
                    );
                  }}
                  labelRender={(option) => {
                    const modelOption = modelOptions.find((m) => m.value === option.value);
                    const providerData = modelOption?.provider;
                    const provider = providerData ? findProvider(providerData) : undefined;
                    const icon = provider?.icon;
                    return (
                      <div className="flex items-center gap-2">
                        {icon && (
                          <img
                            src={`data:image/svg+xml;utf8,${encodeURIComponent(icon)}`}
                            alt=""
                            className="w-5 h-5 shrink-0"
                          />
                        )}
                        <span>{option.label}</span>
                      </div>
                    );
                  }}
                />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                为当前账号绑定一个模型。选择后点击页面底部"保存"按钮生效。你也可以前往"模型设置"页面管理模型。
              </p>
            </div>
          </div>

          {/* 政策协议 */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-medium">
              <DocumentTextIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <span>政策协议</span>
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center gap-4 text-sm">
                <a className="text-blue-700 dark:text-blue-400 hover:underline" href="/legal/user-agreement">
                  用户协议
                </a>
                <a className="text-blue-700 dark:text-blue-400 hover:underline" href="/legal/privacy">
                  隐私政策
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 悬浮窗设置 */}
      <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
        <header className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
          <WindowIcon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          <h2 className="text-slate-900 dark:text-slate-100 font-semibold">悬浮窗设置</h2>
        </header>
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {/* 点击穿透模式 */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-medium">
              <CursorArrowRaysIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <span>点击穿透</span>
            </div>
            <div className="md:col-span-2">
              <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden bg-white dark:bg-slate-700 shadow-sm">
                <button
                  className={`px-4 py-2 text-sm ${form.floatingWindowVisible === 1 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                  onClick={() => setForm((f) => ({ ...f, floatingWindowVisible: 1 }))}
                >
                  交互模式
                </button>
                <button
                  className={`px-4 py-2 text-sm border-l border-slate-300 dark:border-slate-600 ${form.floatingWindowVisible === 0 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                  onClick={() => setForm((f) => ({ ...f, floatingWindowVisible: 0 }))}
                >
                  穿透模式
                </button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">穿透模式下窗口依然可见，但鼠标点击会穿透到下层应用，快捷键 ⌘⇧CM 切换</p>
            </div>
          </div>

          {/* 悬浮窗口高度 */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-medium">
              <ArrowsPointingOutIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <span>窗口高度</span>
            </div>
            <div className="md:col-span-2">
              <div className="w-full">
                <AntSelect
                  value={form.floatingWindowHeight}
                  onChange={(v) => setForm((f) => ({ ...f, floatingWindowHeight: v }))}
                  options={[
                    { value: 50, label: '50%' },
                    { value: 75, label: '75%' },
                    { value: 100, label: '100%' },
                  ]}
                  className="w-full"
                  popupMatchSelectWidth
                  style={{ height: 40 }}
                />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">设置桌面应用悬浮窗口的屏幕高度占比</p>
            </div>
          </div>
        </div>
      </section>

      {/* 账户信息 */}
      <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
        <header className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
          <UserCircleIcon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          <h2 className="text-slate-900 dark:text-slate-100 font-semibold">账户信息</h2>
        </header>
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {/* ID */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="text-slate-800 dark:text-slate-200 font-medium">ID</div>
            <div className="md:col-span-2">
              <input
                value={form.id}
                disabled
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          {/* 用户名 */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="text-slate-800 dark:text-slate-200 font-medium">用户名</div>
            <div className="md:col-span-2">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          {/* 邮箱 */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="text-slate-800 dark:text-slate-200 font-medium">邮箱</div>
            <div className="md:col-span-2">
              <input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          {/* 创建时间 */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="text-slate-800 dark:text-slate-200 font-medium">创建时间</div>
            <div className="md:col-span-2">
              <input
                value={form.createdAt ? new Date(form.createdAt).toLocaleString() : ''}
                disabled
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          {/* 密码修改 */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="text-slate-800 dark:text-slate-200 font-medium">密码</div>
            <div className="md:col-span-2">
              <PasswordEditor />
            </div>
          </div>
        </div>
        <div className="px-6 py-6 border-t border-slate-200 dark:border-slate-700 flex justify-center bg-slate-50 dark:bg-slate-800/50 gap-3">
          <Button
            disabled={loading}
            onClick={() => {
              (async () => {
                startLoading();
                try {
                  // 重新拉取用户信息
                  const user = await fetchMe();
                  if (user) {
                    setForm(userToFormData(user));
                    storage.setUser(user);
                  }
                  // 重新拉取模型列表
                  try {
                    const res: any = await listModels({ type: 'llm' });
                    const opts = (res.list || []).map((m: any) => ({
                      label: `${m.name} (${m.modelName})`,
                      value: m.id,
                      provider: m.provider, // 保存 provider 信息用于显示图标
                    }));
                    setModelOptions(opts);
                  } catch {}
                  message.success('已刷新设置');
                } catch {
                  
                } finally {
                  await endLoading();
                }
              })();
            }}
            className="h-[40px]"
          >
            {loading ? '刷新中…' : '刷新'}
          </Button>
          <button
            disabled={saving}
            onClick={() => {
              const payload: any = {
                name: form.name,
                email: form.email,
                theme: form.theme,
                locale: form.locale,
                timezone: form.timezone,
                selectedModelId: form.selectedModelId,
                floatingWindowVisible: form.floatingWindowVisible,
                floatingWindowHeight: form.floatingWindowHeight,
              };

              // 直接复用 onSave 逻辑
              (async () => {
                startSaving();
                try {
                  const res = await updateMe(payload);
                  // 更新本地存储和表单状态
                  if (res) {
                    storage.setUser(res);
                    setForm(userToFormData(res));
                    // 触发自定义事件，通知其他组件（如顶部语言选择器）
                    window.dispatchEvent(new CustomEvent('user-settings-updated', { detail: res }));
                    // 通知托盘菜单刷新数据（如果在 Electron 环境中）
                    (window as any).electronAPI?.notifySettingsChanged?.();
                  }
                  message.success('设置已保存');
                } catch {
                  
                } finally {
                  await endSaving();
                }
              })();
            }}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white shadow-sm"
          >
            {saving ? '保存中…' : '保存设置'}
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
            placeholder="原密码（至少 6 位）"
            type={showOld ? 'text' : 'password'}
            disabled={!editing}
            className={`w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 pr-10 py-2 text-slate-900 dark:text-slate-100 ${!editing ? 'bg-slate-50 dark:bg-slate-700' : 'bg-white dark:bg-slate-700'}`}
            value={oldPwd}
            onChange={(e) => setOldPwd(e.target.value)}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            onClick={() => setShowOld((v) => !v)}
          >
            {showOld ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
          </button>
          {editing && oldPwd.length > 0 && oldPwd.length < 6 && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">原密码长度至少 6 位</p>
          )}
        </div>
        <div className="relative">
          <input
            placeholder="新密码（至少 6 位）"
            type={showNew ? 'text' : 'password'}
            disabled={!editing}
            className={`w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 pr-10 py-2 text-slate-900 dark:text-slate-100 ${!editing ? 'bg-slate-50 dark:bg-slate-700' : 'bg-white dark:bg-slate-700'}`}
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            onClick={() => setShowNew((v) => !v)}
          >
            {showNew ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
          </button>
          {editing && newPwd.length > 0 && newPwd.length < 6 && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">新密码长度至少 6 位</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-sm"
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
          <span className="text-xs text-slate-600 dark:text-slate-400">
            不少于 6 位。保存密码后，再点击页面底部"保存"应用其他设置
          </span>
        )}
      </div>
    </div>
  );
}
