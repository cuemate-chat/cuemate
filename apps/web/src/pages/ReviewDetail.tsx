import { BulbFilled, CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';
import { Badge, Button, Card, Empty, Tabs } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, RadarChart, ResponsiveContainer, Radar as RRadar, Tooltip as RTooltip } from 'recharts';
import { getInterviewDetail } from '../api/reviews';

export default function ReviewDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState<any>({ summary: null, questions: [], insights: null });

  useEffect(() => {
    if (!id) return;
    (async () => {
      const res = await getInterviewDetail(id);
      setData(res);
    })();
  }, [id]);

  const radarData = useMemo(() => {
    const s = data.summary || {};
    return [
      { item: '互动性', score: s.radar_interactivity || 0 },
      { item: '自信度', score: s.radar_confidence || 0 },
      { item: '专业性', score: s.radar_professionalism || 0 },
      { item: '回答相关性', score: s.radar_relevance || 0 },
      { item: '表达流程性', score: s.radar_clarity || 0 },
    ];
  }, [data]);

  const prosList: any[] = (data.advantages || []).filter((a: any) => a.type === 0);
  const consList: any[] = (data.advantages || []).filter((a: any) => a.type === 1);
  return (
    <div className="space-y-4">
      <div>
        <Button onClick={() => nav(-1)}>返回上一级</Button>
      </div>
      <Tabs
        items={[
          { key: 'summary', label: '面试概要', children: <SummaryTab data={data} radarData={radarData} prosList={prosList} consList={consList} /> },
          { key: 'qa', label: '问题分析', children: <QATab data={data} /> },
          { key: 'insight', label: '面试官剖析', children: <InsightTab data={data} /> },
        ]}
      />
    </div>
  );
}

