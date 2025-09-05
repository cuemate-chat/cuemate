import { InboxOutlined } from '@ant-design/icons';
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
      <DrawerHeader>上传简历文件</DrawerHeader>
      <DrawerContent>
        <div className="py-8 h-[60vh] flex flex-col justify-center">
          <Upload.Dragger
            name="file"
            multiple={false}
            accept=".pdf,.doc,.docx"
            beforeUpload={onFileUpload}
            showUploadList={false}
            className="mb-6 flex-1 flex flex-col justify-center"
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持 PDF、DOC、DOCX 格式的简历文件，文件将自动解析为文本并填入简历信息栏
            </p>
          </Upload.Dragger>
          
          {uploadLoading && (
            <div className="text-center text-blue-600 mt-4">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              正在解析文件内容...
            </div>
          )}
        </div>
      </DrawerContent>
    </DrawerProvider>
  );
};

export default UploadResumeDrawer;
