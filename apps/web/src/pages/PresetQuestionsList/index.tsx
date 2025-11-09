import { CheckIcon, CloudArrowUpIcon, TrashIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { Button, Card, Checkbox, DatePicker, Input, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import {
  batchDeletePresetQuestions,
  deletePresetQuestion,
  getJobsForSync,
  listPresetQuestions,
  PresetQuestion,
} from '../../api/preset-questions';
import { listTags } from '../../api/questions';
import LicenseGuard from '../../components/LicenseGuard';
import { message as globalMessage } from '../../components/Message';
import PageLoading from '../../components/PageLoading';
import PaginationBar from '../../components/PaginationBar';
import { useLoading } from '../../hooks/useLoading';
import TagManagerDrawer from '../QuestionsList/TagManagerDrawer';
import BatchImportDrawer from './BatchImportDrawer';
import BatchSyncDrawer from './BatchSyncDrawer';
import CreatePresetQuestionDrawer from './CreatePresetQuestionDrawer';
import EditPresetQuestionDrawer from './EditPresetQuestionDrawer';
import SyncJobsDetailDrawer from './SyncJobsDetailDrawer';

export default function PresetQuestionsList() {
  const { loading, start: startLoading, end: endLoading } = useLoading();
  const { loading: operationLoading, start: startOperation, end: endOperation } = useLoading();
  const [items, setItems] = useState<PresetQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8); // 每页 8 个卡片，可调整

  // 筛选条件
  const [filterTagId, setFilterTagId] = useState<string | undefined>(undefined);
  const [filterBuiltin, setFilterBuiltin] = useState<boolean | undefined>(undefined);
  const [filterDay, setFilterDay] = useState<string | undefined>(undefined);
  const [filterQuestion, setFilterQuestion] = useState('');
  const [filterAnswer, setFilterAnswer] = useState('');

  // 多选功能
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // 侧拉弹框状态
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [tagManagerDrawerOpen, setTagManagerDrawerOpen] = useState(false);
  const [batchSyncDrawerOpen, setBatchSyncDrawerOpen] = useState(false);
  const [batchImportDrawerOpen, setBatchImportDrawerOpen] = useState(false);
  const [syncJobsDetailDrawerOpen, setSyncJobsDetailDrawerOpen] = useState(false);

  // 当前编辑的题目
  const [currentEditItem, setCurrentEditItem] = useState<PresetQuestion | null>(null);

  // 岗位数据
  const [jobs, setJobs] = useState<Array<{ id: string; title: string }>>([]);

  // 同步岗位详情
  const [currentSyncJobs, setCurrentSyncJobs] = useState<Array<{ id: string; title: string }>>([]);
  const [currentQuestionTitle, setCurrentQuestionTitle] = useState('');

  // 标签数据
  const [tags, setTags] = useState<Array<{ id: string; name: string }>>([]);

  const requestIdRef = useRef(0);

  // 下拉搜索：按 label 文本模糊匹配（忽略大小写）
  const selectFilterOption = (input: string, option?: any) => {
    const label: string = (option?.label ?? option?.children ?? '').toString();
    return label.toLowerCase().includes(input.toLowerCase());
  };

  // 加载数据
  const reloadList = async (targetPage?: number) => {
    const reqId = ++requestIdRef.current;
    startLoading();
    try {
      const curPage = targetPage ?? page;
      const data = await listPresetQuestions({
        page: curPage,
        pageSize,
        tag_id: filterTagId,
        is_builtin: filterBuiltin,
        day: filterDay,
        question: filterQuestion.trim() || undefined,
        answer: filterAnswer.trim() || undefined,
      });

      if (requestIdRef.current === reqId) {
        setItems(data.items || []);
        setTotal(data.total || 0);
        setSelectedIds([]);
        setSelectAll(false);
      }
    } catch (e: any) {
      globalMessage.error(e?.message || '加载失败');
    } finally {
      await endLoading();
    }
  };

  // 获取岗位列表
  const fetchJobs = async () => {
    try {
      const res = await getJobsForSync();
      setJobs(res.items || []);
    } catch (error) {
      console.error('获取岗位列表失败:', error);
      globalMessage.error('获取岗位列表失败');
    }
  };

  // 初始化
  useEffect(() => {
    listTags().then((res) => setTags(res.items || []));
    fetchJobs();
  }, []);

  useEffect(() => {
    reloadList();
  }, [page, pageSize, filterTagId, filterBuiltin, filterDay, filterQuestion, filterAnswer]);

  // 多选处理
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedIds(items.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((sid) => sid !== id));
      setSelectAll(false);
    }
  };

  // 编辑题目
  const openEditDrawer = (item: PresetQuestion) => {
    setCurrentEditItem(item);
    setEditDrawerOpen(true);
  };

  // 删除单个题目
  const onDeleteItem = async (item: PresetQuestion) => {
    const tagName = item.tag_id ? tags.find(t => t.id === item.tag_id)?.name : undefined;
    Modal.confirm({
      title: '确认删除题目',
      content: (
        <div>
          <p>确定要删除以下题目吗？删除后无法恢复。</p>
          <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <div className="space-y-1">
              <div><span className="font-medium">题目：</span>{item.question}</div>
              {tagName && (
                <div>
                  <span className="font-medium">标签：</span>
                  <span className="ml-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs">
                    {tagName}
                  </span>
                </div>
              )}
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
          await deletePresetQuestion(item.id);
          globalMessage.success('删除成功');
          await reloadList();
        } catch (e: any) {
          globalMessage.error(e?.message || '删除失败');
        } finally {
          await endOperation();
        }
      }
    });
  };

  // 批量删除
  const onBatchDelete = async () => {
    if (selectedIds.length === 0) {
      globalMessage.warning('请先选择要删除的题目');
      return;
    }

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedIds.length} 个题目吗？此操作不可恢复。`,
      onOk: async () => {
        startOperation();
        try {
          await batchDeletePresetQuestions(selectedIds);
          globalMessage.success('批量删除成功');
          await reloadList();
        } catch (e: any) {
          globalMessage.error(e?.message || '批量删除失败');
        } finally {
          await endOperation();
        }
      },
    });
  };

  // 显示同步岗位详情
  const showSyncJobsDetail = (syncJobIds: string[], questionTitle: string) => {
    // 根据岗位 ID 获取岗位信息（暂时使用 ID 作为标题）
    const syncJobs = syncJobIds.map(id => ({
      id,
      title: `岗位 ${id}`
    }));
    setCurrentSyncJobs(syncJobs);
    setCurrentQuestionTitle(questionTitle);
    setSyncJobsDetailDrawerOpen(true);
  };

  // 删除操作时显示全屏 loading
  if (operationLoading) {
    return <PageLoading tip="正在删除，请稍候..." type="saving" />;
  }

  return (
    <LicenseGuard
      feature="preset_questions"
      fallback={
        <div className="space-y-6 p-6">
          {/* 页面标题 */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">预置题库</h1>
          </div>
          {/* 授权提示卡片 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm min-h-[500px] flex items-center justify-center">
            <div className="text-center p-8">
              <LockClosedIcon className="w-24 h-24 mx-auto mb-4 text-slate-400" />
              <h3 className="text-xl font-medium text-slate-900 dark:text-slate-100 mb-2">需要有效授权</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                此功能需要有效的 License 授权才能使用
              </p>
              <a
                href="/settings/license"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                前往授权管理
              </a>
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-6 p-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">预置题库</h1>
        </div>

        {/* 主要内容卡片 */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          {/* 顶部操作栏 */}
          <div className="flex items-center justify-end mb-6 gap-2 flex-wrap">
            <DatePicker
              placeholder="按日期过滤"
              value={filterDay ? dayjs(filterDay) : undefined}
              onChange={(d) => {
                const v = d ? d.format('YYYY-MM-DD') : undefined;
                setFilterDay(v);
                setPage(1);
              }}
              style={{ width: 140 }}
            />
            <Input
              placeholder="按问题搜索"
              value={filterQuestion}
              onChange={(e) => {
                setFilterQuestion(e.target.value);
                setPage(1);
              }}
              allowClear
              style={{ width: 140 }}
              className="dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600 dark:[&_input]:bg-slate-700 dark:[&_input]:text-slate-100 dark:[&_input::placeholder]:text-slate-400"
            />
            <Input
              placeholder="按答案搜索"
              value={filterAnswer}
              onChange={(e) => {
                setFilterAnswer(e.target.value);
                setPage(1);
              }}
              allowClear
              style={{ width: 140 }}
              className="dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600 dark:[&_input]:bg-slate-700 dark:[&_input]:text-slate-100 dark:[&_input::placeholder]:text-slate-400"
            />
            <Select
              placeholder="按标签筛选"
              allowClear
              value={filterTagId}
              onChange={(v) => {
                setFilterTagId(v);
                setPage(1);
              }}
              options={tags.map((t) => ({ value: t.id, label: t.name }))}
              style={{ width: 120 }}
              showSearch
              filterOption={selectFilterOption}
            />
            <Select
              placeholder="按类型筛选"
              allowClear
              value={filterBuiltin}
              onChange={(v) => {
                setFilterBuiltin(v);
                setPage(1);
              }}
              options={[
                { value: true, label: '内置题目' },
                { value: false, label: '自定义题目' },
              ]}
              style={{ width: 120 }}
            />

            <Button onClick={() => setTagManagerDrawerOpen(true)}>管理标签</Button>
            <Button 
              icon={<CloudArrowUpIcon className="w-4 h-4" />}
              onClick={() => setBatchImportDrawerOpen(true)}
            >
              批量导入
            </Button>
            <Button
              type="primary"
              onClick={() => setCreateDrawerOpen(true)}
            >
              新增题目
            </Button>
          </div>

          {/* 批量操作栏 */}
        {(selectedIds.length > 0 || items.length > 0) && (
          <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectAll}
                indeterminate={selectedIds.length > 0 && selectedIds.length < items.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
              >
                全选（当前页）
              </Checkbox>
              {selectedIds.length > 0 && (
                <span className="text-sm text-slate-600 dark:text-slate-400">已选择 {selectedIds.length} 项</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                icon={<CheckIcon className="w-4 h-4" />}
                disabled={selectedIds.length === 0}
                onClick={() => setBatchSyncDrawerOpen(true)}
              >
                批量同步到面试押题
              </Button>
              <Button
                danger
                icon={<TrashIcon className="w-4 h-4" />}
                disabled={selectedIds.length === 0}
                onClick={onBatchDelete}
              >
                批量删除
              </Button>
            </div>
          </div>
        )}

        {/* 卡片列表 */}
        {loading ? (
          <PageLoading tip="正在加载预置题库..." />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((item, idx) => (
                <Card key={item.id} className="relative h-full group hover:shadow-md transition-shadow duration-200 dark:bg-slate-800 dark:border-slate-700">
                  {/* 左上角序号 */}
                  <div className="pointer-events-none absolute left-0 top-0 z-10">
                    <div className="bg-blue-600 text-white text-[10px] font-semibold px-2 py-1 rounded-br">
                      {(page - 1) * pageSize + idx + 1}
                    </div>
                    <div className="w-0 h-0 border-t-8 border-t-blue-700 border-r-8 border-r-transparent"></div>
                  </div>

                  {/* 右上角选择框 */}
                  <div className="absolute right-2 top-2 z-10">
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                    />
                  </div>

                  {/* 内容区域 */}
                  <div className="pt-4 pr-6 pb-2 pl-2">
                    {/* 问题标题 + 标签（右上角对齐，参考面试押题样式） */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="text-base font-semibold text-slate-800 dark:text-slate-100 break-words line-clamp-2 min-h-[3.25rem] pr-2">
                        {item.question}
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        {tags.find(t => t.id === item.tag_id) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full shadow-sm">
                            {tags.find(t => t.id === item.tag_id)?.name}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] ${item.is_builtin ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}
                        >
                          {item.is_builtin ? '内置' : '自定义'}
                        </span>
                      </div>
                    </div>

                    {/* 分割线 */}
                    <div className="my-2 border-t border-slate-200 dark:border-slate-700"></div>

                    {/* 答案预览 */}
                    <div className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-4 break-words leading-5 min-h-[5rem]" title={item.answer}>
                      {item.answer}
                    </div>

                    {/* 同步状态（如果有的话，放在时间上方） */}
                    {item.synced_jobs.length > 0 && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        <button
                          onClick={() => showSyncJobsDetail(item.synced_jobs, item.question)}
                          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors duration-200"
                        >
                          已同步到 {item.synced_jobs.length} 个岗位
                        </button>
                      </div>
                    )}
                    {item.synced_jobs.length == 0 && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        暂未同步到岗位
                      </div>
                    )}

                    {/* 时间和操作按钮 */}
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                      <span>{dayjs(item.created_at).format('YYYY-MM-DD HH:mm')}</span>
                      <div className="space-x-2">
                        <Button size="small" onClick={() => openEditDrawer(item)}>
                          编辑
                        </Button>
                        <Button
                          size="small"
                          danger
                          onClick={async (e) => {
                            e.stopPropagation();
                            onDeleteItem(item);
                          }}
                        >
                          删除
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* 分页 */}
            {total > 0 && (
              <div className="flex justify-end mt-6">
                <PaginationBar
                  page={page}
                  total={total}
                  pageSize={pageSize}
                  onChange={(p) => setPage(p)}
                  onPageSizeChange={(current, size) => {
                    void current;
                    setPageSize(size);
                    setPage(1); // 重置到第一页
                  }}
                  showSizeChanger={true}
                  pageSizeOptions={['8', '16', '24', '32', '50', '100']}
                />
              </div>
            )}

            {items.length === 0 && (
              <div className="py-20 text-center text-slate-500 dark:text-slate-400">
                <div className="text-4xl mb-4">📋</div>
                <div>暂无预置题目</div>
                <Button
                  type="primary"
                  className="mt-4"
                  onClick={() => setCreateDrawerOpen(true)}
                >
                  创建第一个题目
                </Button>
              </div>
            )}
          </>
        )}

        {/* 侧拉弹框组件 */}
        <EditPresetQuestionDrawer
          open={editDrawerOpen}
          onClose={() => setEditDrawerOpen(false)}
          item={currentEditItem}
          tags={tags}
          onSuccess={() => {
            setEditDrawerOpen(false);
            reloadList();
          }}
        />

        <CreatePresetQuestionDrawer
          open={createDrawerOpen}
          onClose={() => setCreateDrawerOpen(false)}
          tags={tags}
          onSuccess={() => {
            setCreateDrawerOpen(false);
            reloadList();
          }}
        />

        <TagManagerDrawer
          open={tagManagerDrawerOpen}
          onClose={() => setTagManagerDrawerOpen(false)}
          tags={tags}
          onRefreshTags={async () => {
            const res = await listTags();
            setTags(res.items || []);
          }}
        />

        <BatchSyncDrawer
          open={batchSyncDrawerOpen}
          onClose={() => setBatchSyncDrawerOpen(false)}
          selectedIds={selectedIds}
          jobs={jobs}
          onSuccess={() => {
            setBatchSyncDrawerOpen(false);
            reloadList();
          }}
        />

        <BatchImportDrawer
          open={batchImportDrawerOpen}
          onClose={() => setBatchImportDrawerOpen(false)}
          onSuccess={() => {
            setBatchImportDrawerOpen(false);
            reloadList();
          }}
        />

        <SyncJobsDetailDrawer
          open={syncJobsDetailDrawerOpen}
          onClose={() => setSyncJobsDetailDrawerOpen(false)}
          syncJobs={currentSyncJobs}
          questionTitle={currentQuestionTitle}
        />
      </div>
    </div>
    </LicenseGuard>
  );
}
