import {
  AcademicCapIcon,
  ArrowTrendingUpIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  ChatBubbleBottomCenterTextIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { Button, Select } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listJobs } from '../api/jobs';

export default function Home() {
  const nav = useNavigate();
  const [jobs, setJobs] = useState<Array<{ id: string; title: string }>>([]);
  const [currentJob, setCurrentJob] = useState<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const data = await listJobs();
        const items = (data.items || []).map((i: any) => ({ id: i.id, title: i.title }));
        setJobs(items);
        if (items.length > 0) setCurrentJob(items[0].id);
      } catch {
        // 全局 http 已有错误提示
      }
    })();
  }, []);

  const selectOptions = useMemo(() => jobs.map((j) => ({ value: j.id, label: j.title })), [jobs]);

  return (
    <div>
      <div className="relative">
        {/* Hero Section */}
        <section className="pt-12 md:pt-20 pb-10">
          <div className="container">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-3 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium mb-4">
                <span className="inline-flex items-center gap-1">
                  <AcademicCapIcon className="w-4 h-4" /> AI 面试训练
                </span>
                <span className="text-slate-400">|</span>
                <span className="inline-flex items-center gap-1">
                  <DocumentTextIcon className="w-4 h-4" /> AI 简历优化
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
                你的<span className="text-blue-600"> 专属 </span> AI 面试教练
              </h1>
              <p className="mt-4 text-slate-600 text-base md:text-lg">
                面试过程中实时提供专业建议，帮助构建清晰有逻辑的回答框架，面试成功率显著提升
              </p>

              <div className="mt-8 flex flex-col md:flex-row items-center justify-center gap-3">
                <span className="text-slate-600">当前岗位：</span>
                <Select
                  className="w-[220px]"
                  value={currentJob}
                  placeholder="请选择岗位"
                  options={selectOptions}
                  onChange={(v) => setCurrentJob(v)}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label as string).toLowerCase().includes(input.toLowerCase())
                  }
                />
              </div>

              <div className="mt-6 flex items-center justify-center gap-3">
                <Button
                  type="primary"
                  size="large"
                  className="!px-8"
                  onClick={() => nav('/jobs/new')}
                >
                  开始面试
                </Button>
                <Button size="large" onClick={() => nav('/jobs')}>
                  AI 面试练习
                </Button>
              </div>

              <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl bg-white/80 backdrop-blur border border-slate-200 p-4 text-center">
                  <div className="mx-auto mb-1 w-6 h-6 text-blue-600">
                    <CheckCircleIcon />
                  </div>
                  <div className="text-blue-600 text-xl font-semibold">100 +</div>
                  <div className="text-slate-600 text-sm">收到的 Offer 数量</div>
                </div>
                <div className="rounded-xl bg-white/80 backdrop-blur border border-slate-200 p-4 text-center">
                  <div className="mx-auto mb-1 w-6 h-6 text-blue-600">
                    <ChartBarIcon />
                  </div>
                  <div className="text-blue-600 text-xl font-semibold">860 +</div>
                  <div className="text-slate-600 text-sm">通过的模拟次数</div>
                </div>
                <div className="rounded-xl bg-white/80 backdrop-blur border border-slate-200 p-4 text-center">
                  <div className="mx-auto mb-1 w-6 h-6 text-blue-600">
                    <BuildingOffice2Icon />
                  </div>
                  <div className="text-blue-600 text-xl font-semibold">45 +</div>
                  <div className="text-slate-600 text-sm">成功入职的公司数量</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 功能模块 */}
        <section className="pt-0 pb-12">
          <div className="container grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl bg-white border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-2">
                <WrenchScrewdriverIcon className="w-5 h-5 text-blue-600" /> 岗位定制
              </div>
              <p className="text-slate-600">
                基于岗位 JD 自动生成面试题与评分维度，覆盖通用与专项能力。
              </p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-2">
                <ChatBubbleBottomCenterTextIcon className="w-5 h-5 text-blue-600" /> 实时建议
              </div>
              <p className="text-slate-600">
                面试过程中实时纠错与引导，强化 STAR/SCQA 结构，提升表达与逻辑。
              </p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-2">
                <ArrowTrendingUpIcon className="w-5 h-5 text-blue-600" /> 复盘成长
              </div>
              <p className="text-slate-600">
                关键问题复盘、亮点与改进建议沉淀为个人题库，持续提升。
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
