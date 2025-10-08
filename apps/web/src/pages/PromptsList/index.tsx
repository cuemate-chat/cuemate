import { ArrowPathIcon, PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Select, Table } from 'antd';
import { useEffect, useState } from 'react';
import {
  createPrompt,
  getPrompt,
  listPrompts,
  Prompt,
  updatePrompt,
} from '../../api/prompts';
import { message } from '../../components/Message';
import PaginationBar from '../../components/PaginationBar';
import CreatePromptDrawer from './CreatePromptDrawer';
import EditPromptDrawer from './EditPromptDrawer';
import RestorePromptDrawer from './RestorePromptDrawer';

export default function PromptsList() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Prompt[]>([]);
  const [sourceFilter, setSourceFilter] = useState<'desktop' | 'web' | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // 编辑抽屉状态
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<Prompt | null>(null);

  // 新增抽屉状态
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);

  // 恢复抽屉状态
  const [restoreDrawerOpen, setRestoreDrawerOpen] = useState(false);
  const [restorePrompt, setRestorePrompt] = useState<Prompt | null>(null);

  const columns = [
    {
      title: '序号',
      key: 'index',
      width: '8%',
      render: (_value: any, _record: any, index: number) => (
        <div className="text-center">{(page - 1) * pageSize + index + 1}</div>
      ),
    },
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: '15%',
      render: (id: string) => (
        <span className="font-mono text-sm text-blue-600">{id}</span>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: '15%',
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: '10%',
      render: (source: string) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            source === 'desktop'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {source === 'desktop' ? 'Desktop' : 'Web'}
        </span>
      ),
    },
    {
      title: '变量',
      dataIndex: 'variables',
      key: 'variables',
      width: '30%',
      render: (variables: string) => {
        try {
          const vars = JSON.parse(variables || '[]');
          return (
            <div className="flex flex-wrap gap-1">
              {vars.map((v: string, i: number) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono"
                >
                  {v}
                </span>
              ))}
            </div>
          );
        } catch {
          return <span className="text-slate-400">-</span>;
        }
      },
    },
    {
      title: '操作',
      key: 'action',
      width: '22%',
      render: (record: Prompt) => (
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors"
            onClick={() => handleEdit(record.id)}
          >
            <PencilIcon className="w-4 h-4" /> 编辑
          </button>
          <button
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 hover:border-amber-300 transition-colors"
            onClick={() => handleRestore(record)}
          >
            <ArrowPathIcon className="w-4 h-4" /> 恢复
          </button>
          <button
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-400 bg-slate-50 border border-slate-200 rounded-md cursor-not-allowed"
            disabled
          >
            <TrashIcon className="w-4 h-4" /> 删除
          </button>
        </div>
      ),
    },
  ];

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const res = await listPrompts({
        source: sourceFilter || undefined,
      });
      const allItems = res.list || [];
      setTotal(allItems.length);
      // 客户端分页
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      setItems(allItems.slice(start, end));
    } catch (err: any) {
      message.error(err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrompts();
  }, [sourceFilter, page, pageSize]);

  const handleEdit = async (id: string) => {
    try {
      const res = await getPrompt(id);
      setCurrentPrompt(res.prompt);
      setEditDrawerOpen(true);
    } catch (err: any) {
      message.error(err?.message || '获取 Prompt 详情失败');
    }
  };

  const handleSave = async (id: string, content: string, extra?: string) => {
    try {
      await updatePrompt(id, { content, extra });
      message.success('Prompt 更新成功');
      setEditDrawerOpen(false);
      setCurrentPrompt(null);
      loadPrompts();
    } catch (err: any) {
      message.error(err?.message || '更新失败');
    }
  };

  const handleCreate = async (data: {
    id: string;
    content: string;
    description: string;
    source: 'desktop' | 'web';
  }) => {
    try {
      await createPrompt(data);
      message.success('Prompt 创建成功');
      setCreateDrawerOpen(false);
      setPage(1);
      loadPrompts();
    } catch (err: any) {
      message.error(err?.message || '创建失败');
    }
  };

  const handleRestore = async (prompt: Prompt) => {
    try {
      const res = await getPrompt(prompt.id);
      setRestorePrompt(res.prompt);
      setRestoreDrawerOpen(true);
    } catch (err: any) {
      message.error(err?.message || '获取 Prompt 详情失败');
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Prompt 管理</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCreateDrawerOpen(true)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 hover:border-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlusIcon className="w-4 h-4" />
            新增
          </button>
          <button
            onClick={loadPrompts}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-end mb-4">
        <div className="flex flex-col">
          <label className="block text-xs text-slate-500 mb-1">来源</label>
          <Select
            value={sourceFilter || undefined}
            onChange={(v) => {
              setSourceFilter((v || '') as any);
              setPage(1);
            }}
            allowClear
            placeholder="全部"
            style={{ width: 260, height: 36 }}
            options={[
              { label: '全部', value: '' },
              { label: 'Desktop', value: 'desktop' },
              { label: 'Web', value: 'web' },
            ]}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <Table
          columns={columns}
          dataSource={items}
          rowKey="id"
          pagination={false}
          scroll={{ x: 1200 }}
          size="middle"
          loading={loading}
        />
      </div>

      <div className="flex justify-between items-center mt-3 text-sm">
        <div className="text-slate-500">共 {total} 条</div>
        <PaginationBar
          page={page}
          pageSize={pageSize}
          total={total}
          onChange={(p: number) => setPage(p)}
          onPageSizeChange={(_: number, size: number) => {
            setPageSize(size);
            setPage(1);
          }}
          showSizeChanger={true}
          pageSizeOptions={['10', '20', '50', '100']}
        />
      </div>

      {/* 编辑 Prompt 抽屉 */}
      <EditPromptDrawer
        open={editDrawerOpen}
        prompt={currentPrompt}
        onClose={() => {
          setEditDrawerOpen(false);
          setCurrentPrompt(null);
        }}
        onSave={handleSave}
      />

      {/* 新增 Prompt 抽屉 */}
      <CreatePromptDrawer
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        onCreate={handleCreate}
      />

      {/* 恢复 Prompt 抽屉 */}
      <RestorePromptDrawer
        open={restoreDrawerOpen}
        prompt={restorePrompt}
        onClose={() => {
          setRestoreDrawerOpen(false);
          setRestorePrompt(null);
        }}
        onRestore={() => {
          setRestoreDrawerOpen(false);
          setRestorePrompt(null);
          loadPrompts();
        }}
      />
    </div>
  );
}
