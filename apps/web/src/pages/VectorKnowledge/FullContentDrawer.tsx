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
      case 'ai_vector_records':
        return 'AI 向量记录';
      default:
        return type;
    }
  };

  const getNoteTypeDisplayName = (noteType: string): string => {
    switch (noteType) {
      case 'mock':
        return '模拟面试';
      case 'training':
        return '面试训练';
      case 'voice_qa':
        return 'AI 提问';
      default:
        return noteType;
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
    if (doc.metadata.askedQuestion) return doc.metadata.askedQuestion;
    if (doc.metadata.title) return doc.metadata.title;
    if (doc.metadata.type === 'jobs') return '岗位名称';
    if (doc.metadata.type === 'resumes') return '简历名称';
    if (doc.metadata.type === 'questions') return '押题名称';
    return '文档名称';
  };

  const isAIVectorRecord = (doc: VectorDocument): boolean => {
    return doc.metadata.noteType === 'mock' ||
           doc.metadata.noteType === 'training' ||
           doc.metadata.noteType === 'voice_qa';
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
              {isAIVectorRecord(document) ? getNoteTypeDisplayName(document.metadata.noteType || '') : '完整内容查看'}
            </div>
          </div>
        </div>
      </DrawerHeader>
      
      <DrawerContent>
        {isAIVectorRecord(document) ? (
          /* AI 向量记录详情 */
          <div className="space-y-6">
            {/* 基本信息 */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-purple-700">类型:</span>
                  <span className="ml-2 text-purple-900">
                    {getNoteTypeDisplayName(document.metadata.noteType || '')}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-purple-700">创建时间:</span>
                  <span className="ml-2 text-purple-900">
                    {formatDate(document.metadata.createdAt)}
                  </span>
                </div>
                <div className="flex items-center min-w-0">
                  <span className="font-medium text-purple-700 flex-shrink-0">ID:</span>
                  <span className="ml-2 text-purple-900 text-xs truncate">{document.id}</span>
                </div>
              </div>
            </div>

            {/* 问题与回答 */}
            {document.metadata.askedQuestion && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200">
                <div className="font-medium text-blue-700 dark:text-blue-300 mb-2">提问问题</div>
                <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {document.metadata.askedQuestion}
                </div>
              </div>
            )}

            {document.metadata.candidateAnswer && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200">
                <div className="font-medium text-green-700 dark:text-green-300 mb-2">候选人回答</div>
                <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {document.metadata.candidateAnswer}
                </div>
              </div>
            )}

            {document.metadata.referenceAnswer && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200">
                <div className="font-medium text-indigo-700 dark:text-indigo-300 mb-2">AI 参考答案</div>
                <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {document.metadata.referenceAnswer}
                </div>
              </div>
            )}

            {/* 押题信息 */}
            {(document.metadata.question || document.metadata.answer) && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200">
                <div className="font-medium text-yellow-700 dark:text-yellow-300 mb-3">押题内容</div>
                {document.metadata.questionId && (
                  <div className="mb-2 text-xs text-gray-600">
                    <span className="font-medium">押题 ID:</span> {document.metadata.questionId}
                  </div>
                )}
                {document.metadata.question && (
                  <div className="mb-3">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">问题:</div>
                    <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                      {document.metadata.question}
                    </div>
                  </div>
                )}
                {document.metadata.answer && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">答案:</div>
                    <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                      {document.metadata.answer}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 其他文件内容 */}
            {document.metadata.otherContent && (
              <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-4 border border-teal-200">
                <div className="font-medium text-teal-700 dark:text-teal-300 mb-2">其他文件内容</div>
                {document.metadata.otherId && (
                  <div className="mb-2 text-xs text-gray-600">
                    <span className="font-medium">文件 ID:</span> {document.metadata.otherId}
                  </div>
                )}
                <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                  {document.metadata.otherContent}
                </div>
              </div>
            )}

            {/* 分析结果（仅 mock/training） */}
            {(document.metadata.pros || document.metadata.cons || document.metadata.suggestions || document.metadata.keyPoints || document.metadata.assessment) && (
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200">
                <div className="font-medium text-orange-700 dark:text-orange-300 mb-3">AI 分析结果</div>
                <div className="space-y-3">
                  {document.metadata.assessment && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">评价:</div>
                      <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                        {document.metadata.assessment}
                      </div>
                    </div>
                  )}
                  {document.metadata.pros && (
                    <div>
                      <div className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">优点:</div>
                      <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                        {document.metadata.pros}
                      </div>
                    </div>
                  )}
                  {document.metadata.cons && (
                    <div>
                      <div className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">缺点:</div>
                      <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                        {document.metadata.cons}
                      </div>
                    </div>
                  )}
                  {document.metadata.suggestions && (
                    <div>
                      <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">建议:</div>
                      <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                        {document.metadata.suggestions}
                      </div>
                    </div>
                  )}
                  {document.metadata.keyPoints && (
                    <div>
                      <div className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">考察点:</div>
                      <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                        {document.metadata.keyPoints}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 关联 ID */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200">
              <div className="font-medium text-gray-700 dark:text-gray-300 mb-3">关联 ID</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-600 dark:text-gray-400">
                {document.metadata.resourceId && (
                  <div>
                    <span className="font-medium">资源 ID:</span>
                    <span className="ml-2 font-mono">{document.metadata.resourceId}</span>
                  </div>
                )}
                {document.metadata.interviewId && (
                  <div>
                    <span className="font-medium">
                      {document.metadata.noteType === 'voice_qa' ? '对话 ID:' : '面试 ID:'}
                    </span>
                    <span className="ml-2 font-mono">{document.metadata.interviewId}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* 普通文档详情 */
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
        )}
      </DrawerContent>
    </DrawerProvider>
  );
};

export default FullContentDrawer;