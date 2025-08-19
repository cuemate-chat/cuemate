import { PaperClipIcon } from '@heroicons/react/24/outline';
import { Button, Input, Steps, Upload } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createJob } from '../api/jobs';
import image from '../assets/login-left3.png';
import CollapsibleSidebar from '../components/CollapsibleSidebar';
import { message as globalMessage } from '../components/Message';

const { TextArea } = Input;

import { JOB_EXAMPLES, JobExample } from '../data/jobExamples';

export default function JobsNew() {
  const nav = useNavigate();
  const [current, setCurrent] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  return (
    <div className="bg-transparent">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <Steps
          current={current}
          items={[{ title: '填写岗位信息' }, { title: '选择简历' }, { title: '准备完成' }]}
        />

        {/* Step 内容 */}
        {current === 0 && (
          <div className="mt-6 flex gap-6">
            {/* 左侧示例 */}
            <CollapsibleSidebar
              isCollapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
              title="示例岗位"
              className="h-[600px]"
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
                  <div className="text-sm text-slate-600 mb-1">岗位名称</div>
                  <Input
                    maxLength={200}
                    placeholder="请输入岗位名称"
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                    size="large"
                  />
                </div>
                <div>
                  <div className="text-sm text-slate-600 mb-1">岗位描述</div>
                  <TextArea
                    maxLength={5000}
                    placeholder="请描述岗位职责、任职要求等，AI 将根据描述生成模拟面试题与流程"
                    value={jobDesc}
                    onChange={(e) => setJobDesc(e.target.value)}
                    rows={20}
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
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                beforeUpload={(file) => {
                  const max = 10 * 1024 * 1024; // 10MB
                  const lower = (file.name || '').toLowerCase();
                  const okExt = ['.pdf', '.doc', '.docx'].some((ext) => lower.endsWith(ext));
                  if (!okExt) {
                    globalMessage.error('仅支持上传 PDF 或 Word（.pdf/.doc/.docx）');
                    return Upload.LIST_IGNORE as any;
                  }
                  if (file.size > max) {
                    globalMessage.error('文件大小不能超过 10MB');
                    return Upload.LIST_IGNORE as any;
                  }
                  setResumeMeta({ name: file.name, size: file.size, type: file.type });
                  if (!resumeText) {
                    setResumeText(
                      `已选择文件：${file.name}（${(file.size / 1024 / 1024).toFixed(2)}MB）\n如需参与后续 AI 处理，请将简历文本粘贴到下方输入框。`,
                    );
                  }
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
              <div className="text-sm text-slate-600 mb-1">简历文本</div>
              <TextArea
                maxLength={20000}
                rows={13}
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
        <div className="mt-8 flex items-center justify-between">
          <Button onClick={() => (current === 0 ? nav('/home') : handlePrev())}>
            {current === 0 ? '返回主页' : '上一步'}
          </Button>
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
            <div className="flex gap-3">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
