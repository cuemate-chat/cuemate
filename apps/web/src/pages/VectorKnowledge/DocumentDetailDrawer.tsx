import { useState } from 'react';
import { VectorDocument } from '../../api/vector';
import DrawerProvider, { DrawerContent, DrawerHeader } from '../../components/DrawerProvider';

interface DocumentDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  document: VectorDocument | null;
  relatedData: {
    jobs?: VectorDocument[];
    resumes?: VectorDocument[];
    questions?: VectorDocument[];
  } | null;
}

const DocumentDetailDrawer: React.FC<DocumentDetailDrawerProps> = ({
  open,
  onClose,
  document,
  relatedData
}) => {
  const [activeTab, setActiveTab] = useState('document');

  const getDocumentTypeLabel = (type: string): string => {
    switch (type) {
      case 'jobs':
        return '岗位信息';
      case 'resumes':
        return '简历信息';
      case 'questions':
        return '押题信息';
      default:
        return '文档';
    }
  };

  const formatDate = (timestamp?: number | string): string => {
    if (!timestamp) return '未知时间';
    if (typeof timestamp === 'string') {
      return timestamp;
    }
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const getSourceDisplayName = (source: string): string => {
    switch (source) {
      case 'job_description':
        return '岗位描述';
      case 'resume_content':
        return '简历内容';
      case 'interview_question':
        return '面试押题';
      default:
        return source;
    }
  };

  const getTypeDisplayName = (type: string): string => {
    switch (type) {
      case 'jobs':
        return '岗位';
      case 'resumes':
        return '简历';
      case 'questions':
        return '押题';
      default:
        return type;
    }
  };

  if (!document) {
    return null;
  }

  return (
    <DrawerProvider
      open={open}
      onClose={onClose}
      width="75%"
    >
      <DrawerHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1d4ed8]/20 rounded-full flex items-center justify-center">
            <span className="text-[#1d4ed8] text-lg font-semibold">
              {document.metadata.type === 'jobs' ? '岗' : 
               document.metadata.type === 'resumes' ? '简' : 
               document.metadata.type === 'questions' ? '题' : '文'}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#3b82f6]">
              {getDocumentTypeLabel(document.metadata.type)} - 详细信息
            </h3>
            <div className="text-sm text-[#3b82f6]/80">
              ID: {document.id}
            </div>
          </div>
        </div>
      </DrawerHeader>
      
      <DrawerContent>
        <div className="space-y-6">
          {/* 顶部标签 */}
          <div className="border-b border-gray-200 dark:border-slate-700">
            <nav className="-mb-px flex space-x-8">
              {(() => {
                const type = document.metadata.type;
                const tabs: { key: string; label: string }[] = [];
                if (type === 'jobs') {
                  tabs.push({ key: 'document', label: '岗位信息' });
                  tabs.push({
                    key: 'resumes',
                    label: `相关简历 (${relatedData?.resumes?.length || 0})`,
                  });
                  tabs.push({
                    key: 'questions',
                    label: `相关押题 (${relatedData?.questions?.length || 0})`,
                  });
                } else if (type === 'resumes') {
                  tabs.push({ key: 'document', label: '简历信息' });
                  tabs.push({
                    key: 'jobs',
                    label: `相关岗位 (${relatedData?.jobs?.length || 0})`,
                  });
                  tabs.push({
                    key: 'questions',
                    label: `相关押题 (${relatedData?.questions?.length || 0})`,
                  });
                } else if (type === 'questions') {
                  tabs.push({ key: 'document', label: '押题信息' });
                  tabs.push({
                    key: 'jobs',
                    label: `相关岗位 (${relatedData?.jobs?.length || 0})`,
                  });
                  tabs.push({
                    key: 'resumes',
                    label: `相关简历 (${relatedData?.resumes?.length || 0})`,
                  });
                } else {
                  tabs.push({ key: 'document', label: '文档信息' });
                }
                return tabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === t.key
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {t.label}
                  </button>
                ));
              })()}
            </nav>
          </div>

          {/* 标签页内容 */}
          {activeTab === 'document' && (
            <div className="space-y-4">
              {/* 文档基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="md:col-span-2">
                  <span className="font-medium text-gray-700 dark:text-slate-200">ID:</span>
                  <span className="ml-2 text-gray-900 dark:text-slate-100 break-all">{document.id}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-slate-200">类型:</span>
                  <span className="ml-2 text-gray-900 dark:text-slate-100">
                    {getTypeDisplayName(document.metadata.type || '')}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-slate-200">来源:</span>
                  <span className="ml-2 text-gray-900 dark:text-slate-100">
                    {getSourceDisplayName(document.metadata.source || '')}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-slate-200">创建时间:</span>
                  <span className="ml-2 text-gray-900 dark:text-slate-100">
                    {document.metadata.timestamp || document.metadata.createdAt
                      ? formatDate(
                          document.metadata.createdAt ||
                            document.metadata.timestamp,
                        )
                      : '未知'}
                  </span>
                </div>
                {document.metadata.title && (
                  <div className="md:col-span-2">
                    <span className="font-medium text-gray-700 dark:text-slate-200">标题:</span>
                    <span className="ml-2 text-gray-900 dark:text-slate-100">{document.metadata.title}</span>
                  </div>
                )}
                {document.metadata.tagName && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-slate-200">标签:</span>
                    <span className="ml-2 text-gray-900 dark:text-slate-100">{document.metadata.tagName}</span>
                  </div>
                )}
              </div>

              {/* 文档内容 */}
              <div>
                <div className="font-medium text-gray-700 dark:text-slate-200 mb-2">内容:</div>
                <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-md text-sm text-gray-900 dark:text-slate-100 whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {document.content}
                </div>
              </div>
            </div>
          )}

          {/* 相关简历标签页 */}
          {activeTab === 'resumes' && (
            <div className="space-y-4">
              {relatedData?.resumes && relatedData.resumes.length > 0 ? (
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">
                      {relatedData.resumes[0].metadata.title || '简历标题'}
                    </h4>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      ID: {relatedData.resumes[0].id}
                    </span>
                  </div>
                  <div className="p-4 text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {relatedData.resumes[0].content}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-slate-400 py-8">暂无相关简历信息</div>
              )}
            </div>
          )}

          {/* 相关押题标签页 */}
          {activeTab === 'questions' && (
            <div className="space-y-4">
              {relatedData?.questions && relatedData.questions.length > 0 ? (
                relatedData.questions.map((question, index) => (
                  <div key={question.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 relative">
                    {/* 左上角序号 */}
                    <div className="absolute left-0 top-0">
                      <div className="bg-blue-600 text-white text-[10px] font-semibold px-2 py-1 rounded-br">
                        {index + 1}
                      </div>
                      <div className="w-0 h-0 border-t-8 border-t-blue-700 border-r-8 border-r-transparent"></div>
                    </div>
                    <div className="flex justify-between items-start mb-2 ml-6">
                      <h4 className="font-medium text-gray-900 dark:text-slate-100">
                        {question.metadata.title || '押题标题'}
                      </h4>
                      <span className="text-xs text-gray-500 dark:text-slate-400">ID: {question.id}</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-slate-300 mb-2 ml-6">
                      {question.metadata.tagName && (
                        <span className="font-medium">标签: {question.metadata.tagName}</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-700 dark:text-slate-200 whitespace-pre-wrap max-h-80 overflow-y-auto ml-6">
                      {question.content}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 dark:text-slate-400 py-8">暂无相关押题信息</div>
              )}
            </div>
          )}

          {/* 相关岗位标签页 */}
          {activeTab === 'jobs' && (
            <div className="space-y-4">
              {relatedData?.jobs && relatedData.jobs.length > 0 ? (
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">
                      {relatedData.jobs[0].metadata.title || '岗位标题'}
                    </h4>
                    <span className="text-xs text-slate-500 dark:text-slate-400">ID: {relatedData.jobs[0].id}</span>
                  </div>
                  <div className="p-4 text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {relatedData.jobs[0].content}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-slate-400 py-8">暂无相关岗位信息</div>
              )}
            </div>
          )}
        </div>
      </DrawerContent>
    </DrawerProvider>
  );
};

export default DocumentDetailDrawer;