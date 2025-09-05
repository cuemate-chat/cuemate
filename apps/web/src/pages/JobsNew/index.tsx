import { PaperClipIcon } from '@heroicons/react/24/outline';
import { Button, Input, Modal, Steps, Upload } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createJob, extractResumeText } from '../../api/jobs';
import image from '../../assets/login-left3.png';
import CollapsibleSidebar from '../../components/CollapsibleSidebar';
import { message as globalMessage } from '../../components/Message';
import ResumeExampleDrawer from './ResumeExampleDrawer';

const { TextArea } = Input;

import { JOB_EXAMPLES, JobExample } from '../../data/jobExamples';

export default function JobsNew() {
  const nav = useNavigate();
  const [current, setCurrent] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [resumeSampleOpen, setResumeSampleOpen] = useState(false);
  const [prevResumeText, setPrevResumeText] = useState<string | null>(null);

  // Step1: 基本信息
  const [jobName, setJobName] = useState('');
  const [jobDesc, setJobDesc] = useState('');

  // Step2: 简历
  const [resumeText, setResumeText] = useState('');
  const [resumeMeta, setResumeMeta] = useState<{ name: string; size: number; type: string } | null>(
    null,
  );

  // Step3: 提交态由 progress 控制
  const [progress, setProgress] = useState(0);
  const progressTimerRef = useRef<number | null>(null);

  // 自适应行数：根据屏幕高度计算合适的文本域行数
  const [adaptiveRows, setAdaptiveRows] = useState<{ desc: number; resume: number }>({ desc: 20, resume: 13 });

  // 根据屏幕高度自适应计算文本域行数
  useEffect(() => {
    const calculateRows = () => {
      const viewportHeight = window.innerHeight;
      // 基于视口高度计算：
      // - 岗位描述：占用更多空间，适合详细描述
      // - 简历文本：占用适中空间
      if (viewportHeight >= 1080) {
        // 大屏幕：1080p及以上
        setAdaptiveRows({ desc: 27, resume: 20 });
      } else if (viewportHeight >= 900) {
        // 中大屏幕：900-1080px
        setAdaptiveRows({ desc: 24, resume: 18 });
      } else if (viewportHeight >= 768) {
        // 中屏幕：768-900px
        setAdaptiveRows({ desc: 19, resume: 15 });
      } else {
        // 小屏幕：768px以下
        setAdaptiveRows({ desc: 15, resume: 13 });
      }
    };

    calculateRows();
    window.addEventListener('resize', calculateRows);
    return () => window.removeEventListener('resize', calculateRows);
  }, []);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, []);

  const canNext1 = useMemo(
    () => jobName.trim().length > 0 && jobDesc.trim().length > 0,
    [jobName, jobDesc],
  );
  const canNext2 = useMemo(
    () => resumeText.trim().length > 0 || !!resumeMeta,
    [resumeText, resumeMeta],
  );

  const fillExample = (ex: JobExample) => {
    if (!jobName) setJobName(ex.name);
    if (!jobDesc) setJobDesc(ex.desc);
    if (jobName && jobDesc) {
      setJobName(ex.name);
      setJobDesc(ex.desc);
    }
  };

  const handleNext = async () => {
    if (current === 0 && !canNext1) return;
    if (current === 1 && !canNext2) return;
    if (current === 1) {
      // 进入第三步并开始进度
      setCurrent(2);
      // 开始提交
      setProgress(1);
      if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = window.setInterval(() => {
        setProgress((p) => Math.min(95, p + Math.random() * 5 + 1));
      }, 250);
      try {
        const resumeContent =
          resumeText.trim().length > 0
            ? resumeText.trim().slice(0, 5000)
            : `文件：${resumeMeta?.name ?? '未命名'}（${resumeMeta ? (resumeMeta.size / 1024 / 1024).toFixed(2) : '0'}MB）\n暂存占位，建议粘贴简历文本以获得更好处理效果。`;
        await createJob({
          title: jobName.trim(),
          description: jobDesc.trim().slice(0, 5000),
          resumeTitle: resumeMeta?.name || `${jobName.trim()}-简历`,
          resumeContent,
        });
        if (progressTimerRef.current) {
          window.clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
        }
        setProgress(100);
        // 提交完成
        globalMessage.success('创建岗位成功，请进行下一步，创建面试押题吧');
      } catch (e: any) {
        if (progressTimerRef.current) {
          window.clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
        }
        // 提交失败
        setProgress(0);
        setCurrent(1);
        globalMessage.error(e?.message || '创建岗位失败');
      }
      return;
    }
    if (current < 2) setCurrent((c) => c + 1);
  };

  const handlePrev = () => setCurrent((c) => Math.max(0, c - 1));

  const resetAll = () => {
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    // 重置提交态
    setProgress(0);
    setJobName('');
    setJobDesc('');
    setResumeText('');
    setResumeMeta(null);
    setCurrent(0);
  };

  // 从本地文件尝试提取文本（仅对文本类文件有效，其他类型回退为提示文案）
  const extractTextFromFile = async (file: File): Promise<string | null> => {
    try {
      // 仅对 text/* 或 .txt 主动尝试解析为文本
      const lowerName = (file.name || '').toLowerCase();
      const isPlainText = file.type.startsWith('text/') || lowerName.endsWith('.txt');
      if (!isPlainText) return null;
      const text = await file.text();
      // 过滤明显的二进制噪声
      let controlChars = 0;
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if ((code >= 0 && code <= 8) || (code >= 14 && code <= 31)) {
          controlChars++;
        }
      }
      const ratio = controlChars / Math.max(1, text.length);
      if (ratio > 0.02) return null;
      return text;
    } catch {
      return null;
    }
  };

  const resumeSample = `【基本信息】\n- 姓名：张三\n- 电话：1xxxxxxxxxx\n- 邮箱：xxx@xxx.com\n- 期望城市：xxx\n- 到岗时间：xxx\n\n【教育背景】\n- 2018.09 - 2022.06  xxx大学  xxx学院  xxx专业  本科  GPA：xxx/4.0  排名：Top xx%\n\n【工作经历】\n- 2023.07 - 至今  xxx科技有限公司  前端工程师  地点：xxx\n  1) 负责 xxx 后台管理系统的需求评审、技术方案与实现，提升页面性能 xx%\n  2) 与后端协作完成 xxx 模块的重构，Bug 率下降 xx%\n- 2022.07 - 2023.06  xxx信息技术有限公司  前端工程师  地点：xxx\n  1) 参与 xxx 小程序开发，上线后 DAU 达到 xx 万\n  2) 构建组件库，提高复用率与研发效率\n\n【项目经历】\n- 项目一：xxx 平台重构  （2024.03 - 2024.08）\n  职责：主导架构与核心功能实现（../../可视化报表），推动前后端接口规范化\n  结果：首屏时间降低 xx%，问题单率下降 xx%\n- 项目二：xxx 小程序  （2023.01 - 2023.05）\n  职责：负责商品列表、下单、支付等核心流程的实现与联调\n  结果：上线首月 GMV 达到 xxx 万\n\n【个人技能】\n- 精通：TypeScript、React、Vue、Ant Design、Webpack/Vite\n- 熟悉：Node.js、Express/Fastify、数据库基础（MySQL/SQLite）\n- 了解：CI/CD、Docker、性能优化与可观测性\n\n【个人评价】\n- 沟通顺畅，主动推进跨团队协作；学习能力与问题定位能力强；责任心强，能抗压。`;


  const handleApplySampleToCurrent = () => {
    Modal.confirm({
      title: '确认覆盖当前简历文本？',
      content:
        '该操作会用示例文本覆盖当前输入框的内容，且不会自动合并。请确认无误后再操作。',
      okText: '覆盖并带入',
      okType: 'danger',
      cancelText: '取消',
      centered: true,
      zIndex: 10000, // 设置为比 DrawerProvider 更高的层级
      onOk: () => {
        setPrevResumeText(resumeText);
        setResumeText(resumeSample);
        globalMessage.success('已将示例带入当前简历');
      },
    });
  };

  const handleUndoApplySample = () => {
    if (prevResumeText === null) return;
    setResumeText(prevResumeText);
    setPrevResumeText(null);
    globalMessage.success('已回退至覆盖前的内容');
  };

  return (
    <div className="bg-transparent">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <Steps
          current={current}
          items={[{ title: '填写岗位信息' }, { title: '选择简历' }, { title: '准备完成' }]}
        />

        {/* Step 内容 */}
        {current === 0 && (
          <div className="mt-6 flex flex-col lg:flex-row gap-6">
            {/* 左侧示例 */}
            <CollapsibleSidebar
              isCollapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
              title="示例岗位"
              className="h-[calc(100vh-200px)] sm:h-[calc(100vh-250px)] lg:h-[calc(100vh-320px)] min-h-[500px] sm:min-h-[550px] lg:min-h-[600px]"
            >
              <div className="p-4 space-y-2 overflow-y-auto h-full">
                {JOB_EXAMPLES.map((ex, index) => (
                  <button
                    key={ex.name}
                    onClick={() => fillExample(ex)}
                    className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 
                               hover:border-blue-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 
                               transition-all duration-200 group transform hover:scale-[1.02] 
                               active:scale-[0.98]"
                    title="点击填充到表单"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 
                                      flex items-center justify-center text-white text-sm font-medium
                                      group-hover:shadow-lg transition-all duration-200">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-slate-800 group-hover:text-blue-700 transition-colors">
                          {ex.name}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CollapsibleSidebar>
            
            {/* 右侧表单 */}
            <div className="flex-1 min-w-0">
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-slate-600 mb-1">岗位名称<span className="text-red-500"> *</span></div>
                  <Input
                    maxLength={200}
                    placeholder="请输入岗位名称"
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                    size="large"
                  />
                </div>
                <div>
                  <div className="text-sm text-slate-600 mb-1">岗位描述<span className="text-red-500"> *</span></div>
                  <TextArea
                    maxLength={5000}
                    placeholder="请描述岗位职责、任职要求等，AI 将根据描述生成模拟面试题与流程"
                    value={jobDesc}
                    onChange={(e) => setJobDesc(e.target.value)}
                    rows={adaptiveRows.desc}
                  />
                  <div className="text-right text-xs text-slate-500">{jobDesc.length} / 5000</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {current === 1 && (
          <div className="mt-6 grid grid-cols-1 gap-6">
            <div className="rounded-lg border border-dashed border-slate-300">
              <Upload.Dragger
                name="resume"
                multiple={false}
                accept=".txt,.pdf,.doc,.docx,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                beforeUpload={(file) => {
                  const max = 10 * 1024 * 1024; // 10MB
                  const lower = (file.name || '').toLowerCase();
                  const okExt = ['.pdf', '.doc', '.docx'].some((ext) => lower.endsWith(ext));
                  const okTxt = lower.endsWith('.txt');
                  if (!okExt && !okTxt) {
                    globalMessage.error('仅支持上传 TXT 或 PDF、Word（.txt/.pdf/.doc/.docx）');
                    return Upload.LIST_IGNORE as any;
                  }
                  if (file.size > max) {
                    globalMessage.error('文件大小不能超过 10MB');
                    return Upload.LIST_IGNORE as any;
                  }
                  setResumeMeta({ name: file.name, size: file.size, type: file.type });
                  (async () => {
                    // 1) 先尝试本地读取 TXT
                    const localText = await extractTextFromFile(file);
                    if (localText && localText.trim()) {
                      setResumeText(localText.slice(0, 20000));
                      globalMessage.success('已读取简历文本到输入框');
                      return;
                    }
                    // 2) 调用后端解析 PDF/Word
                    try {
                      // 检查是否有认证token
                      const token = localStorage.getItem('auth_token');
                      if (!token) {
                        throw new Error('请先登录后再使用文件解析功能');
                      }

                      const res = await extractResumeText(file);
                      setResumeText((res.text || '').slice(0, 20000));
                      globalMessage.success(`已从文件解析得到文本（${res.text?.length || 0}个字符）`);
                    } catch (err: any) {
                      // 根据错误类型给出不同的提示
                      let errorMessage = '暂未能自动提取文本，请粘贴简历文本';
                      let placeholderText = `已选择文件：${file.name}（${(file.size / 1024 / 1024).toFixed(2)}MB）\n未能自动提取文本内容，请将简历文本粘贴到下方输入框以便后续处理。`;
                      
                      if (err?.message?.includes('Authorization') || err?.message?.includes('认证') || err?.message?.includes('登录')) {
                        errorMessage = '请先登录后再使用文件解析功能';
                        placeholderText = `已选择文件：${file.name}（${(file.size / 1024 / 1024).toFixed(2)}MB）\n[警告] 需要登录才能自动解析文件，请先登录或直接粘贴简历文本到下方输入框。`;
                      } else if (err?.message?.includes('PDF') || err?.message?.includes('DOC') || err?.message?.includes('解析失败')) {
                        errorMessage = `文件解析失败：${err.message}`;
                        placeholderText = `已选择文件：${file.name}（${(file.size / 1024 / 1024).toFixed(2)}MB）\n[错误] 文件解析失败：${err.message}\n\n请将简历文本手动粘贴到下方输入框，或尝试转换文件格式后重新上传。`;
                      } else if (err?.message?.includes('不支持') || err?.message?.includes('格式')) {
                        errorMessage = `不支持的文件格式：${err.message}`;
                        placeholderText = `已选择文件：${file.name}（${(file.size / 1024 / 1024).toFixed(2)}MB）\n🚫 ${err.message}\n\n请将简历文本直接粘贴到下方输入框，或将文件转换为PDF、DOCX格式后重新上传。`;
                      }
                      
                      setResumeText(placeholderText);
                      globalMessage.warning(errorMessage);
                    }
                  })();
                  return false; // 阻止上传到服务器
                }}
                showUploadList={false}
              >
                <p className="ant-upload-drag-icon">
                  <PaperClipIcon className="w-6 h-6" />
                </p>
                <p className="ant-upload-text">拖拽简历到此处上传，或点击选择文件</p>
                <p className="ant-upload-hint">也可直接将简历文本粘贴到下方输入框</p>
              </Upload.Dragger>
            </div>
            <div>
              <div className="text-sm text-slate-600 mb-1">简历文本<span className="text-red-500"> *</span></div>
              <TextArea
                maxLength={20000}
                rows={adaptiveRows.resume}
                placeholder="可直接粘贴你的简历到这里，特别是遇到解析失败的时候"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
              />
              <div className="text-right text-xs text-slate-500">{resumeText.length} / 20000</div>
            </div>
          </div>
        )}

        {current === 2 && (
          <div className="mt-10 flex flex-col items-center justify-center py-12">
            <div className="w-[620px] max-w-full aspect-[16/9] rounded-md mb-6">
              <img src={image} alt="illustration" className="w-full h-auto object-contain" />
            </div>
            <div className="w-full max-w-xl mx-auto">
              <div className="h-2 bg-slate-200 rounded overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 text-center text-sm text-slate-600">{progress}%</div>
            </div>
            <div className="text-center mt-4">
              <div className="text-xl font-semibold mb-2">
                {progress >= 100 ? '准备完成' : '准备中…'}
              </div>
              <div className="text-slate-600">
                {progress >= 100
                  ? '已生成面试岗位，模拟面试试一番，熟悉熟悉流程吧！'
                  : '正在上传简历并写入岗位信息…'}
              </div>
            </div>
          </div>
        )}

        {/* 底部操作区 */}
        <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => (current === 0 ? nav('/home') : handlePrev())}>
              {current === 0 ? '返回主页' : '上一步'}
            </Button>
            {current === 1 && (
              <Button
                onClick={() => setResumeSampleOpen(true)}
                className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:text-blue-700"
              >
                简历示例
              </Button>
            )}
            {current === 2 && (
              <Button
                onClick={() => nav('/home')}
                className="bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 hover:text-green-700"
              >
                准备模拟面试
              </Button>
            )}
          </div>
          {current < 2 && (
            <Button
              type="primary"
              onClick={handleNext}
              disabled={(current === 0 && !canNext1) || (current === 1 && !canNext2)}
            >
              下一步
            </Button>
          )}
          {current === 2 && (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button disabled={progress < 100} onClick={resetAll}>
                新建另一个岗位
              </Button>
              <Button
                type="primary"
                disabled={progress < 100}
                onClick={() => nav('/settings/vector-knowledge')}
              >
                去往向量知识库
              </Button>
              <Button
                disabled={progress < 100}
                onClick={() => nav('/questions')}
                className="bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 hover:text-orange-700"
              >
                添加面试押题
              </Button>
            </div>
          )}
        </div>
        {/* 简历示例抽屉 */}
        <ResumeExampleDrawer
          open={resumeSampleOpen}
          onClose={() => setResumeSampleOpen(false)}
          onApplySample={handleApplySampleToCurrent}
          onUndoSample={handleUndoApplySample}
          canUndo={prevResumeText !== null}
          resumeSample={resumeSample}
        />
      </div>
    </div>
  );
}
