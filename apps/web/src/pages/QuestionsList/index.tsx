import { Button, Card, DatePicker, Input, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listJobs } from '../../api/jobs';
import {
  deleteAllQuestionsByJob,
  deleteInterviewQuestion,
  listInterviewQuestions,
  listTags,
} from '../../api/questions';
import CollapsibleSidebar from '../../components/CollapsibleSidebar';
import { DocumentIcon, SearchIcon, WarningIcon } from '../../components/Icons';
import { message as globalMessage } from '../../components/Message';
import PageLoading from '../../components/PageLoading';
import PaginationBar from '../../components/PaginationBar';
import { useLoading } from '../../hooks/useLoading';
import CreateQuestionDrawer from './CreateQuestionDrawer';
import QuestionDetailDrawer from './QuestionDetailDrawer';
import SyncVectorDrawer from './SyncVectorDrawer';
import TagManagerDrawer from './TagManagerDrawer';

export default function QuestionsList() {
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState<Array<{ id: string; title: string; question_count?: number }>>([]);
  const [jobId, setJobId] = useState<string | undefined>(undefined);
  const { loading, withLoading } = useLoading();
  const { loading: operationLoading, start: startOperation, end: endOperation } = useLoading();
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 自适应文本域行数
  const [adaptiveTextareaRows, setAdaptiveTextareaRows] = useState<number>(12);

  // 根据屏幕高度自适应计算文本域行数
  useEffect(() => {
    const calculateTextareaRows = () => {
      const viewportHeight = window.innerHeight;
      if (viewportHeight >= 1080) {
        // 大屏幕：1080p 及以上
        setAdaptiveTextareaRows(16);
      } else if (viewportHeight >= 900) {
        // 中大屏幕：900-1080px
        setAdaptiveTextareaRows(14);
      } else if (viewportHeight >= 768) {
        // 中屏幕：768-900px
        setAdaptiveTextareaRows(12);
      } else {
        // 小屏幕：768px 以下
        setAdaptiveTextareaRows(10);
      }
    };

    calculateTextareaRows();
    window.addEventListener('resize', calculateTextareaRows);
    return () => window.removeEventListener('resize', calculateTextareaRows);
  }, []);

  // 侧拉弹框状态
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [current, setCurrent] = useState<any | null>(null);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [tagMgrDrawerOpen, setTagMgrDrawerOpen] = useState(false);
  const [syncDrawerOpen, setSyncDrawerOpen] = useState(false);

  // 筛选条件
  const [filterDay, setFilterDay] = useState<string | undefined>(undefined);
  const [filterTitle, setFilterTitle] = useState('');
  const [filterDesc, setFilterDesc] = useState('');
  const [filterTagId, setFilterTagId] = useState<string | undefined>(undefined);
  // 已应用到查询的条件（点击"筛选"后更新）
  const [appliedDay, setAppliedDay] = useState<string | undefined>(undefined);
  const [appliedTitle, setAppliedTitle] = useState<string | undefined>(undefined);
  const [appliedDesc, setAppliedDesc] = useState<string | undefined>(undefined);
  const [appliedTagId, setAppliedTagId] = useState<string | undefined>(undefined);
  const requestIdRef = useRef(0);

  // 同步向量库弹窗与统计
  const [syncStats, setSyncStats] = useState<{
    total: number;
    synced: number;
    unsynced: number;
  } | null>(null);

  // 下拉搜索：按 label 文本模糊匹配（忽略大小写）
  const selectFilterOption = (input: string, option?: any) => {
    const label: string = (option?.label ?? option?.children ?? '').toString();
    return label.toLowerCase().includes(input.toLowerCase());
  };

  const applyFilters = () => {
    setAppliedDay(filterDay);
    setAppliedTitle(filterTitle.trim() || undefined);
    setAppliedDesc(filterDesc.trim() || undefined);
    setAppliedTagId(filterTagId);
    setPage(1);
  };

  // 刷新岗位列表
  const refreshJobs = async () => {
    const data = await listJobs();
    const js = (data.items || []).map((j: any) => ({ 
      id: j.id, 
      title: j.title,
      question_count: j.question_count || 0
    }));
    setJobs(js);
    return js;
  };

  useEffect(() => {
    (async () => {
      const js = await refreshJobs();
      if (js.length) {
        // 优先选中 URL 参数中指定的 jobId
        const urlJobId = searchParams.get('jobId');
        const targetJob = urlJobId
          ? js.find(j => j.id === urlJobId)
          : js[0];

        setJobId((targetJob || js[0]).id);
      }
    })();
  }, [searchParams]);

  // 删除岗位的所有押题数据
  const handleDeleteAllQuestions = async () => {
    if (!jobId) return;
    
    const currentJob = jobs.find(j => j.id === jobId);
    if (!currentJob) return;

    Modal.confirm({
      title: '确认删除全部押题',
      content: (
        <div className="space-y-3">
          <div className="text-red-600 dark:text-red-400 font-medium">
            此操作将永久删除该岗位的所有押题数据，且无法恢复！
          </div>
          <div className="space-y-2 text-sm text-gray-700 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs"><DocumentIcon className="w-3 h-3" /></span>
              <span>岗位：<strong>{currentJob.title}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs"><DocumentIcon className="w-3 h-3" /></span>
              <span>押题数量：<strong>{currentJob.question_count || 0}</strong> 条</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs"><DocumentIcon className="w-3 h-3" /></span>
              <span>数据库中的押题记录</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs"><SearchIcon className="w-3 h-3" /></span>
              <span>向量库中的对应数据</span>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
            <div className="font-medium mb-1"><WarningIcon className="w-4 h-4 inline mr-1" />重要提醒：</div>
            <div>删除后，该岗位的所有押题数据将被永久清除，包括数据库和向量库中的相关数据！</div>
          </div>
        </div>
      ),
      okText: '确认删除全部',
      okType: 'danger',
      cancelText: '取消',
      width: 500,
      onOk: async () => {
        startOperation();
        try {
          const result = await deleteAllQuestionsByJob(jobId);
          globalMessage.success(result.message);
          await reloadList();
          await refreshJobs(); // 刷新岗位列表中的数量
        } catch (e: any) {
          globalMessage.error(e?.message || '删除失败');
        } finally {
          await endOperation();
        }
      },
    });
  };

  const reloadList = async (targetPage?: number) => {
    const reqId = ++requestIdRef.current;
    if (!jobId) return;

    await withLoading(async () => {
      const curPage = targetPage ?? page;
      const data = await listInterviewQuestions(jobId, curPage, pageSize, {
        day: appliedDay,
        title: appliedTitle,
        description: appliedDesc,
        tagId: appliedTagId,
      });
      const totalCount = data.total || 0;
      const lastPage = Math.max(1, Math.ceil(totalCount / pageSize));
      if (curPage > lastPage) {
        const newPage = lastPage;
        const data2 = await listInterviewQuestions(jobId, newPage, pageSize, {
          day: appliedDay,
          title: appliedTitle,
          description: appliedDesc,
          tagId: appliedTagId,
        });
        if (requestIdRef.current === reqId) {
          setItems(data2.items || []);
          setTotal(data2.total || 0);
          setPage(newPage);
        }
        return;
      }
      if (requestIdRef.current === reqId) {
        setItems(data.items || []);
        setTotal(totalCount);
      }
    });
  };

  useEffect(() => {
    reloadList();
  }, [jobId, page, pageSize, appliedDay, appliedTitle, appliedDesc, appliedTagId]);

  // 标签列表（用于筛选与管理）
  const [tags, setTags] = useState<Array<{ id: string; name: string }>>([]);
  useEffect(() => {
    (async () => {
      const res = await listTags();
      setTags(res.items || []);
    })();
  }, []);

  const openDetailDrawer = (it: any) => {
    setCurrent(it);
    setDetailDrawerOpen(true);
  };

  const handleSyncVector = async () => {
    if (!jobId) return;
    setSyncDrawerOpen(true);
    setSyncStats(null);
    const { getIQSyncStats } = await import('../../api/questions');
    const stats = await getIQSyncStats(jobId);
    setSyncStats(stats);
  };

  // 删除操作时显示全屏 loading
  if (operationLoading) {
    return <PageLoading tip="正在删除，请稍候..." type="saving" />;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* 左侧岗位 */}
      <CollapsibleSidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        title={
          <div className="flex items-center justify-between w-full">
            <span>岗位列表</span>
            {jobId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteAllQuestions();
                }}
                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                title="删除当前岗位的所有押题"
              >
                删除全部押题
              </button>
            )}
          </div>
        }
        className="h-[calc(100vh-175px)]"
      >
        <div className="p-4 space-y-2 overflow-y-auto h-full">
          {jobs.map((it, idx) => (
            <button
              key={it.id}
              onClick={() => {
                setJobId(it.id);
                setPage(1);
              }}
              title="点击查看面试押题"
              className={`relative w-full text-left pl-10 pr-12 py-3 rounded-lg border transition-all duration-200 group ${
                jobId === it.id 
                  ? 'border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm' 
                  : 'border-slate-200 hover:border-blue-300 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50'
              }`}
            >
              <div className={`absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 ${
                jobId === it.id 
                  ? 'bg-blue-500 text-white shadow-lg' 
                  : 'bg-slate-200 text-slate-600 group-hover:bg-blue-400 group-hover:text-white'
              }`}>
                {idx + 1}
              </div>
              <div className={`font-medium transition-colors duration-200 ${
                jobId === it.id ? 'text-blue-700' : 'text-slate-800 group-hover:text-blue-700'
              }`}>
                {it.title}
              </div>
              {/* 押题数量标识 */}
              <div className={`absolute right-3 top-1/2 -translate-y-1/2 min-w-[20px] h-5 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 ${
                (it.question_count || 0) > 0
                  ? jobId === it.id 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-orange-400 text-white group-hover:bg-orange-500'
                  : jobId === it.id
                    ? 'bg-slate-300 text-slate-600'
                    : 'bg-slate-200 text-slate-500 group-hover:bg-slate-300'
              }`}>
                {it.question_count || 0}
              </div>
            </button>
          ))}
          {!jobs.length && (
            <div className="text-center py-8 text-slate-500">
              <div className="text-2xl mb-2">📋</div>
              <div className="text-sm">暂无岗位</div>
              <div className="text-xs text-slate-400 mt-1">请先创建岗位</div>
            </div>
          )}
        </div>
      </CollapsibleSidebar>

      {/* 右侧押题卡片 */}
      <div className="flex-1 min-w-0">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm md:h-[calc(100vh-175px)] min-h-0 overflow-y-auto">
          <div className="mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <DatePicker
                placeholder="按日期过滤"
                value={filterDay ? (dayjs as any)(filterDay) : undefined}
                onChange={(d) => {
                  const v = d ? d.format('YYYY-MM-DD') : undefined;
                  setFilterDay(v);
                  setAppliedDay(v);
                  setPage(1);
                }}
                style={{ width: 160 }}
              />
              <Input
                placeholder="按名称"
                value={filterTitle}
                onChange={(e) => {
                  const v = e.target.value;
                  setFilterTitle(v);
                  setAppliedTitle(v.trim() || undefined);
                  setPage(1);
                }}
                onPressEnter={applyFilters}
                allowClear
                style={{ width: 160 }}
              />
              <Input
                placeholder="按描述"
                value={filterDesc}
                onChange={(e) => {
                  const v = e.target.value;
                  setFilterDesc(v);
                  setAppliedDesc(v.trim() || undefined);
                  setPage(1);
                }}
                onPressEnter={applyFilters}
                allowClear
                style={{ width: 160 }}
              />
              <Select
                placeholder="按标签"
                allowClear
                value={filterTagId}
                onChange={(v) => {
                  setFilterTagId(v);
                  setAppliedTagId(v);
                  setPage(1);
                }}
                options={tags.map((t) => ({ value: t.id, label: t.name }))}
                style={{ width: 160 }}
                showSearch
                filterOption={selectFilterOption}
              />
              <Button onClick={() => setTagMgrDrawerOpen(true)}>管理标签</Button>
              <Button onClick={handleSyncVector}>
                同步数据到向量库
              </Button>

              <Button
                type="primary"
                disabled={!jobId}
                onClick={() => setCreateDrawerOpen(true)}
              >
                新建押题
              </Button>
            </div>
          </div>
          {loading ? (
            <PageLoading tip="正在加载押题列表..." />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((it, idx) => (
                  <Card key={it.id} className="relative h-full dark:bg-slate-800 dark:border-slate-700">
                    <div className="pointer-events-none absolute left-0 top-0">
                      <div className="bg-blue-600 text-white text-[10px] font-semibold px-2 py-1 rounded-br">
                        {(page - 1) * pageSize + idx + 1}
                      </div>
                      <div className="w-0 h-0 border-t-8 border-t-blue-700 border-r-8 border-r-transparent"></div>
                    </div>
                    {/* 标题 + 标签（右上角对齐，但不遮挡内容） */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-base font-semibold text-slate-800 dark:text-slate-100 break-words line-clamp-2 min-h-[3.25rem] pr-2">
                        {it.title}
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        {it.tag && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full shadow-sm">
                            {it.tag}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] ${it.vector_status ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}
                        >
                          {it.vector_status ? '已同步' : '未同步'}
                        </span>
                      </div>
                    </div>
                    {/* 分割线 */}
                    <div className="my-2 border-t border-slate-200"></div>
                    <div
                      className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-4 break-words leading-5 min-h-[5rem]"
                      title={it.description}
                    >
                      {it.description}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                      <span className="flex-1 mr-2 truncate">{dayjs(it.created_at).format('YYYY-MM-DD HH:mm')}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openDetailDrawer(it)}
                          className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                          title="编辑"
                        >
                          <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            Modal.confirm({
                              title: '确认删除押题',
                              content: `确定要删除押题"${it.title}"吗？此操作无法撤销。`,
                              okText: '确定删除',
                              cancelText: '取消',
                              okType: 'danger',
                              onOk: async () => {
                                startOperation();
                                try {
                                  await deleteInterviewQuestion(it.id);
                                  globalMessage.success('成功删除该条押题数据！');
                                  await reloadList();
                                  await refreshJobs(); // 刷新岗位列表
                                } catch (error: any) {
                                  globalMessage.error(error?.message || '删除失败');
                                } finally {
                                  await endOperation();
                                }
                              }
                            });
                          }}
                          className="w-6 h-6 flex items-center justify-center rounded bg-red-100 dark:bg-slate-700 hover:bg-red-200 dark:hover:bg-slate-600 transition-colors"
                          title="删除"
                        >
                          <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
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
            </>
          )}
        </div>
      </div>

      {/* 侧拉弹框组件 */}
      <QuestionDetailDrawer
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        current={current}
        tags={tags}
        adaptiveTextareaRows={adaptiveTextareaRows}
        onRefresh={reloadList}
        onRefreshJobs={refreshJobs}
      />

      <CreateQuestionDrawer
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        jobId={jobId}
        tags={tags}
        adaptiveTextareaRows={adaptiveTextareaRows}
        onRefresh={reloadList}
        onRefreshJobs={refreshJobs}
      />

      <TagManagerDrawer
        open={tagMgrDrawerOpen}
        onClose={() => setTagMgrDrawerOpen(false)}
        tags={tags}
        onRefreshTags={async () => {
          const res = await listTags();
          setTags(res.items || []);
        }}
      />

      <SyncVectorDrawer
        open={syncDrawerOpen}
        onClose={() => setSyncDrawerOpen(false)}
        jobId={jobId}
        syncStats={syncStats}
        onRefresh={reloadList}
      />
    </div>
  );
}
