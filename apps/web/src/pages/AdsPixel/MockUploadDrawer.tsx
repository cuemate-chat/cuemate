import { EyeIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { Button } from 'antd';
import { useState } from 'react';
import DrawerProvider, { DrawerContent, DrawerFooter, DrawerHeader } from '../../components/DrawerProvider';
import { message } from '../../components/Message';

interface AdBlock {
  id: string;
  block_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'square' | 'horizontal' | 'vertical';
  price?: number;
  pixelWidth: number;
  pixelHeight: number;
}

interface MockUploadDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedBlock: AdBlock | null;
  onUpload: (file: File) => void;
}

export default function MockUploadDrawer({
  open,
  onClose,
  selectedBlock,
  onUpload
}: MockUploadDrawerProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setUploadedFile(file);
    } else {
      message.error('请选择图片文件！');
    }
  };
  
  // 处理拖放上传
  const handleFileDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setUploadedFile(file);
    } else {
      message.error('请选择图片文件！');
    }
  };
  
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  // 处理上传
  const handleMockUpload = () => {
    if (!selectedBlock || !uploadedFile) {
      message.error('请选择要上传的图片！');
      return;
    }

    onUpload(uploadedFile);
    setUploadedFile(null);
  };

  // 清理状态
  const handleClose = () => {
    setUploadedFile(null);
    onClose();
  };

  const getBlockTypeText = (type: string) => {
    switch (type) {
      case 'square': return '正方形';
      case 'horizontal': return '横长方形';
      case 'vertical': return '竖长方形';
      default: return type;
    }
  };

  return (
    <DrawerProvider
      open={open}
      onClose={handleClose}
      width="40%"
    >
      <DrawerHeader>
        <div className="flex items-center gap-2">
          <PhotoIcon className="w-5 h-5 text-blue-600" />
          <span>模拟上传到块 {selectedBlock?.block_id}</span>
        </div>
      </DrawerHeader>
      
      <DrawerContent>
        {selectedBlock && (
          <div className="space-y-6">
            {/* 块信息 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <EyeIcon className="w-4 h-4" />
                块信息
              </label>
              <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 border border-gray-200 space-y-2">
                <div className="flex justify-between">
                  <span>网格位置:</span>
                  <span className="font-medium">{selectedBlock.x}, {selectedBlock.y}</span>
                </div>
                <div className="flex justify-between">
                  <span>网格大小:</span>
                  <span className="font-medium">{selectedBlock.width} × {selectedBlock.height}</span>
                </div>
                <div className="flex justify-between">
                  <span>容器占比:</span>
                  <span className="font-medium">{selectedBlock.pixelWidth.toFixed(1)}% × {selectedBlock.pixelHeight.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>块类型:</span>
                  <span className="font-medium text-blue-600">{getBlockTypeText(selectedBlock.type)}</span>
                </div>
                <div className="flex justify-between">
                  <span>广告价格:</span>
                  <span className="font-bold text-green-600">¥{selectedBlock.price || 100}</span>
                </div>
              </div>
            </div>

            {/* 文件上传区域 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <PhotoIcon className="w-4 h-4" />
                上传文件
              </label>
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
                onDrop={handleFileDrop}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById('mock-file-upload')?.click()}
              >
                {uploadedFile ? (
                  <div className="space-y-3">
                    <img 
                      src={URL.createObjectURL(uploadedFile)} 
                      alt="预览" 
                      className="max-w-full max-h-40 mx-auto rounded-lg shadow-sm" 
                    />
                    <div className="text-sm text-green-600 font-medium">{uploadedFile.name}</div>
                    <div className="text-xs text-gray-500">点击更换图片</div>
                  </div>
                ) : (
                  <div>
                    <PhotoIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <div className="text-gray-600">
                      点击或拖拽图片到此处<br/>
                      <span className="text-xs text-gray-500 mt-1 block">支持 JPG, PNG, GIF 格式</span>
                    </div>
                  </div>
                )}
                <input
                  id="mock-file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* 上传说明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-700">
                <div className="font-medium mb-2">📝 模拟上传说明：</div>
                <ul className="space-y-1 text-xs">
                  <li>• 这是一个模拟功能，上传的图片仅在当前会话中有效</li>
                  <li>• 刷新页面后，模拟数据将会消失</li>
                  <li>• 建议选择与块尺寸比例相近的图片以获得最佳效果</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </DrawerContent>
      
      <DrawerFooter>
        <div className="flex justify-end gap-3">
          <Button onClick={handleClose}>
            取消
          </Button>
          <Button
            type="primary"
            onClick={handleMockUpload}
            disabled={!uploadedFile}
          >
            {uploadedFile ? '模拟上传' : '请选择图片'}
          </Button>
        </div>
      </DrawerFooter>
    </DrawerProvider>
  );
}