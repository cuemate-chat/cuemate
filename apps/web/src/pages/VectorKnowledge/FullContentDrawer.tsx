import { VectorDocument } from '../../api/vector';
import DrawerProvider, { DrawerContent, DrawerHeader } from '../../components/DrawerProvider';

interface FullContentDrawerProps {
  open: boolean;
  onClose: () => void;
  document: VectorDocument | null;
}

const FullContentDrawer: React.FC<FullContentDrawerProps> = ({
  open,
  onClose,
  document
}) => {
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

  const formatDate = (timestamp?: number | string): string => {
    if (!timestamp) return '未知时间';
    if (typeof timestamp === 'string') {
      return timestamp;
    }
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const getDocumentName = (doc: VectorDocument): string => {
    if (doc.metadata.title) return doc.metadata.title;
    if (doc.metadata.type === 'jobs') return '岗位名称';
    if (doc.metadata.type === 'resumes') return '简历名称';
    if (doc.metadata.type === 'questions') return '押题名称';
    return '文档名称';
  };

  if (!document) {
    return null;
  }

  return (
    <DrawerProvider
      open={open}
      onClose={onClose}
      width="60%"
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
              {getDocumentName(document)}
            </h3>
            <div className="text-sm text-[#3b82f6]/80">
              完整内容查看
            </div>
          </div>
        </div>
      </DrawerHeader>
      
      <DrawerContent>
        <div className="space-y-6">
          {/* 文档基本信息 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-700 dark:text-blue-300">来源:</span>
                <span className="ml-2 text-blue-900">
                  {getSourceDisplayName(document.metadata.source || '')}
                </span>
              </div>
              <div>
                <span className="font-medium text-blue-700 dark:text-blue-300">类型:</span>
                <span className="ml-2 text-blue-900">
                  {getTypeDisplayName(document.metadata.type || '')}
                </span>
              </div>
              <div>
                <span className="font-medium text-blue-700 dark:text-blue-300">创建时间:</span>
                <span className="ml-2 text-blue-900">
                  {formatDate(document.metadata.createdAt || document.metadata.timestamp)}
                </span>
              </div>
            </div>
          </div>

          {/* 完整内容 */}
          <div>
            <div className="font-medium text-gray-700 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              完整内容
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md text-sm text-gray-900 whitespace-pre-wrap min-h-[400px] max-h-[600px] overflow-y-auto border border-gray-200">
              {document.content}
            </div>
          </div>

          {/* 文档 ID */}
          <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 p-2 rounded border">
            <span className="font-medium">文档 ID:</span> {document.id}
          </div>
        </div>
      </DrawerContent>
    </DrawerProvider>
  );
};

export default FullContentDrawer;