import { Modal, Spin } from 'antd';
import { useEffect, useState, useRef } from 'react';
import jsPreviewDocx from '@js-preview/docx';
import '@js-preview/docx/lib/index.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { deleteJobResume } from '../../api/jobs';
import DrawerProvider, { DrawerContent, DrawerHeader } from '../../components/DrawerProvider';
import { WEB_API_BASE } from '../../config';
import { message as globalMessage } from '../../components/Message';

interface UploadedResumeDrawerProps {
  open: boolean;
  onClose: () => void;
  filePath?: string;
  jobTitle?: string;
  jobId?: string;
  onRefresh?: () => Promise<void>;
}

export default function UploadedResumeDrawer({
  open,
  onClose,
  filePath,
  jobTitle,
  jobId,
  onRefresh
}: UploadedResumeDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [content, setContent] = useState<string>('');
  const [fileUrl, setFileUrl] = useState<string>('');
  const [markdownPreview, setMarkdownPreview] = useState(true); // Markdown 预览模式
  const docxContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && filePath) {
      loadFileContent();
    }

    // 清理函数：清空 DOCX 预览器内容
    return () => {
      if (docxContainerRef.current) {
        docxContainerRef.current.innerHTML = '';
      }
      setContent('');
      setFileUrl('');
    };
  }, [open, filePath]);

  const loadFileContent = async () => {
    if (!filePath) return;

    setLoading(true);
    // 清空之前的内容
    setContent('');
    if (docxContainerRef.current) {
      docxContainerRef.current.innerHTML = '';
    }

    try {
      const url = `${WEB_API_BASE}${filePath}`;
      setFileUrl(url);

      // 获取文件扩展名
      const ext = filePath.toLowerCase().split('.').pop();

      if (ext === 'pdf') {
        // PDF 文件直接在 iframe 中显示
        setContent('');
      } else if (ext === 'docx') {
        // DOCX 文件使用 jsPreviewDocx 预览
        setContent('');
        // 延迟一帧确保 DOM 已渲染
        setTimeout(() => {
          if (docxContainerRef.current) {
            const docxPreviewer = jsPreviewDocx.init(docxContainerRef.current);
            docxPreviewer.preview(url).catch((e: any) => {
              console.error('DOCX 预览失败:', e);
              globalMessage.error('Word 文档预览失败');
            });
          }
        }, 100);
      } else if (ext === 'txt' || ext === 'md' || ext === 'markdown') {
        // TXT/MD 文件：fetch 文件内容并显示
        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error('文件加载失败');
          }
          const textContent = await response.text();
          setContent(textContent);
        } catch (error: any) {
          console.error('文本文件加载失败:', error);
          setContent('文本文件加载失败，请下载查看。');
        }
      } else {
        // 其他文件类型显示提示
        setContent('此文件格式不支持预览，请下载查看。');
      }
    } catch (error: any) {
      globalMessage.error(error.message || '加载文件失败');
      setContent('加载文件失败');
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = () => {
    if (!fileUrl) return;
    window.open(fileUrl, '_blank');
  };

  const handleDeleteFile = () => {
    if (!jobId) {
      globalMessage.error('岗位 ID 不存在');
      return;
    }

    Modal.confirm({
      title: '确认删除',
      content: '确定要删除此简历文件吗？删除后数据库中的文件路径将被清空。',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        setDeleteLoading(true);
        try {
          await deleteJobResume(jobId);
          globalMessage.success('简历文件已删除');
          onClose();
          if (onRefresh) {
            await onRefresh();
          }
        } catch (error: any) {
          globalMessage.error(error.message || '删除失败');
        } finally {
          setDeleteLoading(false);
        }
      },
    });
  };

  // 获取文件扩展名
  const ext = filePath?.toLowerCase().split('.').pop() || '';

  return (
    <DrawerProvider
      open={open}
      onClose={onClose}
      width="80%"
    >
      <DrawerHeader>
        <div className="flex items-center justify-between pr-8">
          <span>已上传的{jobId ? '简历' : '文档'}{jobTitle ? ` - ${jobTitle}` : ''}</span>
          <div className="flex items-center gap-4">
            {/* Markdown 预览/源码切换按钮 */}
            {(ext === 'md' || ext === 'markdown') && (
              <button
                onClick={() => setMarkdownPreview(!markdownPreview)}
                className="text-sm px-3 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                {markdownPreview ? '查看源码' : '预览效果'}
              </button>
            )}
            <button
              onClick={downloadFile}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              下载文件
            </button>
            {jobId && (
              <button
                onClick={handleDeleteFile}
                disabled={deleteLoading}
                className="text-sm text-red-600 dark:text-red-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteLoading ? '删除中...' : '删除文件'}
              </button>
            )}
          </div>
        </div>
      </DrawerHeader>
      <DrawerContent>
        <div className="flex flex-col h-full">
          {/* 内容区域 */}
          <div className="flex-1" style={{ minHeight: 0 }}>
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Spin size="large" tip="加载中..." />
              </div>
            ) : ext === 'pdf' && fileUrl ? (
              <iframe
                src={fileUrl}
                className="w-full h-full border-0 rounded-lg"
                style={{ minHeight: 'calc(100vh - 200px)' }}
                title="PDF 预览"
              />
            ) : ext === 'docx' && fileUrl ? (
              <div
                ref={docxContainerRef}
                className="w-full h-full overflow-auto bg-white dark:bg-slate-900 rounded-lg"
                style={{ minHeight: 'calc(100vh - 200px)' }}
              />
            ) : (ext === 'txt' || ext === 'md' || ext === 'markdown') && content ? (
              <div className="w-full h-full overflow-auto bg-slate-100 dark:bg-slate-800 p-6" style={{ minHeight: 'calc(100vh - 200px)' }}>
                <div className="max-w-5xl mx-auto bg-white dark:bg-slate-900 shadow-lg rounded-lg p-12">
                  {(ext === 'md' || ext === 'markdown') && markdownPreview ? (
                    // Markdown 预览模式
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                    </div>
                  ) : (
                    // 源码模式（TXT 或 MD 源码）
                    <pre className="whitespace-pre-wrap break-words text-slate-900 dark:text-slate-100 font-mono text-sm leading-relaxed">
                      {content}
                    </pre>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-8 text-center">
                <div className="text-slate-600 dark:text-slate-300 mb-4">
                  {content || '无法预览此文件'}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  文件路径：{filePath}
                </div>
                <button
                  onClick={downloadFile}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  下载查看
                </button>
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </DrawerProvider>
  );
}
