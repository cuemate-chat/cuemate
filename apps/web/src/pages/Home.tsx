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
    <div className="min-h-[calc(100vh-120px)] max-h-[calc(100vh-120px)] overflow-y-auto flex flex-col">
      <div className="relative py-4 sm:py-6 md:py-8 lg:py-12 flex-grow flex flex-col justify-center min-h-fit">
        {/* Hero Section */}
        <section className="pb-4 sm:pb-6 md:pb-8">
          <div className="container px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium mb-3 sm:mb-4">
                <span className="inline-flex items-center gap-1">
                  <AcademicCapIcon className="w-3 h-3 sm:w-4 sm:h-4" /> AI 面试训练
                </span>
                <span className="text-slate-400">|</span>
                <span className="inline-flex items-center gap-1">
                  <DocumentTextIcon className="w-3 h-3 sm:w-4 sm:h-4" /> AI 简历优化
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                你的<span className="text-blue-600"> 专属 </span> AI 面试教练
              </h1>
              <p className="mt-3 sm:mt-4 text-slate-600 text-sm sm:text-base md:text-lg max-w-3xl mx-auto leading-relaxed">
                面试过程中实时提供专业建议，帮助构建清晰有逻辑的回答框架，面试成功率显著提升
              </p>

              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
                <span className="text-slate-600 text-sm sm:text-base">当前岗位：</span>
                <Select
                  className="w-[180px] sm:w-[200px]"
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

              <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
                <Button
                  type="primary"
                  size="large"
                  className="!px-6 sm:!px-8 w-full sm:w-auto"
                  onClick={() => nav('/jobs/new')}
                >
                  开始面试
                </Button>
                <Button size="large" className="w-full sm:w-auto" onClick={() => nav('/jobs')}>
                  AI 面试练习
                </Button>
              </div>

              {/* 数据统计卡片 */}
              <div className="mt-5 sm:mt-6 md:mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
                <div className="group relative rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-3 sm:p-4 md:p-5 text-center transition-all duration-300 hover:scale-[1.02] lg:hover:scale-105 hover:shadow-lg lg:hover:shadow-xl hover:shadow-blue-500/20">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative">
                    <div className="mx-auto mb-2 sm:mb-3 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                      <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="text-blue-600 text-xl sm:text-2xl font-bold mb-1">100+</div>
                    <div className="text-slate-700 font-medium text-xs sm:text-sm">收到的 Offer 数量</div>
                    <div className="text-slate-500 text-xs mt-1">平均成功率 85%</div>
                  </div>
                </div>
                
                <div className="group relative rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 p-3 sm:p-4 md:p-5 text-center transition-all duration-300 hover:scale-[1.02] lg:hover:scale-105 hover:shadow-lg lg:hover:shadow-xl hover:shadow-green-500/20">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative">
                    <div className="mx-auto mb-2 sm:mb-3 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white shadow-lg">
                      <ChartBarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="text-green-600 text-xl sm:text-2xl font-bold mb-1">860+</div>
                    <div className="text-slate-700 font-medium text-xs sm:text-sm">通过的模拟次数</div>
                    <div className="text-slate-500 text-xs mt-1">累计练习时长 2000+ 小时</div>
                  </div>
                </div>
                
                <div className="group relative rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 p-3 sm:p-4 md:p-5 text-center transition-all duration-300 hover:scale-[1.02] lg:hover:scale-105 hover:shadow-lg lg:hover:shadow-xl hover:shadow-purple-500/20 sm:col-span-2 lg:col-span-1">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative">
                    <div className="mx-auto mb-2 sm:mb-3 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                      <BuildingOffice2Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="text-purple-600 text-xl sm:text-2xl font-bold mb-1">75+</div>
                    <div className="text-slate-700 font-medium text-xs sm:text-sm">成功入职的公司数量</div>
                    <div className="text-slate-500 text-xs mt-1">涵盖各行业、各岗位</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 功能模块 */}
        <section className="pt-2 sm:pt-3 md:pt-4">
          <div className="container px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
              <div className="group relative rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 p-3 sm:p-4 md:p-5 shadow-md transition-all duration-300 hover:scale-[1.02] lg:hover:scale-105 hover:shadow-lg lg:hover:shadow-xl hover:shadow-orange-500/20">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-orange-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white shadow-lg flex-shrink-0">
                      <WrenchScrewdriverIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="text-base sm:text-lg font-bold text-slate-900">岗位定制</div>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-xs sm:text-sm">
                    基于岗位 JD 自动生成面试题与评分维度，覆盖通用与专项能力。
                  </p>
                  <div className="mt-2 sm:mt-3 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                    <span className="text-xs text-slate-500">智能解析 JD</span>
                  </div>
                </div>
              </div>
              
              <div className="group relative rounded-xl bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100 p-3 sm:p-4 md:p-5 shadow-md transition-all duration-300 hover:scale-[1.02] lg:hover:scale-105 hover:shadow-lg lg:hover:shadow-xl hover:shadow-teal-500/20">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-teal-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white shadow-lg flex-shrink-0">
                      <ChatBubbleBottomCenterTextIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="text-base sm:text-lg font-bold text-slate-900">实时建议</div>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-xs sm:text-sm">
                    面试过程中实时纠错与引导，强化 STAR/SCQA 结构，提升表达与逻辑。
                  </p>
                  <div className="mt-2 sm:mt-3 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-400"></div>
                    <span className="text-xs text-slate-500">AI 实时指导</span>
                  </div>
                </div>
              </div>
              
              <div className="group relative rounded-xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 p-3 sm:p-4 md:p-5 shadow-md transition-all duration-300 hover:scale-[1.02] lg:hover:scale-105 hover:shadow-lg lg:hover:shadow-xl hover:shadow-rose-500/20 sm:col-span-2 lg:col-span-1">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-rose-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white shadow-lg flex-shrink-0">
                      <ArrowTrendingUpIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="text-base sm:text-lg font-bold text-slate-900">复盘成长</div>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-xs sm:text-sm">
                    关键问题复盘、亮点与改进建议沉淀为个人题库，持续提升。
                  </p>
                  <div className="mt-2 sm:mt-3 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div>
                    <span className="text-xs text-slate-500">持续优化</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}