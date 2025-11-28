import { DeleteOutlined, RightOutlined } from '@ant-design/icons';
import { Badge, Button, Empty, Popconfirm, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { deleteInterview, listInterviews } from '../../api/reviews';
import { message as globalMessage } from '../../components/Message';
import PageLoading from '../../components/PageLoading';
import { useLoading } from '../../hooks/useLoading';
import { findProvider } from '../../providers';

export default function Reviews() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const { loading, start: startLoading, end: endLoading } = useLoading();
  const { loading: operationLoading, start: startOperation, end: endOperation } = useLoading();
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [expandedJobContent, setExpandedJobContent] = useState<Set<string>>(new Set());
  const [expandedResumes, setExpandedResumes] = useState<Set<string>>(new Set());
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      startLoading();
      try {
        const pageSize = 50; // 受后端上限约束
        let page = 1;
        let aggregated: any[] = [];
        let totalCount = 0;
        // 逐页拉取直至获取全部（用于单滚动容器展示）
        // 防御性上限，避免极端情况下请求过多
        const maxPages = 100;
        // 首次请求
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const res = await listInterviews(page, pageSize);
          totalCount = res.total || 0;
          aggregated = aggregated.concat(res.items || []);
          if (aggregated.length >= totalCount) break;
          page += 1;
          if (page > maxPages) break;
        }
        setItems(aggregated);
        setTotal(totalCount);
      } finally {
        await endLoading();
      }
    })();
  }, []);

  // 滚动到选中的面试记录
  useEffect(() => {
    const selectedId = searchParams.get('selectedId');
    if (selectedId && items.length > 0 && selectedRef.current) {
      setTimeout(() => {
        selectedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [items, searchParams]);

  // 删除操作时显示全屏 loading
  if (operationLoading) {
    return <PageLoading tip="正在删除面试记录，请稍候..." type="saving" />;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
      <div className="text-sm text-slate-600 dark:text-slate-300 mb-3">
        面试时间轴 <span className="text-slate-400 dark:text-slate-500">（共 {total} 场面试）</span>
      </div>
      {loading ? (
        <PageLoading tip="正在加载面试记录..." />
      ) : (
        <div className="space-y-4">
          {items.length === 0 && (
            <div className="py-10">
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无记录" />
            </div>
          )}
          {items.map((it, idx) => {
            const selectedId = searchParams.get('selectedId');
            const isSelected = it.id === selectedId;
            return (
            <div
              key={it.id}
              className="grid grid-cols-12 gap-4"
              ref={isSelected ? selectedRef : null}
            >
              {/* 左列：时间显示；右边缘作为时间轴，圆点紧贴右侧靠近卡片 */}
              <div className="col-span-12 md:col-span-2 relative pr-10 text-right pt-3">
                <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-600" />
                <div className={`absolute right-4 top-5 w-3 h-3 rounded-full transform translate-x-1/2 ${isSelected ? 'bg-orange-500 ring-4 ring-orange-200 dark:ring-orange-900/50' : 'bg-blue-500 dark:bg-blue-400'}`} />
                <div className="text-[20px] text-slate-500 dark:text-slate-400 leading-4 mt-1">
                  {dayjs(it.started_at).format('YYYY-MM-DD')}
                </div>
                <div className="text-[14px] text-slate-400 dark:text-slate-500 mt-1">
                  {dayjs(it.started_at).format('HH:mm')}
                </div>
              </div>
              {/* 右列：岗位 + 总结 + 建议/弱点 */}
              <div className="col-span-12 md:col-span-10">
                <div className={`border rounded-xl p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 relative ml-4 md:ml-6 transition-all ${isSelected ? 'border-orange-400 dark:border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-lg' : 'dark:border-slate-600 dark:bg-slate-700/30'}`}>
                  <div className="pointer-events-none absolute left-0 top-0">
                    <div className="bg-blue-600 dark:bg-blue-500 text-white text-[10px] font-semibold px-2 py-1 rounded-br">
                      {idx + 1}
                    </div>
                    <div className="w-0 h-0 border-t-8 border-t-blue-700 dark:border-t-blue-600 border-r-8 border-r-transparent"></div>
                  </div>
                  {/* 右上角标签区域 */}
                  <div className="absolute right-3 top-2 flex items-center gap-2">
                    {it.model_name && (
                      <Tag color="purple" className="!m-0 flex items-center gap-1">
                        {(() => {
                          const icon = it.model_provider ? findProvider(it.model_provider)?.icon : null;
                          if (icon) {
                            const src = `data:image/svg+xml;utf8,${encodeURIComponent(icon)}`;
                            return <img src={src} alt="" className="w-4 h-4" />;
                          }
                          return null;
                        })()}
                        {it.model_name}
                      </Tag>
                    )}
                    {it.duration > 0 && (
                      <Tag color="orange" className="!m-0">
                        时长: {Math.floor(it.duration / 60)}分{it.duration % 60}秒
                      </Tag>
                    )}
                    {it.question_count > 0 && (
                      <Tag color="cyan" className="!m-0">
                        题目数: {it.question_count}
                      </Tag>
                    )}
                    {it.interview_type && (
                      <Tag color="geekblue" className="!m-0">
                        {it.interview_type === 'mock' ? '模拟面试' : '面试训练'}
                      </Tag>
                    )}
                    {it.status && (
                      <Tag
                        color={
                          it.status.includes('completed')
                            ? 'green'
                            : it.status.includes('recording')
                              ? 'red'
                              : it.status.includes('paused')
                                ? 'orange'
                                : 'default'
                        }
                        className="!m-0"
                      >
                        {(() => {
                          const statusMap: Record<string, string> = {
                            'idle': '空闲',
                            'mock-interview-recording': '进行中',
                            'mock-interview-paused': '暂停',
                            'mock-interview-completed': '已完成',
                            'mock-interview-playing': '继续进行',
                            'interview-training-recording': '进行中',
                            'interview-training-paused': '暂停',
                            'interview-training-completed': '已完成',
                            'interview-training-playing': '继续进行',
                          };
                          return statusMap[it.status] || it.status;
                        })()}
                      </Tag>
                    )}
                    <Badge count={it.advantages_total || 0} overflowCount={99}>
                      <span className="inline-flex items-center h-6 px-2 text-[11px] text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-full shadow-sm">
                        优缺点
                      </span>
                    </Badge>
                  </div>

                  <div className="pl-4">
                    <div className="text-slate-900 dark:text-slate-100 font-semibold">{it.job_title}</div>
                    {it.job_content && (
                      <div
                        className={`mt-1 text-xs text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 whitespace-pre-line ${expandedJobContent.has(it.id) ? '' : 'line-clamp-3'}`}
                        onClick={() => {
                          const newSet = new Set(expandedJobContent);
                          if (newSet.has(it.id)) {
                            newSet.delete(it.id);
                          } else {
                            newSet.add(it.id);
                          }
                          setExpandedJobContent(newSet);
                        }}
                      >
                        {it.job_content}
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {it.resumes_title && (
                        <Tag color="purple" className="!m-0">
                          简历: {it.resumes_title}
                        </Tag>
                      )}
                    </div>
                    {it.resumes_content && (
                      <div
                        className={`mt-1 text-xs text-slate-400 dark:text-slate-500 italic cursor-pointer hover:text-slate-600 dark:hover:text-slate-400 whitespace-pre-line ${expandedResumes.has(it.id) ? '' : 'line-clamp-3'}`}
                        onClick={() => {
                          const newSet = new Set(expandedResumes);
                          if (newSet.has(it.id)) {
                            newSet.delete(it.id);
                          } else {
                            newSet.add(it.id);
                          }
                          setExpandedResumes(newSet);
                        }}
                      >
                        {it.resumes_content}
                      </div>
                    )}
                    {it.overall_summary && (
                      <div className="mt-2 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line line-clamp-2">
                        {it.overall_summary}
                      </div>
                    )}
                    {it.message && (
                      <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                        {it.message}
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex gap-2 text-sm items-center flex-1 min-w-0">
                        <Tag
                          color="blue"
                          className="!m-0 !px-3 !py-1 font-medium flex-1 min-w-0 overflow-hidden"
                        >
                          <div className="truncate">
                            {it.advantage_content || it.overall_suggestions || '—'}
                          </div>
                        </Tag>
                        <Tag
                          color="red"
                          className="!m-0 !px-3 !py-1 font-medium flex-1 min-w-0 overflow-hidden"
                        >
                          <div className="truncate">
                            {it.disadvantage_content || it.overall_cons || '—'}
                          </div>
                        </Tag>
                      </div>
                      <div className="flex justify-end gap-2 shrink-0">
                        <Tooltip title="查看详情">
                          <Button
                            type="primary"
                            icon={<RightOutlined />}
                            onClick={() => nav(`/reviews/${it.id}`)}
                          >
                            查看详情
                          </Button>
                        </Tooltip>
                        <Popconfirm
                          title="确定删除该场面试及其所有关联数据？"
                          okText="删除"
                          okButtonProps={{ danger: true }}
                          onConfirm={async () => {
                            startOperation();
                            try {
                              await deleteInterview(it.id);
                              globalMessage.success('已删除该场面试');
                              // 重新加载（与初始化相同）
                              const pageSize = 50;
                              let page = 1;
                              let aggregated: any[] = [];
                              let totalCount = 0;
                              const maxPages = 100;
                              // eslint-disable-next-line no-constant-condition
                              while (true) {
                                const res = await listInterviews(page, pageSize);
                                totalCount = res.total || 0;
                                aggregated = aggregated.concat(res.items || []);
                                if (aggregated.length >= totalCount) break;
                                page += 1;
                                if (page > maxPages) break;
                              }
                              setItems(aggregated);
                              setTotal(totalCount);
                            } finally {
                              await endOperation();
                            }
                          }}
                        >
                          <Button danger icon={<DeleteOutlined />}>
                            删除
                          </Button>
                        </Popconfirm>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
