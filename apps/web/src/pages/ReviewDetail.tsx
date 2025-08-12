import { Radar } from '@ant-design/plots';
import { Button, Card, Empty, Tabs } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

  return (
    <div className="space-y-4">
      <div>
        <Button onClick={() => nav(-1)}>返回</Button>
      </div>
      <Tabs
        items={[
          { key: 'summary', label: '面试概要', children: <SummaryTab data={data} radarData={radarData} /> },
          { key: 'qa', label: '问题分析', children: <QATab data={data} /> },
          { key: 'insight', label: '面试官剖析', children: <InsightTab data={data} /> },
        ]}
      />
    </div>
  );
}

function SummaryTab({ data, radarData }: any) {
  const s = data.summary;
  if (!s) return <Empty description="暂无概要数据" />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <Radar height={260} data={radarData} xField="item" yField="score" meta={{ score: { min: 0, max: 100 } }} point={{ size: 2 }} />
        </Card>
        <Card className="md:col-span-2">
          <div className="text-2xl font-semibold text-slate-900">{s.total_score ?? '--'} 分</div>
          <div className="text-slate-600 mt-1 text-sm">时长 {s.duration_sec}s · 问题 {s.num_questions}</div>
          <div className="mt-3 text-slate-800">{s.overall_summary}</div>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="缺点" className="border-red-200">
          <div className="text-slate-800 whitespace-pre-line">{s.cons || '—'}</div>
        </Card>
        <Card title="优点" className="border-green-200">
          <div className="text-slate-800 whitespace-pre-line">{s.pros || '—'}</div>
        </Card>
      </div>
      <Card title="建议">
        <div className="text-slate-800 whitespace-pre-line">{s.suggestions || '—'}</div>
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


