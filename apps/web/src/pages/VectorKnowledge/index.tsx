import { CloseOutlined, FilterOutlined, SearchOutlined } from '@ant-design/icons';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { FileText, File, FileCode } from 'lucide-react';
import { Input, Modal, Select } from 'antd';
import { useEffect, useState } from 'react';
import { listTags } from '../../api/questions';
import {
  SearchFilters,
  VectorDocument,
  deleteDocument,
  deleteJob,
  deleteQuestion,
  deleteOtherFile,
  getRelatedDocuments,
  listOtherFiles,
  searchJobs,
  searchQuestions,
  searchResumes,
  uploadOtherFile,
  addOtherFileText,
  listAIVectorRecords,
  deleteAIVectorRecord
} from '../../api/vector';
import { WarningIcon } from '../../components/Icons';
import { message } from '../../components/Message';
import PageLoading from '../../components/PageLoading';
import { useLoading } from '../../hooks/useLoading';
import DocumentDetailDrawer from './DocumentDetailDrawer';
import FullContentDrawer from './FullContentDrawer';
import UploadedResumeDrawer from '../JobsList/UploadedResumeDrawer';

export default function VectorKnowledge() {
  const [searchResults, setSearchResults] = useState<VectorDocument[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const { loading, start: startLoading, end: endLoading } = useLoading();
  const [showFilters, setShowFilters] = useState(false);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  // 相关度最低阈值（百分比）。0 表示 >0%，10 表示 >10% ... 100 表示 =100%
  const [minScorePercent, setMinScorePercent] = useState<number>(0);
  const [filters, setFilters] = useState<SearchFilters>({
    type: 'all',
    query: '',
    tagId: undefined,
    jobTitle: undefined,
    jobDescription: undefined,
    resumeTitle: undefined,
    resumeDescription: undefined,
    questionTitle: undefined,
    questionDescription: undefined,
    createdFrom: undefined,
    createdTo: undefined,
  });
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [currentDetailDoc, setCurrentDetailDoc] = useState<VectorDocument | null>(null);
  const [relatedData, setRelatedData] = useState<{
    jobs?: VectorDocument[];
    resumes?: VectorDocument[];
    questions?: VectorDocument[];
  } | null>(null);
  const [currentTab, setCurrentTab] = useState('jobs'); // 控制主标签页：jobs, resumes, questions, sync-status

  // FullContentDrawer 状态管理
  const [fullContentDrawerVisible, setFullContentDrawerVisible] = useState(false);
  const [currentFullContentDoc, setCurrentFullContentDoc] = useState<VectorDocument | null>(null);

  // UploadedResumeDrawer 状态管理
  const [uploadedResumeVisible, setUploadedResumeVisible] = useState(false);
  const [currentResumeFilePath, setCurrentResumeFilePath] = useState<string | undefined>(undefined);
  const [currentResumeTitle, setCurrentResumeTitle] = useState<string | undefined>(undefined);

  // 同步和清空的加载状态
  const { loading: syncLoading, start: startSync, end: endSync } = useLoading();
  const { loading: cleanLoading, start: startClean, end: endClean } = useLoading();

  // 其他文件页面状态
  const [otherFiles, setOtherFiles] = useState<VectorDocument[]>([]);
  const [otherFileText, setOtherFileText] = useState('');
  const [otherFileTitle, setOtherFileTitle] = useState('');
  const [otherFilesSearchQuery, setOtherFilesSearchQuery] = useState(''); // 搜索框
  const { loading: uploadLoading, start: startUpload, end: endUpload } = useLoading();

  // AI 向量记录页面状态
  const [aiVectorRecords, setAiVectorRecords] = useState<VectorDocument[]>([]);
  const [aiVectorSearchQuery, setAiVectorSearchQuery] = useState(''); // 搜索框

  // 获取标签列表和默认加载所有内容
  useEffect(() => {
    fetchTags();
    if (currentTab !== 'sync-status' && currentTab !== 'other-files' && currentTab !== 'ai-vector-records') {
      loadDocumentsByTab();
    } else if (currentTab === 'other-files') {
      loadOtherFilesList();
    } else if (currentTab === 'ai-vector-records') {
      loadAIVectorRecordsList();
    }
  }, [currentTab]); // 当标签页切换时重新加载数据

  // 根据当前标签页加载对应数据
  const loadDocumentsByTab = async () => {
    try {
      startLoading();
      let result;

      // 根据当前标签页调用不同的搜索函数，同时应用当前筛选条件
      if (currentTab === 'jobs') {
        result = await searchJobs({ ...filters, query: '' });
      } else if (currentTab === 'resumes') {
        result = await searchResumes({ ...filters, query: '' });
      } else if (currentTab === 'questions') {
        result = await searchQuestions({ ...filters, query: '' });
      } else {
        result = await searchJobs({ ...filters, query: '' });
      }

      if (result.success) {
        // 当加载所有数据时（query为空），不过滤 score
        const list = (result.results || []).filter((doc: any) => {
          // 没有查询关键词时，显示所有文档
          const s = Number((doc as any).score) || 0;
          // 如果 score 为 0，说明是直接获取的文档（getAllDocuments），不过滤
          if (s === 0) return true;
          // 如果有 score，则根据阈值过滤
          return minScorePercent === 100 ? s >= 1 : s > minScorePercent / 100;
        });
        // 为每个文档添加相关数量信息
        const enrichedList = await Promise.all(
          list.map(async (doc) => {
            try {
              const relatedResult = await getRelatedDocuments(doc.id, doc.metadata.type);
              if (relatedResult.success && relatedResult.related) {
                // 从关联数据推断岗位/简历标题
                const firstJob = relatedResult.related.jobs?.[0];
                const firstResume = relatedResult.related.resumes?.[0];
                return {
                  ...doc,
                  metadata: {
                    ...doc.metadata,
                    relatedJobs: relatedResult.related.jobs?.length || 0,
                    relatedResumes: relatedResult.related.resumes?.length || 0,
                    relatedQuestions: relatedResult.related.questions?.length || 0,
                    jobTitle: firstJob?.metadata?.title,
                    resumeTitle: firstResume?.metadata?.title,
                  }
                };
              }
            } catch (error) {
              console.error('获取相关文档失败:', error);
            }
            return doc;
          })
        );
        setSearchResults(enrichedList);
        setTotalResults(enrichedList.length);
      } else {
        setSearchResults([]);
        setTotalResults(0);
      }
    } catch (error) {
      console.error('搜索出错:', error);
      setSearchResults([]);
      setTotalResults(0);
    } finally {
      await endLoading();
    }
  };

  // 标签页切换处理
  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    if (tab !== 'sync-status') {
      // 切换标签页时重置筛选条件
      setFilters({
        type: 'all',
        query: '',
        tagId: undefined,
        jobTitle: undefined,
        jobDescription: undefined,
        resumeTitle: undefined,
        resumeDescription: undefined,
        questionTitle: undefined,
        questionDescription: undefined,
        createdFrom: undefined,
        createdTo: undefined,
      });
      // 清空搜索结果
      setSearchResults([]);
      setTotalResults(0);
    }
  };

  const fetchTags = async () => {
    try {
      const data = await listTags();
      setTags(data.items || []);
    } catch (error) {
      console.error('获取标签失败:', error);
    }
  };

  // 加载其他文件列表
  const loadOtherFilesList = async () => {
    try {
      startLoading();
      const result = await listOtherFiles();
      if (result.success) {
        setOtherFiles(result.results || []);
      } else {
        message.error(result.error || '加载文件列表失败');
      }
    } catch (error: any) {
      message.error(error.message || '加载文件列表失败');
    } finally {
      await endLoading();
    }
  };

  // 加载 AI 向量记录列表
  const loadAIVectorRecordsList = async () => {
    try {
      startLoading();
      const result = await listAIVectorRecords({ query: aiVectorSearchQuery });
      if (result.success) {
        setAiVectorRecords(result.results || []);
      } else {
        message.error(result.error || '加载 AI 向量记录失败');
      }
    } catch (error: any) {
      message.error(error.message || '加载 AI 向量记录失败');
    } finally {
      await endLoading();
    }
  };

  // 处理文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      startUpload();
      const result = await uploadOtherFile(file);
      if (result.success) {
        message.success(result.message || '文件上传成功');
        await loadOtherFilesList();
        // 重置文件输入
        event.target.value = '';
      } else {
        message.error(result.error || '文件上传失败');
      }
    } catch (error: any) {
      message.error(error.message || '文件上传失败');
    } finally {
      await endUpload();
    }
  };

  // 处理文本内容提交
  const handleTextSubmit = async () => {
    if (!otherFileText.trim()) {
      message.error('请输入文本内容');
      return;
    }

    try {
      startUpload();
      const result = await addOtherFileText(
        otherFileTitle.trim() || '未命名文档',
        otherFileText.trim()
      );
      if (result.success) {
        message.success(result.message || '内容添加成功');
        await loadOtherFilesList();
        // 清空表单
        setOtherFileText('');
        setOtherFileTitle('');
      } else {
        message.error(result.error || '内容添加失败');
      }
    } catch (error: any) {
      message.error(error.message || '内容添加失败');
    } finally {
      await endUpload();
    }
  };

  // 根据文件路径或标题获取文件类型图标和标签
  const getFileTypeInfo = (doc: VectorDocument) => {
    const filePath = doc.metadata.filePath || doc.metadata.title || '';
    const lowerPath = filePath.toLowerCase();

    if (lowerPath.endsWith('.pdf')) {
      return {
        icon: <FileText className="w-5 h-5 text-red-500" />,
        label: 'PDF',
        color: 'text-red-500 bg-red-50 dark:bg-red-900/20'
      };
    } else if (lowerPath.endsWith('.md') || lowerPath.endsWith('.markdown')) {
      return {
        icon: <FileCode className="w-5 h-5 text-blue-500" />,
        label: 'MD',
        color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20'
      };
    } else if (lowerPath.endsWith('.doc') || lowerPath.endsWith('.docx')) {
      return {
        icon: <FileText className="w-5 h-5 text-blue-600" />,
        label: 'DOCX',
        color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
      };
    } else if (lowerPath.endsWith('.txt')) {
      return {
        icon: <File className="w-5 h-5 text-slate-500" />,
        label: 'TXT',
        color: 'text-slate-500 bg-slate-50 dark:bg-slate-700'
      };
    } else {
      // 默认文本类型
      return {
        icon: <FileText className="w-5 h-5 text-slate-400" />,
        label: '文本',
        color: 'text-slate-400 bg-slate-50 dark:bg-slate-700'
      };
    }
  };

  // 删除其他文件
  const handleDeleteOtherFile = async (docId: string, title: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除文件 "${title}" 吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          const result = await deleteOtherFile(docId);
          if (result.success) {
            message.success('删除成功');
            await loadOtherFilesList();
          } else {
            message.error(result.error || '删除失败');
          }
        } catch (error: any) {
          message.error(error.message || '删除失败');
        }
      },
    });
  };

  // 删除 AI 向量记录
  const handleDeleteAIVectorRecord = async (docId: string, question: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除记录 "${question}" 吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          const result = await deleteAIVectorRecord(docId);
          if (result.success) {
            message.success('删除成功');
            await loadAIVectorRecordsList();
          } else {
            message.error(result.error || '删除失败');
          }
        } catch (error: any) {
          message.error(error.message || '删除失败');
        }
      },
    });
  };

  // 搜索文档（支持传入局部覆盖，便于在交互事件里立刻生效）
  const searchDocuments = async (overrides?: Partial<SearchFilters>) => {
    try {
      startLoading();
      let result;
      const finalFilters: SearchFilters = overrides ? { ...filters, ...overrides } : filters;
      if (overrides) {
        setFilters(finalFilters);
      }

      // 根据当前标签页调用不同的搜索函数，同时应用搜索关键词和筛选条件
      if (currentTab === 'jobs') {
        result = await searchJobs(finalFilters);
      } else if (currentTab === 'resumes') {
        result = await searchResumes(finalFilters);
      } else if (currentTab === 'questions') {
        result = await searchQuestions(finalFilters);
      } else {
        result = await searchJobs(finalFilters);
      }

      if (result.success) {
        // 判断是否有搜索关键词
        const hasQuery = finalFilters.query && finalFilters.query.trim().length > 0;
        const list = (result.results || []).filter((doc: any) => {
          const s = Number((doc as any).score) || 0;
          // 如果没有搜索关键词或 score 为 0，显示所有文档
          if (!hasQuery || s === 0) return true;
          // 如果有搜索关键词且有 score，则根据阈值过滤
          return minScorePercent === 100 ? s >= 1 : s > minScorePercent / 100;
        });
        // 为每个文档添加相关数量信息
        const enrichedList = await Promise.all(
          list.map(async (doc) => {
            try {
              const relatedResult = await getRelatedDocuments(doc.id, doc.metadata.type);
              if (relatedResult.success && relatedResult.related) {
                const firstJob = relatedResult.related.jobs?.[0];
                const firstResume = relatedResult.related.resumes?.[0];
                return {
                  ...doc,
                  metadata: {
                    ...doc.metadata,
                    relatedJobs: relatedResult.related.jobs?.length || 0,
                    relatedResumes: relatedResult.related.resumes?.length || 0,
                    relatedQuestions: relatedResult.related.questions?.length || 0,
                    jobTitle: firstJob?.metadata?.title,
                    resumeTitle: firstResume?.metadata?.title,
                  }
                };
              }
            } catch (error) {
              message.error('获取相关文档失败:' + error);
            }
            return doc;
          })
        );
        setSearchResults(enrichedList);
        setTotalResults(enrichedList.length);
      } else {
        setSearchResults([]);
        setTotalResults(0);
        message.error('搜索失败:' + result.error);
      }
    } catch (error) {
      message.error('搜索出错:' + error);
      setSearchResults([]);
      setTotalResults(0);
    } finally {
      await endLoading();
    }
  };

  // 清除筛选条件
  const clearFilters = () => {
    const newFilters: SearchFilters = {
      type: 'all',
      query: '',
      tagId: undefined,
      jobTitle: undefined,
      jobDescription: undefined,
      resumeTitle: undefined,
      resumeDescription: undefined,
      questionTitle: undefined,
      questionDescription: undefined,
      createdFrom: undefined,
      createdTo: undefined,
    };
    setFilters(newFilters);
    // 重置相关度为默认 >0%
    setMinScorePercent(0);
    // 清除筛选后立即搜索
    searchDocuments(newFilters);
  };

  const getDocumentName = (doc: VectorDocument): string => {
    if (doc.metadata.title) return doc.metadata.title;
    if (doc.metadata.type === 'jobs') return '岗位名称';
    if (doc.metadata.type === 'resumes') return '简历名称';
    if (doc.metadata.type === 'questions') return '押题名称';
    return '文档名称';
  };

  const showDetail = async (doc: VectorDocument) => {
    setCurrentDetailDoc(doc);
    setDetailDrawerVisible(true);
    setRelatedData(null);

    try {
      // 获取关联信息
      const result = await getRelatedDocuments(
        doc.id,
        doc.metadata.type === 'jobs'
          ? 'jobs'
          : doc.metadata.type === 'questions'
            ? 'questions'
            : doc.metadata.type === 'resumes'
              ? 'resumes'
              : 'default',
      );

      if (result.success && result.related) {
        setRelatedData(result.related);
      } else {
        // 即使没有关联数据，也要设置一个空的结构
        setRelatedData({
          jobs: doc.metadata.type === 'jobs' ? [doc] : [],
          resumes: doc.metadata.type === 'resumes' ? [doc] : [],
          questions: doc.metadata.type === 'questions' ? [doc] : [],
        });
      }
    } catch (error) {
      console.error('获取关联信息失败:', error);
      // 设置默认的关联数据结构
      setRelatedData({
        jobs: doc.metadata.type === 'jobs' ? [doc] : [],
        resumes: doc.metadata.type === 'resumes' ? [doc] : [],
        questions: doc.metadata.type === 'questions' ? [doc] : [],
      });
    }
  };

  const handleDelete = async (doc: VectorDocument) => {
    const getTypeName = (type: string) => {
      if (type === 'jobs') return '岗位';
      if (type === 'questions') return '押题';
      if (type === 'resumes') return '简历';
      return '数据';
    };

    Modal.confirm({
      title: '确认删除',
      content: (
        <div>
          <p>确定要删除以下向量数据吗？删除后无法恢复。</p>
          <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <div className="space-y-1">
              <div><span className="font-medium">数据类型：</span>{getTypeName(doc.metadata.type)}</div>
              {doc.metadata.title && (
                <div><span className="font-medium">标题：</span>{doc.metadata.title}</div>
              )}
              <div><span className="font-medium">文档 ID：</span><span className="text-xs">{doc.id}</span></div>
            </div>
          </div>
        </div>
      ),
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        startLoading();
        try {
          let result;

          // 根据文档类型调用相应的删除 API
          if (doc.metadata.type === 'jobs') {
            result = await deleteJob(doc.id);
          } else if (doc.metadata.type === 'questions') {
            result = await deleteQuestion(doc.id);
          } else {
            result = await deleteDocument(doc.id, doc.metadata.type);
          }

          if (result.success) {
            // 从本地状态中移除
            setSearchResults((prev) => prev.filter((d) => d.id !== doc.id));
            setTotalResults((prev) => prev - 1);
            message.success('删除成功');
          } else {
            message.error('删除失败: ' + result.error);
          }
        } catch (error) {
          message.error('删除失败: ' + error);
        } finally {
          await endLoading();
        }
      },
    });
  };

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

  return (
    <div className="space-y-6 p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">向量知识库</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">查询和检索存储在向量数据库中的知识内容</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                loadDocumentsByTab();
                message.success('已刷新向量数据列表');
              }}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/70 hover:border-blue-300 dark:hover:border-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>
        </div>

        {/* 主标签页 */}
        <div className="border-b border-gray-200 dark:border-slate-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => handleTabChange('jobs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                currentTab === 'jobs'
                  ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'
              }`}
            >
              岗位信息
            </button>
            <button
              onClick={() => handleTabChange('resumes')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                currentTab === 'resumes'
                  ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'
              }`}
            >
              简历信息
            </button>
            <button
              onClick={() => handleTabChange('questions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                currentTab === 'questions'
                  ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'
              }`}
            >
              面试押题
            </button>
            <button
              onClick={() => handleTabChange('sync-status')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                currentTab === 'sync-status'
                  ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'
              }`}
            >
              同步状态
            </button>
            <button
              onClick={() => handleTabChange('other-files')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                currentTab === 'other-files'
                  ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'
              }`}
            >
              其他文件
            </button>
            <button
              onClick={() => handleTabChange('ai-vector-records')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                currentTab === 'ai-vector-records'
                  ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'
              }`}
            >
              AI 向量记录
            </button>
          </nav>
        </div>

        {/* 同步状态页面 */}
        {currentTab === 'sync-status' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">数据同步状态</h2>
            </div>

            <SyncStatusOverview
              onSyncStart={startSync}
              onSyncEnd={endSync}
              onCleanStart={startClean}
              onCleanEnd={endClean}
            />
          </div>
        )}

        {/* 其他文件页面 */}
        {currentTab === 'other-files' && (
          <div className="space-y-6">
            {/* 上传区域 */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">上传文件或输入内容</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  上传项目文件或直接输入文本内容，系统将自动提取并存储到向量知识库中，方便后续检索。
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 文件上传 */}
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                  <div className="text-gray-400 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                    上传文件
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    支持 PDF、TXT、DOCX、MD 等格式
                  </p>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".pdf,.txt,.docx,.md,.doc"
                    onChange={handleFileUpload}
                    disabled={uploadLoading}
                  />
                  <label
                    htmlFor="file-upload"
                    className={`inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 ${uploadLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {uploadLoading ? '上传中...' : '选择文件'}
                  </label>
                </div>

                {/* 文本输入 */}
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                    输入文本内容
                  </h3>
                  <Input.TextArea
                    rows={6}
                    placeholder="在此输入文本内容，可以是项目需求、技术文档、面试问题等..."
                    className="mb-4 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600"
                    value={otherFileText}
                    onChange={(e) => setOtherFileText(e.target.value)}
                    disabled={uploadLoading}
                  />
                  <Input
                    placeholder="文件标题（可选）"
                    className="mb-4 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600"
                    value={otherFileTitle}
                    onChange={(e) => setOtherFileTitle(e.target.value)}
                    disabled={uploadLoading}
                  />
                  <button
                    onClick={handleTextSubmit}
                    disabled={uploadLoading || !otherFileText.trim()}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadLoading ? '添加中...' : '添加到知识库'}
                  </button>
                </div>
              </div>
            </div>

            {/* 已上传文件列表 */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                  已上传的文件 ({otherFiles.filter(doc =>
                    !otherFilesSearchQuery ||
                    (doc.metadata.title || '').toLowerCase().includes(otherFilesSearchQuery.toLowerCase()) ||
                    doc.content.toLowerCase().includes(otherFilesSearchQuery.toLowerCase())
                  ).length})
                </h3>
                <div className="flex items-center gap-3">
                  {/* 搜索框 */}
                  {otherFiles.length > 0 && (
                    <Input
                      placeholder="搜索文件名或内容..."
                      value={otherFilesSearchQuery}
                      onChange={(e) => setOtherFilesSearchQuery(e.target.value)}
                      allowClear
                      prefix={<SearchOutlined className="text-slate-400" />}
                      className="w-64"
                    />
                  )}
                  {/* 刷新按钮 */}
                  {otherFiles.length > 0 && (
                    <button
                      onClick={loadOtherFilesList}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <ArrowPathIcon className="w-4 h-4" />
                      刷新
                    </button>
                  )}
                </div>
              </div>

              {(() => {
                if (loading) {
                  return (
                    <div className="text-center py-12">
                      <PageLoading tip="加载中..." />
                    </div>
                  );
                }

                if (otherFiles.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                      暂无上传文件
                    </div>
                  );
                }

                const filteredFiles = otherFiles.filter(doc =>
                  !otherFilesSearchQuery ||
                  (doc.metadata.title || '').toLowerCase().includes(otherFilesSearchQuery.toLowerCase()) ||
                  doc.content.toLowerCase().includes(otherFilesSearchQuery.toLowerCase())
                );

                if (filteredFiles.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                      未找到匹配的文件
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {filteredFiles.map((doc, index) => (
                    <div
                      key={doc.id}
                      className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-blue-400 dark:hover:border-blue-500 transition-colors relative"
                    >
                      {/* 左上角序号 */}
                      <div className="absolute left-0 top-0">
                        <div className="bg-blue-600 text-white text-[10px] font-semibold px-2 py-1 rounded-br">
                          {index + 1}
                        </div>
                        <div className="w-0 h-0 border-t-8 border-t-blue-700 border-r-8 border-r-transparent"></div>
                      </div>

                      <div className="flex items-start gap-4 ml-8">
                        {/* 文件类型图标 + 标签 */}
                        <div className="flex-shrink-0 flex flex-col items-center gap-1">
                          <div className={`w-12 h-12 rounded-lg ${getFileTypeInfo(doc).color} flex items-center justify-center`}>
                            {getFileTypeInfo(doc).icon}
                          </div>
                          <span className={`text-[10px] font-medium ${getFileTypeInfo(doc).color.split(' ')[0]}`}>
                            {getFileTypeInfo(doc).label}
                          </span>
                        </div>

                        {/* 内容 */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {doc.metadata.title || '未命名文档'}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {doc.content}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                            <span>
                              创建时间: {doc.metadata.createdAt ? new Date(doc.metadata.createdAt).toLocaleString('zh-CN') : '未知'}
                            </span>
                            <span>ID: {doc.id.slice(0, 12)}...</span>
                          </div>
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex-shrink-0 flex items-center gap-2">
                          <button
                            onClick={() => {
                              // 使用文件预览（PDF/DOCX），而不是显示纯文本
                              const filePath = doc.metadata.filePath;
                              if (filePath) {
                                setCurrentResumeFilePath(filePath);
                                setCurrentResumeTitle(doc.metadata.title || '未命名文档');
                                setUploadedResumeVisible(true);
                              } else {
                                // 兜底：如果没有文件路径，显示纯文本内容
                                setCurrentFullContentDoc(doc);
                                setFullContentDrawerVisible(true);
                              }
                            }}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            查看
                          </button>
                          <button
                            onClick={() => handleDeleteOtherFile(doc.id, doc.metadata.title || '未命名文档')}
                            className="text-sm text-red-600 dark:text-red-400 hover:underline"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* AI 向量记录页面 */}
        {currentTab === 'ai-vector-records' && (
          <div className="space-y-6">
            {/* 搜索区域 */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex gap-4">
                <Input
                  placeholder="搜索 AI 向量记录..."
                  value={aiVectorSearchQuery}
                  onChange={(e) => setAiVectorSearchQuery(e.target.value)}
                  onPressEnter={loadAIVectorRecordsList}
                  prefix={<SearchOutlined />}
                  className="flex-1"
                />
                <button
                  onClick={loadAIVectorRecordsList}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  搜索
                </button>
              </div>
            </div>

            {/* 记录列表 */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              {(() => {
                const groupedRecords: { [key: string]: VectorDocument[] } = {};
                aiVectorRecords.forEach((record) => {
                  const noteType = record.metadata.note_type || 'unknown';
                  if (!groupedRecords[noteType]) {
                    groupedRecords[noteType] = [];
                  }
                  groupedRecords[noteType].push(record);
                });

                const typeLabels: { [key: string]: string } = {
                  mock: '模拟面试',
                  training: '面试训练',
                };

                return Object.entries(groupedRecords).map(([noteType, records]) => (
                  <div key={noteType} className="border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                    <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50">
                      <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                        {typeLabels[noteType] || noteType} ({records.length})
                      </h3>
                    </div>
                    <div className="divide-y divide-slate-200 dark:divide-slate-700">
                      {records.map((record) => (
                        <div key={record.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <div className="space-y-3">
                            {/* 问题 */}
                            {record.metadata.asked_question && (
                              <div>
                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">问题：</span>
                                <p className="mt-1 text-slate-900 dark:text-slate-100">{record.metadata.asked_question}</p>
                              </div>
                            )}
                            {/* 用户回答 */}
                            {record.metadata.candidate_answer && (
                              <div>
                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">回答：</span>
                                <p className="mt-1 text-slate-700 dark:text-slate-300">{record.metadata.candidate_answer}</p>
                              </div>
                            )}
                            {/* 押题答案 */}
                            {record.metadata.answer && (
                              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">使用了押题答案</span>
                                <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">{record.metadata.answer.substring(0, 200)}...</p>
                              </div>
                            )}
                            {/* 其他文件 */}
                            {record.metadata.other_content && (
                              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                                <span className="text-sm font-medium text-green-700 dark:text-green-300">使用了其他文件</span>
                                <p className="mt-1 text-sm text-green-600 dark:text-green-400">{record.metadata.other_content.substring(0, 200)}...</p>
                              </div>
                            )}
                            {/* 时间和操作 */}
                            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-600">
                              <span className="text-sm text-slate-500 dark:text-slate-400">
                                {new Date((record.metadata.created_at || 0) * 1000).toLocaleString('zh-CN')}
                              </span>
                              <button
                                onClick={() => handleDeleteAIVectorRecord(record.id, record.metadata.asked_question || '未命名问题')}
                                className="text-sm text-red-600 dark:text-red-400 hover:underline"
                              >
                                删除
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}

              {/* 空状态 */}
              {aiVectorRecords.length === 0 && !loading && (
                <div className="text-center py-12">
                  <SearchOutlined className="mx-auto text-6xl text-slate-400 dark:text-slate-500" />
                  <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">暂无 AI 向量记录</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">使用押题或其他文件生成答案后会自动保存</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 搜索区域 - 只在岗位/简历/押题页面显示 */}
        {currentTab !== 'sync-status' && currentTab !== 'other-files' && currentTab !== 'ai-vector-records' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* 搜索输入框 */}
              <div className="flex-1">
                <div className="relative">
                  <SearchOutlined className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    placeholder="输入关键词搜索知识内容..."
                    value={filters.query}
                    onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                    className="w-full pl-10 pr-12 py-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                    onKeyPress={(e) => e.key === 'Enter' && searchDocuments()}
                  />
                  {filters.query && (
                    <button
                      onClick={() => searchDocuments({ query: '' })}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <CloseOutlined />
                    </button>
                  )}
                </div>
              </div>

              {/* 搜索按钮 */}
              <button
                onClick={searchDocuments}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    搜索中...
                  </>
                ) : (
                  <>
                    <SearchOutlined />
                    搜索
                  </>
                )}
              </button>

              {/* 筛选按钮 */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-3 border rounded-lg flex items-center gap-2 ${
                  showFilters
                    ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50'
                    : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <FilterOutlined />
                筛选
              </button>
            </div>

            {/* 筛选条件 */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <div className={`grid grid-cols-1 ${currentTab === 'questions' ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
                  {/* 相关度阈值 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">相关度</label>
                    <Select
                      value={minScorePercent}
                      onChange={(value) => {
                        const v = value === undefined || value === null ? 0 : (value as number);
                        setMinScorePercent(v);
                        // 选择或清除后立即应用到当前结果（清除视为重置为 >0%）
                        searchDocuments({});
                      }}
                      allowClear
                      style={{ height: '42px', width: '100%' }}
                    >
                      <Select.Option value={0}>{'>0%（默认）'}</Select.Option>
                      <Select.Option value={10}>{'>10%'}</Select.Option>
                      <Select.Option value={20}>{'>20%'}</Select.Option>
                      <Select.Option value={30}>{'>30%'}</Select.Option>
                      <Select.Option value={40}>{'>40%'}</Select.Option>
                      <Select.Option value={50}>{'>50%'}</Select.Option>
                      <Select.Option value={60}>{'>60%'}</Select.Option>
                      <Select.Option value={70}>{'>70%'}</Select.Option>
                      <Select.Option value={80}>{'>80%'}</Select.Option>
                      <Select.Option value={90}>{'>90%'}</Select.Option>
                      <Select.Option value={100}>{'=100%'}</Select.Option>
                    </Select>
                  </div>
                  {/* 根据当前标签页显示不同的筛选字段 */}
                  {currentTab === 'jobs' && (
                    <>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                          创建时间
                        </label>
                        <div className="flex gap-2">
                          <Input
                            type="date"
                            value={
                              filters.createdFrom
                                ? new Date(filters.createdFrom).toISOString().slice(0, 10)
                                : ''
                            }
                            onChange={(e) => {
                              const ts = e.target.value
                                ? new Date(e.target.value + 'T00:00:00').getTime()
                                : undefined;
                              searchDocuments({ createdFrom: ts });
                            }}
                            style={{ height: '42px' }}
                            className="dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600"
                          />
                          <Input
                            type="date"
                            value={
                              filters.createdTo
                                ? new Date(filters.createdTo).toISOString().slice(0, 10)
                                : ''
                            }
                            onChange={(e) => {
                              const ts = e.target.value
                                ? new Date(e.target.value + 'T23:59:59').getTime()
                                : undefined;
                              searchDocuments({ createdTo: ts });
                            }}
                            style={{ height: '42px' }}
                            className="dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {currentTab === 'resumes' && (
                    <>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                          创建时间
                        </label>
                        <div className="flex gap-2">
                          <Input
                            type="date"
                            value={
                              filters.createdFrom
                                ? new Date(filters.createdFrom).toISOString().slice(0, 10)
                                : ''
                            }
                            onChange={(e) => {
                              const ts = e.target.value
                                ? new Date(e.target.value + 'T00:00:00').getTime()
                                : undefined;
                              searchDocuments({ createdFrom: ts });
                            }}
                            style={{ height: '42px' }}
                            className="dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600"
                          />
                          <Input
                            type="date"
                            value={
                              filters.createdTo
                                ? new Date(filters.createdTo).toISOString().slice(0, 10)
                                : ''
                            }
                            onChange={(e) => {
                              const ts = e.target.value
                                ? new Date(e.target.value + 'T23:59:59').getTime()
                                : undefined;
                              searchDocuments({ createdTo: ts });
                            }}
                            style={{ height: '42px' }}
                            className="dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {currentTab === 'questions' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">押题标签</label>
                        <Select
                          value={filters.tagId}
                          onChange={(value) => searchDocuments({ tagId: value })}
                          allowClear
                          placeholder="选择标签"
                          style={{ height: '42px', width: '100%' }}
                        >
                          {tags.map((tag) => (
                            <Select.Option key={tag.id} value={tag.id}>
                              {tag.name}
                            </Select.Option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">开始时间</label>
                        <Input
                          type="date"
                          value={
                            filters.createdFrom
                              ? new Date(filters.createdFrom).toISOString().slice(0, 10)
                              : ''
                          }
                          onChange={(e) => {
                            const ts = e.target.value
                              ? new Date(e.target.value + 'T00:00:00').getTime()
                              : undefined;
                            searchDocuments({ createdFrom: ts });
                          }}
                          style={{ height: '42px' }}
                          className="dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">结束时间</label>
                        <Input
                          type="date"
                          value={
                            filters.createdTo
                              ? new Date(filters.createdTo).toISOString().slice(0, 10)
                              : ''
                          }
                          onChange={(e) => {
                            const ts = e.target.value
                              ? new Date(e.target.value + 'T23:59:59').getTime()
                              : undefined;
                            searchDocuments({ createdTo: ts });
                          }}
                          style={{ height: '42px' }}
                          className="dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* 筛选操作按钮 */}
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 transition-colors"
                  >
                    × 清除筛选
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 搜索结果 - 只在岗位/简历/押题页面显示 */}
        {currentTab !== 'sync-status' && currentTab !== 'other-files' && currentTab !== 'ai-vector-records' && searchResults.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                搜索结果 (共 {totalResults} 条)
              </h3>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {searchResults.map((doc, index) => (
                <div key={doc.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 relative">
                  {/* 左上角序号 */}
                  <div className="absolute left-0 top-0">
                    <div className="bg-blue-600 text-white text-[10px] font-semibold px-2 py-1 rounded-br">
                      {index + 1}
                    </div>
                    <div className="w-0 h-0 border-t-8 border-t-blue-700 border-r-8 border-r-transparent"></div>
                  </div>

                  {/* 右上角按钮 */}
                  <div className="absolute right-6 top-6 flex items-center gap-2">
                    <button
                      onClick={() => showDetail(doc)}
                      className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/70"
                    >
                      详情
                    </button>
                    <button
                      onClick={() => handleDelete(doc)}
                      className="px-3 py-1 text-xs bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/70"
                    >
                      删除
                    </button>
                  </div>

                  <div className="flex-1 pr-32 ml-8">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
                        {getDocumentTypeLabel(doc.metadata.type)}
                      </span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        相关度:{' '}
                        {(
                          Math.max(0, Math.min(1, Number.isFinite(doc.score) ? doc.score : 0)) * 100
                        ).toFixed(1)}
                        %
                      </span>
                      {/* 相关数量显示 */}
                      {doc.metadata.type === 'jobs' && (
                        <>
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-full border border-green-200">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 2a1 1 0 011-1h4a1 1 0 011 1v1H7V6z" clipRule="evenodd" />
                            </svg>
                            相关简历 {doc.metadata.relatedResumes || 0}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            相关押题 {doc.metadata.relatedQuestions || 0}
                          </span>
                        </>
                      )}
                      {doc.metadata.type === 'resumes' && (
                        <>
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 2a1 1 0 011-1h4a1 1 0 011 1v1H7V6z" clipRule="evenodd" />
                            </svg>
                            相关岗位 {doc.metadata.relatedJobs || 0}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            相关押题 {doc.metadata.relatedQuestions || 0}
                          </span>
                        </>
                      )}
                       {doc.metadata.tagName && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                          {doc.metadata.tagName}
                        </span>
                      )}
                      {doc.metadata.type === 'questions' && (
                        <>
                          {/* 岗位名称 */}
                          {doc.metadata.jobTitle && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 2a1 1 0 011-1h4a1 1 0 011 1v1H7V6z" clipRule="evenodd" />
                              </svg>
                              {doc.metadata.jobTitle}
                            </span>
                          )}
                          {/* 简历名称 */}
                          {doc.metadata.resumeTitle && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-full border border-green-200">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 2a1 1 0 011-1h4a1 1 0 011 1v1H7V6z" clipRule="evenodd" />
                              </svg>
                              {doc.metadata.resumeTitle}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* 名称 */}
                    <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                      {getDocumentName(doc)}
                    </h4>

                    {/* 描述内容 */}
                    <div className="mb-3">
                      <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                        {doc.content.length > 200 ? (
                          <>
                            {doc.content.substring(0, 200)}...
                            <button
                              onClick={() => {
                                setCurrentFullContentDoc(doc);
                                setFullContentDrawerVisible(true);
                              }}
                              className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                            >
                              查看完整内容
                            </button>
                          </>
                        ) : (
                          doc.content
                        )}
                      </p>
                    </div>

                    {/* 基础信息 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <span className="truncate">
                        创建时间:{' '}
                        {doc.metadata.timestamp || doc.metadata.createdAt
                          ? formatDate(doc.metadata.createdAt || doc.metadata.timestamp)
                          : '未知'}
                      </span>
                      {doc.metadata.source && (
                        <span className="truncate">来源: {getSourceDisplayName(doc.metadata.source)}</span>
                      )}
                      {doc.metadata.type && (
                        <span className="truncate">类型: {getTypeDisplayName(doc.metadata.type)}</span>
                      )}
                      {doc.metadata.chunkIndex !== undefined && (
                        <span className="truncate">
                          分块: {doc.metadata.chunkIndex + 1}/{doc.metadata.totalChunks}
                        </span>
                      )}
                      <span className="truncate" title={doc.id}>ID: {doc.id}</span>
                      {doc.metadata.type === 'resumes' && doc.metadata.filePath && (
                        <span className="truncate">
                          已上传简历:{' '}
                          <button
                            onClick={() => {
                              setCurrentResumeFilePath(doc.metadata.filePath);
                              setCurrentResumeTitle(doc.metadata.title);
                              setUploadedResumeVisible(true);
                            }}
                            className="text-blue-600 dark:text-blue-400 hover:underline truncate inline-block align-bottom max-w-[200px]"
                            title={doc.metadata.filePath.split('/').pop()}
                          >
                            {doc.metadata.filePath.split('/').pop()}
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 空状态 - 只在岗位/简历/押题页面显示 */}
        {currentTab !== 'sync-status' && currentTab !== 'other-files' && currentTab !== 'ai-vector-records' && !loading && searchResults.length === 0 && (
          <div className="text-center py-12">
            <SearchOutlined className="mx-auto text-6xl text-slate-400 dark:text-slate-500" />
            <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
              {filters.query ? '未找到相关结果' : '暂无数据'}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {filters.query ? '请尝试其他关键词或调整筛选条件' : '请先添加一些数据或进行搜索'}
            </p>
          </div>
        )}

        {/* 详情侧拉弹框 */}
        <DocumentDetailDrawer
          open={detailDrawerVisible}
          onClose={() => setDetailDrawerVisible(false)}
          document={currentDetailDoc}
          relatedData={relatedData}
        />
        
        {/* 完整内容侧拉弹框 */}
        <FullContentDrawer
          open={fullContentDrawerVisible}
          onClose={() => setFullContentDrawerVisible(false)}
          document={currentFullContentDoc}
        />

        {/* 已上传的简历查看弹框 */}
        <UploadedResumeDrawer
          open={uploadedResumeVisible}
          onClose={() => setUploadedResumeVisible(false)}
          filePath={currentResumeFilePath}
          jobTitle={currentResumeTitle}
        />
      {/* 同步和清空操作的全屏 loading */}
      {syncLoading && <PageLoading tip="正在同步所有数据，请稍候..." type="loading" />}
      {cleanLoading && <PageLoading tip="正在清空所有数据，请稍候..." type="saving" />}
      {loading && searchResults.length === 0 && !syncLoading && !cleanLoading && (
        <PageLoading tip="正在加载，请稍候..." />
      )}
    </div>
  );
}

// 同步状态概览组件
const SyncStatusOverview = ({
  onSyncStart,
  onSyncEnd,
  onCleanStart,
  onCleanEnd
}: {
  onSyncStart?: () => void;
  onSyncEnd?: () => void;
  onCleanStart?: () => void;
  onCleanEnd?: () => void;
}) => {
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const { loading, start: startLoading, end: endLoading } = useLoading();

  useEffect(() => {
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    try {
      const { getSyncStatus } = await import('../../api/vector');
      // 不传 jobId 获取汇总统计
      const status = await getSyncStatus();
      // 转换 API 返回的类型格式
      const jobStats = 'total' in status.job ? status.job : { total: 0, synced: 0, unsynced: 0 };
      const resumeStats = 'total' in status.resume ? status.resume : { total: 0, synced: 0, unsynced: 0 };
      
      setSyncStatus({
        job: jobStats,
        resume: resumeStats,
        questions: status.questions
      });
    } catch (error) {
      message.error('获取同步状态失败:' + error);
    }
  };

  const handleSyncAll = async () => {
    Modal.confirm({
      title: '确认同步所有数据',
      content: (
        <div className="space-y-3">
          <div className="text-blue-600 font-medium">
            此操作将同步系统中的所有数据到向量库，可能需要较长时间
          </div>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">1</span>
              <span>所有岗位信息</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">2</span>
              <span>所有简历信息</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">3</span>
              <span>所有面试押题</span>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            同步完成后，向量搜索功能将能够检索到最新的数据内容
          </div>
        </div>
      ),
      okText: '确认同步',
      okType: 'primary',
      cancelText: '取消',
      onOk: async () => {
        try {
          startLoading();
          onSyncStart?.();
          const { syncAll } = await import('../../api/vector');
          // 不传 jobId 同步所有数据
          const result = await syncAll('');
          if (result.success) {
            message.success('同步完成！');
            loadSyncStatus(); // 重新加载状态
          } else {
            message.error('同步失败：' + (result.error || '未知错误'));
          }
        } catch (error: any) {
          let errorMessage = '同步失败：';
          
          if (error.response?.status === 401) {
            errorMessage += '登录已过期，请重新登录';
          } else if (error.response?.status === 503) {
            errorMessage += 'RAG 服务不可用，请检查服务是否正常运行';
          } else if (error.response?.data?.error) {
            errorMessage += error.response.data.error;
          } else if (error.message) {
            errorMessage += error.message;
          } else {
            errorMessage += '未知错误';
          }
          
          message.error(errorMessage);
        } finally {
          await endLoading();
          onSyncEnd?.();
        }
      }
    });
  };

  const handleCleanAll = async () => {
    Modal.confirm({
      title: '确认清空所有向量数据',
      content: (
        <div className="space-y-3">
          <div className="text-red-600 font-medium">
            此操作将永久删除向量库中的所有数据，且无法恢复！
          </div>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs">1</span>
              <span>所有岗位的向量数据</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs">2</span>
              <span>所有简历的向量数据</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs">3</span>
              <span>所有面试押题的向量数据</span>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
            <div className="font-medium mb-1"><WarningIcon className="w-4 h-4 inline mr-1" />重要提醒：</div>
            <div>清空后，所有向量库数据将被永久清除，需要重新同步才能恢复搜索功能！</div>
          </div>
        </div>
      ),
      okText: '确认清空',
      okType: 'danger',
      cancelText: '取消',
      width: 500,
      onOk: async () => {
        try {
          onCleanStart?.();
          const { cleanAllVectorData } = await import('../../api/vector');
          const result = await cleanAllVectorData();
          if (result.success) {
            message.success(result.message);
            // 刷新同步状态
            loadSyncStatus();
          } else {
            message.error('清空失败：' + (result.error || '未知错误'));
          }
        } catch (error: any) {
          let errorMessage = '清空失败：';

          if (error.response?.status === 401) {
            errorMessage += '登录已过期，请重新登录';
          } else if (error.response?.status === 503) {
            errorMessage += 'RAG 服务不可用，请检查服务是否正常运行';
          } else if (error.response?.data?.error) {
            errorMessage += error.response.data.error;
          } else if (error.message) {
            errorMessage += error.message;
          } else {
            errorMessage += '未知错误';
          }

          message.error(errorMessage);
        } finally {
          onCleanEnd?.();
        }
      },
    });
  };

  if (!syncStatus) {
    return <PageLoading tip="加载同步状态..." />;
  }

  const totalItems = syncStatus.job.total + syncStatus.resume.total + syncStatus.questions.total;
  const totalSynced = syncStatus.job.synced + syncStatus.resume.synced + syncStatus.questions.synced;
  const totalUnsynced = totalItems - totalSynced;

  return (
    <div className="space-y-6">
      {/* 一键同步按钮 */}
      <div className="text-center">
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleSyncAll}
            disabled={loading}
            className={`px-8 py-3 text-lg font-medium rounded-lg transition-all ${
              loading
                ? 'bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed'
                : 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 hover:shadow-lg transform hover:scale-105'
            }`}
          >
            一键同步所有数据
          </button>

          <button
            onClick={handleCleanAll}
            disabled={loading}
            className={`px-8 py-3 text-lg font-medium rounded-lg transition-all ${
              loading
                ? 'bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed'
                : 'bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 hover:shadow-lg transform hover:scale-105'
            }`}
          >
            一键清空所有数据
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          一键同步所有数据将同步岗位信息、简历信息、面试押题三个模块的数据到向量库，同步完成后，可以进行搜索。
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          一键清空所有数据将清空向量库中的所有数据，清空后需要重新同步才能恢复搜索功能。
        </p>
      </div>

      {/* 总体统计 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg p-6 border border-blue-200 dark:border-blue-700">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">总体同步状态</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalItems}</div>
            <div className="text-sm text-blue-700 dark:text-blue-300">总数据量</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totalSynced}</div>
            <div className="text-sm text-green-700 dark:text-green-300">已同步</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{totalUnsynced}</div>
            <div className="text-sm text-orange-700 dark:text-orange-300">未同步</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-blue-700 dark:text-blue-300">
            <span>同步进度</span>
            <span>{totalItems > 0 ? Math.round((totalSynced / totalItems) * 100) : 0}%</span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mt-1">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 dark:from-blue-400 dark:to-green-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${totalItems > 0 ? (totalSynced / totalItems) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 各模块详细状态 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 岗位信息 */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 2a1 1 0 011-1h4a1 1 0 011 1v1H7V6z" clipRule="evenodd" />
              </svg>
              <h4 className="font-medium text-slate-900 dark:text-slate-100">岗位信息</h4>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${
              syncStatus.job.unsynced === 0
                ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300'
                : 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300'
            }`}>
              {syncStatus.job.unsynced === 0 ? '已同步' : `${syncStatus.job.unsynced} 条未同步`}
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">总数:</span>
              <span className="font-medium dark:text-slate-200">{syncStatus.job.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">已同步:</span>
              <span className="font-medium text-green-600 dark:text-green-400">{syncStatus.job.synced}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">未同步:</span>
              <span className="font-medium text-orange-600 dark:text-orange-400">{syncStatus.job.unsynced}</span>
            </div>
          </div>
        </div>

        {/* 简历信息 */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 2a1 1 0 011-1h4a1 1 0 011 1v1H7V6z" clipRule="evenodd" />
              </svg>
              <h4 className="font-medium text-slate-900 dark:text-slate-100">简历信息</h4>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${
              syncStatus.resume.unsynced === 0
                ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300'
                : 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300'
            }`}>
              {syncStatus.resume.unsynced === 0 ? '已同步' : `${syncStatus.resume.unsynced} 条未同步`}
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">总数:</span>
              <span className="font-medium dark:text-slate-200">{syncStatus.resume.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">已同步:</span>
              <span className="font-medium text-green-600 dark:text-green-400">{syncStatus.resume.synced}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">未同步:</span>
              <span className="font-medium text-orange-600 dark:text-orange-400">{syncStatus.resume.unsynced}</span>
            </div>
          </div>
        </div>

        {/* 面试押题 */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <h4 className="font-medium text-slate-900 dark:text-slate-100">面试押题</h4>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${
              syncStatus.questions.unsynced === 0
                ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300'
                : 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300'
            }`}>
              {syncStatus.questions.unsynced === 0 ? '已同步' : `${syncStatus.questions.unsynced} 条未同步`}
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">总数:</span>
              <span className="font-medium dark:text-slate-200">{syncStatus.questions.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">已同步:</span>
              <span className="font-medium text-green-600 dark:text-green-400">{syncStatus.questions.synced}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">未同步:</span>
              <span className="font-medium text-orange-600 dark:text-orange-400">{syncStatus.questions.unsynced}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 同步说明 */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800/50 dark:to-blue-900/30 rounded-lg p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">同步说明</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-green-200 dark:border-green-700 shadow-sm">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-green-800 dark:text-green-300 mb-1">新增同步</div>
                <div className="text-sm text-green-700 dark:text-green-400">数据库有但向量库没有：新插入到向量库</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-700 shadow-sm">
              <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-blue-800 dark:text-blue-300 mb-1">更新同步</div>
                <div className="text-sm text-blue-700 dark:text-blue-400">数据库有且向量库也有：更新向量库（先删除后插入）</div>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-orange-200 dark:border-orange-700 shadow-sm">
              <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-orange-800 dark:text-orange-300 mb-1">清理同步</div>
                <div className="text-sm text-orange-700 dark:text-orange-400">数据库没有但向量库有：从向量库删除</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-purple-200 dark:border-purple-700 shadow-sm">
              <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-purple-800 dark:text-purple-300 mb-1">数据一致性</div>
                <div className="text-sm text-purple-700 dark:text-purple-400">同步完成后，所有数据将保持一致性</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-blue-900 dark:text-blue-100">AI 面试训练</div>
              <div className="text-sm text-blue-700 dark:text-blue-300">向量知识库所有数据，将用于 AI 面试训练</div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
};
