import DrawerProvider, { DrawerContent, DrawerHeader } from '../../components/DrawerProvider';
import { LightbulbIcon } from '../../components/Icons';

interface SyncJobsDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  syncJobs: Array<{ id: string; title: string }>;
  questionTitle: string;
}

export default function SyncJobsDetailDrawer({
  open,
  onClose,
  syncJobs,
  questionTitle
}: SyncJobsDetailDrawerProps) {
  return (
    <DrawerProvider
      open={open}
      onClose={onClose}
      width="60%"
    >
      <DrawerHeader>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" clipRule="evenodd" />
            </svg>
          </div>
          <span>同步岗位详情</span>
        </div>
      </DrawerHeader>

      <DrawerContent>
        <div className="space-y-6">
          {/* 题目信息 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="text-sm text-blue-700 mb-2 font-medium">题目内容</div>
            <div className="text-slate-800 text-sm leading-relaxed line-clamp-3">
              {questionTitle}
            </div>
          </div>

          {/* 同步统计 */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-green-800 font-medium">同步状态</span>
              </div>
              <span className="text-green-600 font-semibold">
                已同步到 {syncJobs.length} 个岗位
              </span>
            </div>
          </div>

          {/* 岗位列表 */}
          <div>
            <div className="text-sm text-slate-700 mb-3 font-medium">同步岗位列表</div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {syncJobs.map((job, index) => (
                <div 
                  key={job.id} 
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors duration-200"
                >
                  {/* 序号 */}
                  <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {index + 1}
                  </div>
                  
                  {/* 岗位信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-800 font-medium truncate">{job.title}</div>
                    <div className="text-xs text-slate-500">ID: {job.id}</div>
                  </div>
                  
                  {/* 状态图标 */}
                  <div className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 底部说明 */}
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <div className="text-xs text-slate-600 text-center">
              <LightbulbIcon className="w-4 h-4 inline mr-1" />
              此题目已成功同步到上述岗位的面试题库中，面试官可以在对应岗位的面试押题中查看和使用
            </div>
          </div>
        </div>
      </DrawerContent>
    </DrawerProvider>
  );
}
