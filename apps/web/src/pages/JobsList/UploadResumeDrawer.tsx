import { InboxOutlined } from '@ant-design/icons';
import { DocumentTextIcon, CloudArrowUpIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Upload } from 'antd';
import React from 'react';
import DrawerProvider, { DrawerContent, DrawerHeader } from '../../components/DrawerProvider';

interface UploadResumeDrawerProps {
  open: boolean;
  onClose: () => void;
  onFileUpload: (file: File) => Promise<boolean>;
  uploadLoading: boolean;
}

const UploadResumeDrawer: React.FC<UploadResumeDrawerProps> = ({
  open,
  onClose,
  onFileUpload,
  uploadLoading,
}) => {
  return (
    <DrawerProvider
      open={open}
      onClose={onClose}
      width="50%"
    >
      <DrawerHeader>
        <div className="flex items-center gap-2">
          <DocumentTextIcon className="w-5 h-5 text-blue-600" />
          <span>上传简历文件</span>
        </div>
      </DrawerHeader>
      <DrawerContent>
        <div className="space-y-6">
          {/* 功能说明 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CloudArrowUpIcon className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <div className="text-sm font-medium text-blue-700 mb-2">📝 智能简历解析</div>
                <div className="text-sm text-blue-600 space-y-1">
                  <div>• 支持 PDF、Word 格式的简历文件</div>
                  <div>• 自动提取个人信息、工作经历、教育背景等关键内容</div>
                  <div>• 智能填充到对应的表单字段中，提升录入效率</div>
                </div>
              </div>
            </div>
          </div>

          {/* 上传区域 */}
          <div className="relative">
            <Upload.Dragger
              name="file"
              multiple={false}
              accept=".pdf,.doc,.docx"
              beforeUpload={onFileUpload}
              showUploadList={false}
              className="!border-2 !border-dashed !border-gray-300 hover:!border-blue-400 !bg-gray-50 hover:!bg-blue-50 !rounded-lg !p-8 transition-all duration-200"
              disabled={uploadLoading}
            >
              <div className="flex flex-col items-center justify-center py-6">
                <div className={`text-6xl mb-4 transition-colors ${uploadLoading ? 'text-gray-400' : 'text-blue-400'}`}>
                  <InboxOutlined />
                </div>
                <div className={`text-lg font-medium mb-2 ${uploadLoading ? 'text-gray-500' : 'text-gray-700'}`}>
                  {uploadLoading ? '正在处理中...' : '点击或拖拽简历文件到此处'}
                </div>
                <div className="text-sm text-gray-500 text-center">
                  {uploadLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span>正在解析文件内容，请稍候...</span>
                    </div>
                  ) : (
                    <>
                      <div>支持 PDF、DOC、DOCX 格式</div>
                      <div className="mt-1">文件大小不超过 10MB</div>
                    </>
                  )}
                </div>
              </div>
            </Upload.Dragger>
          </div>

          {/* 支持格式说明 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                <DocumentTextIcon className="w-4 h-4 text-red-600" />
              </div>
              <div className="text-sm">
                <div className="font-medium text-gray-700">PDF 格式</div>
                <div className="text-xs text-gray-500">推荐使用</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                <DocumentTextIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-sm">
                <div className="font-medium text-gray-700">Word 格式</div>
                <div className="text-xs text-gray-500">DOC/DOCX</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                <CheckCircleIcon className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-sm">
                <div className="font-medium text-gray-700">自动解析</div>
                <div className="text-xs text-gray-500">智能填充</div>
              </div>
            </div>
          </div>

          {/* 注意事项 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-yellow-700 mb-1">💡 使用提示</div>
                <div className="text-sm text-yellow-600 space-y-1">
                  <div>• 请确保简历内容清晰完整，便于系统准确解析</div>
                  <div>• 上传后请检查自动填充的内容，必要时进行手动调整</div>
                  <div>• 建议使用标准简历格式，提高解析准确率</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </DrawerProvider>
  );
};

export default UploadResumeDrawer;
