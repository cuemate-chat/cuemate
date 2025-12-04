import { SearchOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import { useEffect, useState } from 'react';
import {
    checkBlock,
    createPixelAd,
    getAvailableBlocks,
    getBlockConfigs,
    uploadImage,
    type BlockConfig,
    type CreatePixelAdRequest
} from '../../api/ads';
import DrawerProvider, { DrawerContent, DrawerFooter, DrawerHeader } from '../../components/DrawerProvider';
import { message } from '../../components/Message';

interface FormData {
  title: string;
  description: string;
  linkUrl: string;
  blockConfigId: string;
  contactInfo: string;
  notes: string;
  expiresAt: string;
}

interface CreateAdDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateAdDrawer({
  open,
  onClose,
  onSuccess
}: CreateAdDrawerProps) {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    linkUrl: '',
    blockConfigId: '',
    contactInfo: '',
    notes: '',
    expiresAt: '',
  });
  
  // 图片上传相关状态
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // 块配置相关状态
  const [availableBlocks, setAvailableBlocks] = useState<BlockConfig[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 获取可用块配置
  const fetchAvailableBlocks = async () => {
    setLoadingBlocks(true);
    try {
      const data = await getAvailableBlocks();
      setAvailableBlocks(data.availableBlocks);
    } catch (error) {
      message.error('获取可用广告块失败');
    } finally {
      setLoadingBlocks(false);
    }
  };

  // 获取所有块配置
  const fetchBlockConfigs = async () => {
    setLoadingBlocks(true);
    try {
      await getBlockConfigs();
    } catch (error) {
      message.error('获取所有广告块失败');
    } finally {
      setLoadingBlocks(false);
    }
  };

  // 当侧拉弹框打开时加载数据
  useEffect(() => {
    if (open) {
      fetchAvailableBlocks();
      fetchBlockConfigs();
      
      // 设置默认过期时间为 30 天后
      const defaultExpiry = new Date();
      defaultExpiry.setDate(defaultExpiry.getDate() + 30);
      setFormData(prev => ({
        ...prev,
        expiresAt: defaultExpiry.toISOString().split('T')[0]
      }));
    }
  }, [open]);

  // 处理图片文件选择
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      message.error('只支持 JPG、PNG、GIF、WebP 格式的图片');
      return;
    }

    // 验证文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      message.error('图片大小不能超过 5MB');
      return;
    }

    setSelectedFile(file);
    
    // 生成预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 移除选中的图片
  const handleImageRemove = () => {
    setSelectedFile(null);
    setImagePreview('');
  };

  // 上传图片
  const handleImageUpload = async (): Promise<string> => {
    if (!selectedFile) return '';
    
    setUploadingImage(true);
    try {
      const result = await uploadImage(selectedFile);
      message.success('图片上传成功');
      setImagePreview(result.imagePath);
      setSelectedFile(null);
      return result.imagePath;
    } catch {
      
      return '';
    } finally {
      setUploadingImage(false);
    }
  };

  // 创建广告
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证表单
    if (!formData.title.trim()) {
      message.error('请输入广告标题');
      return;
    }
    if (!formData.description.trim()) {
      message.error('请输入广告描述');
      return;
    }
    if (!formData.linkUrl.trim()) {
      message.error('请输入跳转链接');
      return;
    }
    if (!formData.blockConfigId.trim()) {
      message.error('请选择广告位块');
      return;
    }
    if (!formData.contactInfo.trim()) {
      message.error('请输入联系方式');
      return;
    }

    // 检查块是否可用
    const available = await checkBlock({ blockConfigId: formData.blockConfigId });

    if (!available) {
      message.error('该广告块已被占用，请选择其他块');
      return;
    }

    setSubmitting(true);
    try {
      // 如果选择了新图片，先上传
      let imagePath = '';
      if (selectedFile) {
        imagePath = await handleImageUpload();
        if (!imagePath && selectedFile) {
          setSubmitting(false);
          return;
        }
      }

      const payload: CreatePixelAdRequest = {
        title: formData.title,
        description: formData.description,
        linkUrl: formData.linkUrl,
        blockConfigId: formData.blockConfigId,
        contactInfo: formData.contactInfo,
        notes: formData.notes,
        expiresAt: new Date(formData.expiresAt).getTime(),
        imagePath: imagePath,
      };

      await createPixelAd(payload);
      message.success('广告创建成功');
      
      // 清空表单
      setFormData({
        title: '',
        description: '',
        linkUrl: '',
        blockConfigId: '',
        contactInfo: '',
        notes: '',
        expiresAt: '',
      });
      handleImageRemove();
      onSuccess();
    } catch {
      
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DrawerProvider
      open={open}
      onClose={onClose}
      width="70%"
    >
      <DrawerHeader>
        新建广告
      </DrawerHeader>

      <DrawerContent>
        <form id="create-ad-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                广告标题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="输入广告标题"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                广告描述 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="输入广告描述"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                跳转链接 <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={formData.linkUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, linkUrl: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                广告块 <span className="text-red-500">*</span>
              </label>
              <Select
                showSearch
                placeholder="选择可用的广告块"
                value={formData.blockConfigId || undefined}
                onChange={(value) => {
                  setFormData(prev => ({ ...prev, blockConfigId: value }));
                }}
                style={{ width: '100%' }}
                loading={loadingBlocks}
                suffixIcon={<SearchOutlined />}
                filterOption={(input, option) =>
                  (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={availableBlocks.map((block: BlockConfig) => ({
                  value: block.id,
                  label: `${block.blockId} (${block.width}x${block.height} - ¥${block.price})`,
                  key: block.id
                }))}
                listHeight={200}
                className="h-[42px]"
              />
              <div className="text-xs text-slate-500 mt-1">
                显示可用的广告块配置，价格根据块大小自动计算
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                块信息
              </label>
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-700 dark:text-slate-200">
                {formData.blockConfigId ? (
                  (() => {
                    const selectedBlock = availableBlocks.find((b: BlockConfig) => b.id === formData.blockConfigId);
                    return selectedBlock ? (
                      <div>
                        <div>块 ID: <span className="font-medium text-blue-600 dark:text-blue-400">{selectedBlock.blockId}</span></div>
                        <div>位置: ({selectedBlock.x}, {selectedBlock.y})</div>
                        <div>尺寸: {selectedBlock.width} × {selectedBlock.height}</div>
                        <div>类型: {selectedBlock.type === 'square' ? '正方形' : selectedBlock.type === 'horizontal' ? '横长方形' : '竖长方形'}</div>
                        <div>价格: ¥{selectedBlock.price}</div>
                      </div>
                    ) : '未选择块';
                  })()
                ) : '请先选择广告块'}
              </div>
            </div>

            {/* 图片上传区域 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                广告图片
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4">
                {imagePreview || selectedFile ? (
                  <div className="text-center">
                    <img 
                      src={selectedFile ? URL.createObjectURL(selectedFile) : imagePreview} 
                      alt="图片预览" 
                      className="max-h-32 mx-auto mb-2 rounded"
                    />
                    <div className="flex justify-center gap-2">
                      <label className="cursor-pointer bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                        更换图片
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleImageRemove}
                        className="bg-slate-600 text-white px-3 py-1 rounded text-sm hover:bg-slate-700"
                      >
                        移除图片
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-slate-500 mb-2">
                      点击选择图片或拖拽图片到此处
                    </div>
                    <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                      选择图片
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                    <div className="text-xs text-slate-400 mt-2">
                      支持 JPG、PNG、GIF、WebP 格式，最大 5MB
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                联系方式 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.contactInfo}
                onChange={(e) => setFormData(prev => ({ ...prev, contactInfo: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="输入联系方式（电话、微信、QQ、邮箱等）"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                过期时间 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                备注信息
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="输入备注信息..."
              />
            </div>
          </div>

        </form>
      </DrawerContent>

      <DrawerFooter>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            form="create-ad-form"
            disabled={submitting || uploadingImage}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? '创建中...' : '创建'}
          </button>
        </div>
      </DrawerFooter>
    </DrawerProvider>
  );
}
