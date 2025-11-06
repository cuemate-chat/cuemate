import { Button, Input, Modal, Table } from 'antd';
import dayjs from 'dayjs';
import React, { useState } from 'react';
import { createTag, deleteTag, updateTag } from '../../api/questions';
import DrawerProvider, { DrawerContent, DrawerFooter, DrawerHeader } from '../../components/DrawerProvider';
import { message as globalMessage } from '../../components/Message';
import PaginationBar from '../../components/PaginationBar';

interface TagManagerDrawerProps {
  open: boolean;
  onClose: () => void;
  tags: Array<{ id: string; name: string; created_at?: number }>;
  onRefreshTags: () => Promise<void>;
}

const TagManagerDrawer: React.FC<TagManagerDrawerProps> = ({
  open,
  onClose,
  tags,
  onRefreshTags,
}) => {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [newTagName, setNewTagName] = useState('');
  const [loading, setLoading] = useState(false);

  const filtered = tags
    .filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

  // 分页处理
  const total = filtered.length;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filtered.slice(startIndex, endIndex);

  // 分页处理函数
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (current: number, size: number) => {
    void current;
    setPageSize(size);
    setCurrentPage(1);
  };

  const columns: any[] = [
    {
      title: '#',
      dataIndex: 'index',
      width: 100,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <span className="text-slate-500">{startIndex + index + 1}</span>
      ),
    },
    {
      title: '标签名',
      dataIndex: 'name',
      width: 200,
      render: (_: any, record: any) =>
        editingKey === record.id ? (
          <Input
            value={editingName}
            maxLength={20}
            onChange={(e) => setEditingName(e.target.value)}
          />
        ) : (
          <span>{record.name}</span>
        ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 220,
      render: (v: number) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      dataIndex: 'action',
      width: 180,
      render: (_: any, record: any) => (
        <div className="space-x-2">
          {editingKey === record.id ? (
            <>
              <Button
                size="small"
                type="primary"
                onClick={async () => {
                  const v = editingName.trim();
                  if (!v) return;
                  if (v.length > 20) {
                    globalMessage.warning('标签名称最多 20 个字');
                    return;
                  }
                  setLoading(true);
                  try {
                    await updateTag(record.id, v);
                    setEditingKey(null);
                    setEditingName('');
                    await onRefreshTags();
                  } catch (e: any) {
                    globalMessage.error(e?.message || '更新失败');
                  } finally {
                    setLoading(false);
                  }
                }}
                loading={loading}
              >
                保存
              </Button>
              <Button
                size="small"
                onClick={() => {
                  setEditingKey(null);
                  setEditingName('');
                }}
              >
                取消
              </Button>
            </>
          ) : (
            <>
              <Button
                size="small"
                onClick={() => {
                  setEditingKey(record.id);
                  setEditingName(record.name);
                }}
              >
                编辑
              </Button>
              <Button
                size="small"
                danger
                onClick={async () => {
                  Modal.confirm({
                    title: '确认删除',
                    content: `确定要删除标签"${record.name}"吗？删除后，使用该标签的题目将不再关联此标签。`,
                    okText: '确定',
                    cancelText: '取消',
                    onOk: async () => {
                      setLoading(true);
                      try {
                        await deleteTag(record.id);
                        await onRefreshTags();
                        globalMessage.success('删除成功');
                      } catch (e: any) {
                        if (e?.message?.includes('FOREIGN KEY constraint failed')) {
                          globalMessage.error('无法删除：该标签正在被题目使用，请先移除相关题目的标签关联');
                        } else {
                          globalMessage.error(e?.message || '删除失败');
                        }
                      } finally {
                        setLoading(false);
                      }
                    }
                  });
                }}
                loading={loading}
              >
                删除
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const handleCreateTag = async () => {
    const v = newTagName.trim();
    if (!v) return;
    if (v.length > 20) {
      globalMessage.warning('标签名称最多 20 个字');
      return;
    }
    setLoading(true);
    try {
      await createTag(v);
      setNewTagName('');
      await onRefreshTags();
    } catch (e: any) {
      globalMessage.error(e?.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DrawerProvider
      open={open}
      onClose={onClose}
      width="70%"
    >
      <DrawerHeader>标签管理</DrawerHeader>
      <DrawerContent>
        <div className="space-y-4">
          <div className="flex gap-2 items-end">
            <div>
              <div className="text-sm mb-1 dark:text-slate-200">标签名称<span className="text-red-500 dark:text-red-400"> *</span></div>
              <Input
                placeholder="新建标签名称（不超过 20 个字）"
                value={newTagName}
                maxLength={20}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v.length <= 20) setNewTagName(v);
                }}
                style={{ width: 240 }}
              />
            </div>
            <Button
              type="primary"
              onClick={handleCreateTag}
              loading={loading}
            >
              新增
            </Button>
          </div>
          
          {/* 表格，支持编辑/删除与序号显示 */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <div className="p-2 dark:bg-slate-800">
              <Input
                placeholder="搜索标签名（模糊匹配）"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
                style={{ width: 260 }}
              />
            </div>
            <Table
              size="small"
              columns={columns}
              dataSource={paginatedData}
              rowKey="id"
              scroll={{ y: pageSize <= 10 ? undefined : 'calc(70vh - 200px)' }}
              pagination={false}
            />
          </div>
          
          {/* 分页组件 */}
          {total > 0 && (
            <div className="flex justify-center mt-4">
              <PaginationBar
                page={currentPage}
                pageSize={pageSize}
                total={total}
                onChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                showSizeChanger={true}
                pageSizeOptions={['10', '20', '50']}
              />
            </div>
          )}
        </div>
      </DrawerContent>
      <DrawerFooter>
        <div className="flex justify-end">
          <Button onClick={onClose}>关闭</Button>
        </div>
      </DrawerFooter>
    </DrawerProvider>
  );
};

export default TagManagerDrawer;
