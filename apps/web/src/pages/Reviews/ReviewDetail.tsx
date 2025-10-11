import {
  BulbFilled,
  CheckCircleFilled,
  CloseCircleFilled,
  IdcardOutlined,
  InfoCircleFilled,
  QuestionCircleFilled,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Card, Empty, Tabs } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  RadarChart,
  ResponsiveContainer,
  Radar as RRadar,
  Tooltip as RTooltip,
} from 'recharts';
import { getInterviewDetail } from '../../api/reviews';

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
        <Button onClick={() => nav(-1)}>返回上一级</Button>
      </div>
      <Tabs
        items={[
          {
            key: 'summary',
            label: '面试概要',
            children: (
              <SummaryTab
                data={data}
                radarData={radarData}
              />
            ),
          },
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
  const totalSec = Number(s.duration_sec) || 0;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  const durParts: any[] = [];
  if (h > 0)
    durParts.push(
      <span key="h">
        <span className="mx-1 text-blue-600 font-semibold">{h}</span> 小时
      </span>,
    );
  if (m > 0)
    durParts.push(
      <span key="m">
        <span className="mx-1 text-blue-600 font-semibold">{m}</span> 分钟
      </span>,
    );
  if (sec > 0)
    durParts.push(
      <span key="s">
        <span className="mx-1 text-blue-600 font-semibold">{sec}</span> 秒
      </span>,
    );
  if (durParts.length === 0)
    durParts.push(
      <span key="z">
        <span className="mx-1 text-blue-600 font-semibold">0</span> 秒
      </span>,
    );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1 border-blue-200" style={{ backgroundColor: '#F5FAFF' }}>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <RadarChart data={radarData} outerRadius="80%">
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="item" tick={{ fill: '#334155', fontSize: 12 }} />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                />
                <RRadar
                  name="评分"
                  dataKey="score"
                  stroke="#3b82f6"
                  fill="#3b82f659"
                  fillOpacity={0.7}
                  dot
                />
                <RTooltip formatter={(v: any) => [`${v}`, '分']} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="md:col-span-2 border-blue-100" style={{ backgroundColor: '#F5FAFF' }}>
          <div className="h-[260px] flex flex-col items-center justify-center text-center">
            <div className="flex items-end gap-1">
              <div className="text-slate-500 text-sm">综合评分: </div>
              <div className="text-5xl font-extrabold text-blue-600 drop-shadow-sm">
                {s.total_score ?? '--'}
              </div>
              <div className="text-lg text-blue-500 mb-1">分</div>
            </div>
            <div className="mt-1 text-slate-500 text-sm">
              面试时长:{' '}
              {durParts.map((el, idx) => (
                <span key={idx} className="mr-1">
                  {el}
                </span>
              ))}{' '}
              ・ 面试问题:
              <span className="mx-1 text-blue-600 font-semibold"> {s.num_questions}</span> 个
            </div>
            <div className="mt-4 max-w-[92%] text-slate-800 leading-7 font-semibold">
              {s.overall_summary}
            </div>
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* 优点占3列 */}
        <Card
          className="md:col-span-3 border-green-100"
          style={{ backgroundColor: '#F6FBF9' }}
          title={
            <div className="flex items-center gap-2">
              <CheckCircleFilled style={{ color: '#16a34a' }} />
              <span className="text-green-700 font-medium">优点</span>
            </div>
          }
        >
          {s.pros ? (
            <div className="text-green-700 font-medium" style={{ whiteSpace: 'pre-wrap' }}>
              {s.pros}
            </div>
          ) : (
            <div className="text-slate-400">—</div>
          )}
        </Card>

        {/* 缺点占2列 */}
        <Card
          className="md:col-span-2 border-red-100"
          style={{ backgroundColor: '#FEFCFB' }}
          title={
            <div className="flex items-center gap-2">
              <CloseCircleFilled style={{ color: '#ef4444' }} />
              <span className="text-red-700 font-medium">缺点</span>
            </div>
          }
        >
          {s.cons ? (
            <div className="text-red-700 font-medium" style={{ whiteSpace: 'pre-wrap' }}>
              {s.cons}
            </div>
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
        <div className="text-blue-700 font-medium" style={{ whiteSpace: 'pre-wrap' }}>
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
      {list.map((q, idx) => (
        <Card key={q.id} className="relative">
          {/* 左上角序号角标 */}
          <div className="pointer-events-none absolute left-0 top-0">
            <div className="bg-blue-600 text-white text-[10px] font-semibold px-2 py-1 rounded-br">
              {idx + 1}
            </div>
            <div className="w-0 h-0 border-t-8 border-t-blue-700 border-r-8 border-r-transparent"></div>
          </div>
          {/* 右上角时间 */}
          <div className="absolute right-3 top-2 text-xs text-slate-400">
            {dayjs(q.created_at).format('YYYY-MM-DD HH:mm')}
          </div>
          <div className="pl-4 md:pl-6">
            {/* 问题标题行 */}
            <div className="flex items-start gap-2">
              <QuestionCircleFilled style={{ color: '#fa8c16' }} className="mt-0.5" />
              <div className="text-slate-900 font-medium">
                问：“{q.asked_question || q.question}”
              </div>
            </div>

            {/* 回答块（浅绿气泡） */}
            <div className="mt-3 flex items-start gap-2">
              <InfoCircleFilled style={{ color: '#52c41a' }} className="mt-0.5" />
              <div className="flex-1 text-slate-700">
                答：“{q.candidate_answer || q.answer || '—'}”
              </div>
            </div>

            {/* 两列：考察点 + 回答评价（浅黄块） */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div
                className="rounded-md border p-3"
                style={{ backgroundColor: '#FFF7E6', borderColor: '#FFE7BA' }}
              >
                <div
                  className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: '#FFE7BA', color: '#ad6800' }}
                >
                  考察点
                </div>
                <div className="mt-2 text-slate-800 whitespace-pre-line">{q.key_points || '—'}</div>
              </div>
              <div
                className="rounded-md border p-3"
                style={{ backgroundColor: '#FFF7E6', borderColor: '#FFE7BA' }}
              >
                <div
                  className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: '#FFE7BA', color: '#ad6800' }}
                >
                  回答评价
                </div>
                <div className="mt-2 text-slate-800 whitespace-pre-line">{q.assessment || '—'}</div>
              </div>
            </div>

            {/* 参考回答（浅绿块） */}
            <div
              className="mt-3 rounded-md border p-3"
              style={{ backgroundColor: '#F6FFED', borderColor: '#B7EB8F' }}
            >
              <div
                className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: '#D9F7BE', color: '#237804' }}
              >
                参考回答
              </div>
              <div className="mt-2 text-slate-800 whitespace-pre-line">
                {q.reference_answer || '—'}
              </div>
            </div>

            {/* 优点 / 缺点 / 建议（样式同上，仅颜色区分） */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {/* 优点：绿色 */}
              <div
                className="rounded-md border p-3"
                style={{ backgroundColor: '#F6FBF9', borderColor: '#BBF7D0' }}
              >
                <div
                  className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: '#DCFCE7', color: '#166534' }}
                >
                  <CheckCircleFilled style={{ color: '#16a34a' }} /> 优点
                </div>
                <div className="mt-2 text-slate-800 whitespace-pre-line">{q.pros || '—'}</div>
              </div>
              {/* 缺点：红色 */}
              <div
                className="rounded-md border p-3"
                style={{ backgroundColor: '#FEFCFB', borderColor: '#FECACA' }}
              >
                <div
                  className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: '#FEE2E2', color: '#991b1b' }}
                >
                  <CloseCircleFilled style={{ color: '#ef4444' }} /> 缺点
                </div>
                <div className="mt-2 text-slate-800 whitespace-pre-line">{q.cons || '—'}</div>
              </div>
            </div>
            <div
              className="mt-3 rounded-md border p-3"
              style={{ backgroundColor: '#F5FAFF', borderColor: '#BFDBFE' }}
            >
              <div
                className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: '#DBEAFE', color: '#1d4ed8' }}
              >
                <BulbFilled style={{ color: '#3b82f6' }} /> 建议
              </div>
              <div className="mt-2 text-slate-800 whitespace-pre-line">{q.suggestions || '—'}</div>
            </div>
          </div>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 左卡片：契合度圆形环图（完整圆） */}
        <Card className="md:col-span-1 border-blue-100" style={{ backgroundColor: '#F5FAFF' }}>
          <div className="relative w-full" style={{ height: 220 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={[
                    {
                      name: 'filled',
                      value: Math.max(0, Math.min(100, Number(ins.interviewer_score) || 0)),
                    },
                    {
                      name: 'empty',
                      value: 100 - Math.max(0, Math.min(100, Number(ins.interviewer_score) || 0)),
                    },
                  ]}
                  startAngle={90}
                  endAngle={-270}
                  innerRadius="70%"
                  outerRadius="88%"
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#E2E8F0" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-extrabold text-blue-600">
                {Math.max(0, Math.min(100, Number(ins.interviewer_score) || 0))}
              </div>
              <div className="text-slate-500 text-sm mt-1">契合度(%)</div>
            </div>
          </div>
        </Card>
        <Card className="md:col-span-2 border-blue-100" style={{ backgroundColor: '#F5FAFF' }}>
          <div className="h-[220px] flex items-center justify-center text-center">
            <div className="max-w-[92%] text-slate-800 leading-7 font-semibold">
              “{ins.interviewer_summary || '—'}”
            </div>
          </div>
        </Card>
      </div>
      <Card
        className="border-blue-100"
        style={{ backgroundColor: '#F5FAFF' }}
        title={
          <div className="flex items-center gap-2">
            <UserOutlined style={{ color: '#3b82f6' }} />
            <span className="text-blue-700 font-medium">面试官</span>
          </div>
        }
      >
        <div className="space-y-3">
          <div
            className="rounded-md border p-3"
            style={{ backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }}
          >
            <div className="inline-block text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
              面试官角色
            </div>
            <div className="mt-2 text-slate-800">{ins.interviewer_role || '—'}</div>
          </div>
          <div
            className="rounded-md border p-3"
            style={{ backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }}
          >
            <div className="inline-block text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
              MBTI 类型
            </div>
            <div className="mt-2 text-slate-800">{ins.interviewer_mbti || '—'}</div>
          </div>
          <div
            className="rounded-md border p-3"
            style={{ backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }}
          >
            <div className="inline-block text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
              个人特质
            </div>
            <div className="mt-2 text-slate-800 whitespace-pre-line">
              {ins.interviewer_personality || '—'}
            </div>
          </div>
          <div
            className="rounded-md border p-3"
            style={{ backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }}
          >
            <div className="inline-block text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
              对候选人的偏好
            </div>
            <div className="mt-2 text-slate-800 whitespace-pre-line">
              {ins.interviewer_preference || '—'}
            </div>
          </div>
        </div>
      </Card>
      {/* 候选人（样式同沟通策略，蓝色主题） */}
      <Card
        className="border-blue-100"
        style={{ backgroundColor: '#F5FAFF' }}
        title={
          <div className="flex items-center gap-2">
            <IdcardOutlined style={{ color: '#3b82f6' }} />
            <span className="text-blue-700 font-medium">候选人</span>
          </div>
        }
      >
        <div className="space-y-3">
          <div
            className="rounded-md border p-3"
            style={{ backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }}
          >
            <div className="inline-block text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
              MBTI 类型
            </div>
            <div className="mt-2 text-slate-800">{ins.candidate_mbti || '—'}</div>
          </div>
          <div
            className="rounded-md border p-3"
            style={{ backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }}
          >
            <div className="inline-block text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
              个人特质
            </div>
            <div className="mt-2 text-slate-800 whitespace-pre-line">
              {ins.candidate_personality || '—'}
            </div>
          </div>
          <div
            className="rounded-md border p-3"
            style={{ backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }}
          >
            <div className="inline-block text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
              求职偏好
            </div>
            <div className="mt-2 text-slate-800 whitespace-pre-line">
              {ins.candidate_job_preference || '—'}
            </div>
          </div>
        </div>
      </Card>
      <Card
        className="border-green-100"
        style={{ backgroundColor: '#F6FBF9' }}
        title={
          <div className="flex items-center gap-2">
            <BulbFilled style={{ color: '#16a34a' }} />
            <span className="text-emerald-700 font-medium">沟通策略</span>
          </div>
        }
      >
        <div className="space-y-3">
          <div
            className="rounded-md border p-3"
            style={{ backgroundColor: '#ECFDF5', borderColor: '#BBF7D0' }}
          >
            <div className="inline-block text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
              提前准备技术细节
            </div>
            <div className="mt-2 text-slate-800 whitespace-pre-line">
              {ins.strategy_prepare_details || '—'}
            </div>
          </div>
          <div
            className="rounded-md border p-3"
            style={{ backgroundColor: '#ECFDF5', borderColor: '#BBF7D0' }}
          >
            <div className="inline-block text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
              展示对业务的理解
            </div>
            <div className="mt-2 text-slate-800 whitespace-pre-line">
              {ins.strategy_business_understanding || '—'}
            </div>
          </div>
          <div
            className="rounded-md border p-3"
            style={{ backgroundColor: '#ECFDF5', borderColor: '#BBF7D0' }}
          >
            <div className="inline-block text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
              保持逻辑清晰
            </div>
            <div className="mt-2 text-slate-800 whitespace-pre-line">
              {ins.strategy_keep_logical || '—'}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