function SummaryTab({ data, radarData, prosList, consList }: any) {
  const s = data.summary;
  if (!s) return <Empty description="暂无概要数据" />;
  const totalSec = Number(s.duration_sec) || 0;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  const durParts: any[] = [];
  if (h > 0) durParts.push(<span key="h"><span className="mx-1 text-blue-600 font-semibold">{h}</span> 小时</span>);
  if (m > 0) durParts.push(<span key="m"><span className="mx-1 text-blue-600 font-semibold">{m}</span> 分钟</span>);
  if (sec > 0) durParts.push(<span key="s"><span className="mx-1 text-blue-600 font-semibold">{sec}</span> 秒</span>);
  if (durParts.length === 0) durParts.push(<span key="z"><span className="mx-1 text-blue-600 font-semibold">0</span> 秒</span>);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1 border-blue-200" style={{ backgroundColor: '#F5FAFF' }}>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <RadarChart data={radarData} outerRadius="80%">
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="item" tick={{ fill: '#334155', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <RRadar name="评分" dataKey="score" stroke="#3b82f6" fill="#3b82f659" fillOpacity={0.7} dot />
                <RTooltip formatter={(v: any) => [`${v}`, '分']} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="md:col-span-2 border-blue-100" style={{ backgroundColor: '#F5FAFF' }}>
          <div className="h-[260px] flex flex-col items-center justify-center text-center">
            <div className="flex items-end gap-1">
              <div className="text-slate-500 text-sm">综合评分: </div>
              <div className="text-5xl font-extrabold text-blue-600 drop-shadow-sm">{s.total_score ?? '--'}</div>
              <div className="text-lg text-blue-500 mb-1">分</div>
            </div>
            <div className="mt-1 text-slate-500 text-sm">
              面试时长: {durParts.map((el, idx) => (<span key={idx} className="mr-1">{el}</span>))} ・ 面试问题: 
              <span className="mx-1 text-blue-600 font-semibold"> {s.num_questions}</span> 个
            </div>
            <div className="mt-4 max-w-[92%] text-slate-800 leading-7 font-semibold">
              {s.overall_summary}
            </div>
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 优点在前 */}
        <Card
          className="border-green-100"
          style={{ backgroundColor: '#F6FBF9' }}
          title={
            <div className="flex items-center gap-2">
              <CheckCircleFilled style={{ color: '#16a34a' }} />
              <span className="text-green-700 font-medium">优点</span>
              <Badge count={prosList.length} style={{ backgroundColor: '#16a34a' }} />
            </div>
          }
        >
          {prosList.length ? (
            <ul className="space-y-3 h-[156px] overflow-y-auto pr-2">
              {prosList.map((it: any, idx: number) => (
                <li key={it.id} className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex items-center justify-center h-5 w-5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-green-700 font-medium truncate" title={it.content}>{it.content}</div>
                    {it.description && (
                      <div className="text-xs text-slate-500 mt-1 truncate" title={it.description}>“{it.description}”</div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-slate-400">—</div>
          )}
        </Card>

        {/* 缺点在后 */}
        <Card
          className="border-red-100"
          style={{ backgroundColor: '#FEFCFB' }}
          title={
            <div className="flex items-center gap-2">
              <CloseCircleFilled style={{ color: '#ef4444' }} />
              <span className="text-red-700 font-medium">缺点</span>
              <Badge count={consList.length} style={{ backgroundColor: '#ef4444' }} />
            </div>
          }
        >
          {consList.length ? (
            <ul className="space-y-3 h-[156px] overflow-y-auto pr-2">
              {consList.map((it: any, idx: number) => (
                <li key={it.id} className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-red-700 font-medium truncate" title={it.content}>{it.content}</div>
                    {it.description && (
                      <div className="text-xs text-slate-500 mt-1 truncate" title={it.description}>“{it.description}”</div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-slate-400">—</div>
          )}
        </Card>
      </div>
      <Card
        className="border-blue-100"
        style={{ backgroundColor: '#F5FAFF' }}
        title={
          <div className="flex items-center gap-2">
            <BulbFilled style={{ color: '#3b82f6' }} />
            <span className="text-blue-700 font-medium">建议</span>
          </div>
        }
      >
        <div className="text-blue-700 font-medium truncate" title={s.suggestions || '—'}>
          {s.suggestions || '—'}
        </div>
      </Card>
    </div>
  );
}

function QATab({ data }: any) {
  const list: any[] = data.questions || [];
  if (!list.length) return <Empty description="暂无问题条目" />;
  return (
    <div className="space-y-4">
      {list.map((q) => (
        <Card key={q.id}>
          <div className="text-slate-900 font-medium">{q.asked_question || q.question}</div>
          <div className="mt-1 text-slate-700">答：{q.candidate_answer || q.answer || '—'}</div>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-slate-500">考察点</div>
              <div className="text-slate-800 whitespace-pre-line">{q.key_points || '—'}</div>
            </div>
            <div>
              <div className="text-slate-500">回答评价</div>
              <div className="text-slate-800 whitespace-pre-line">{q.assessment || '—'}</div>
            </div>
            <div>
              <div className="text-slate-500">参考回答</div>
              <div className="text-slate-800 whitespace-pre-line">{q.reference_answer || '—'}</div>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="text-red-600">缺点：{q.cons || '—'}</div>
            <div className="text-green-700">优点：{q.pros || '—'}</div>
            <div className="text-slate-700">建议：{q.suggestions || '—'}</div>
          </div>
          <div className="mt-2 text-xs text-slate-400">时间：{dayjs(q.created_at).format('YYYY-MM-DD HH:mm')}</div>
        </Card>
      ))}
    </div>
  );
}

function InsightTab({ data }: any) {
  const ins = data.insights;
  if (!ins) return <Empty description="暂无剖析" />;
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-3xl font-semibold text-slate-900">{ins.interviewer_score ?? '--'} 分</div>
          <div className="md:col-span-2 text-slate-800 whitespace-pre-line">{ins.interviewer_summary || '—'}</div>
        </div>
      </Card>
      <Card title="面试官">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div><span className="text-slate-500">角色</span>：{ins.interviewer_role || '—'}</div>
            <div><span className="text-slate-500">MBTI</span>：{ins.interviewer_mbti || '—'}</div>
            <div><span className="text-slate-500">个人特质</span>：{ins.interviewer_personality || '—'}</div>
            <div><span className="text-slate-500">对候选人的偏好</span>：{ins.interviewer_preference || '—'}</div>
          </div>
          <div className="space-y-2">
            <div className="font-medium">候选人</div>
            <div><span className="text-slate-500">MBTI</span>：{ins.candidate_mbti || '—'}</div>
            <div><span className="text-slate-500">个人特质</span>：{ins.candidate_personality || '—'}</div>
            <div><span className="text-slate-500">求职偏好</span>：{ins.candidate_job_preference || '—'}</div>
          </div>
        </div>
      </Card>
      <Card title="沟通策略">
        <div className="space-y-2">
          <div>提前准备技术细节：{ins.strategy_prepare_details || '—'}</div>
          <div>展示对业务的理解：{ins.strategy_business_understanding || '—'}</div>
          <div>保持逻辑清晰：{ins.strategy_keep_logical || '—'}</div>
        </div>
      </Card>
    </div>
  );
}


