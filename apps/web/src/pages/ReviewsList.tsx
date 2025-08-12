import { DeleteOutlined, RightOutlined } from '@ant-design/icons';
import { Badge, Button, Empty, Popconfirm, Spin, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteInterview, listInterviews } from '../api/reviews';
import { message as globalMessage } from '../components/Message';

export default function ReviewsList() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
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
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="text-sm text-slate-600 mb-3">面试时间轴 <span className="text-slate-400">（共 {total} 场面试）</span></div>
      {loading ? (
        <div className="py-20 text-center"><Spin /></div>
      ) : (
        <div className="space-y-4">
            {items.length === 0 && (
              <div className="py-10"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无记录" /></div>
            )}
            {items.map((it, idx) => (
              <div key={it.id} className="grid grid-cols-12 gap-4">
                {/* 左列：时间显示；右边缘作为时间轴，圆点紧贴右侧靠近卡片 */}
                <div className="col-span-12 md:col-span-2 relative pr-10 text-right pt-3">
                  <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-slate-200" />
                  <div className="absolute right-4 top-5 w-3 h-3 rounded-full bg-blue-500 transform translate-x-1/2" />
                  <div className="text-[20px] text-slate-500 leading-4 mt-1">{dayjs(it.started_at).format('YYYY-MM-DD')}</div>
                  <div className="text-[14px] text-slate-400 mt-1">{dayjs(it.started_at).format('HH:mm')}</div>
                </div>
                {/* 右列：岗位 + 总结 + 建议/弱点 */}
                <div className="col-span-12 md:col-span-10">
                  <div className="border rounded-xl p-4 hover:bg-slate-50 relative ml-4 md:ml-6">
                    <div className="pointer-events-none absolute left-0 top-0">
                      <div className="bg-blue-600 text-white text-[10px] font-semibold px-2 py-1 rounded-br">
                        {idx + 1}
                      </div>
                      <div className="w-0 h-0 border-t-8 border-t-blue-700 border-r-8 border-r-transparent"></div>
                    </div>
                    {/* 右上角数量徽标（贴角展示） */}
                    <div className="absolute right-3 top-2">
                      <Badge count={it.advantages_total || 0} overflowCount={99}>
                        <span className="inline-flex items-center h-6 px-2 text-[11px] text-slate-700 bg-slate-100 border border-slate-200 rounded-full shadow-sm">优缺点</span>
                      </Badge>
                    </div>

                    <div className="pl-4">
                      <div className="text-slate-900 font-semibold">
                        {it.job_title}
                      </div>
                      {it.overall_summary && (
                        <div className="mt-2 text-sm text-slate-700 whitespace-pre-line line-clamp-2">{it.overall_summary}</div>
                      )}
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-3 text-sm">
                          {(() => {
                            const formatTag = (val?: string) => {
                              const raw = val || '—';
                              const isLong = raw.length > 15;
                              const text = raw.slice(0, 15);
                              const padLen = Math.max(0, 15 - text.length);
                              return text + '　'.repeat(padLen) + (isLong ? '…' : '');
                            };
                            return (
                              <>
                                <Tag color="blue" className="!m-0 !px-3 !py-1 font-medium whitespace-pre">{formatTag(it.advantage_content || it.overall_suggestions)}</Tag>
                                <Tag color="red" className="!m-0 !px-3 !py-1 font-medium whitespace-pre">{formatTag(it.disadvantage_content || it.overall_cons)}</Tag>
                              </>
                            );
                          })()}
                        </div>
                        <div className="flex justify-end gap-2 shrink-0">
                          <Tooltip title="查看详情">
                            <Button type="primary" icon={<RightOutlined />} onClick={() => nav(`/reviews/${it.id}`)}>查看详情</Button>
                          </Tooltip>
                          <Popconfirm
                            title="确定删除该场面试及其所有关联数据？"
                            okText="删除"
                            okButtonProps={{ danger: true }}
                            onConfirm={async () => {
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
                            }}
                          >
                            <Button danger icon={<DeleteOutlined />}>删除</Button>
                          </Popconfirm>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
      )}
    </div>
  );
}


