import { CloseOutlined, SearchOutlined } from '@ant-design/icons';
import {
  EyeIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Modal, Select } from 'antd';
import { useEffect, useState } from 'react';
import {
  checkPixelPosition,
  createPixelAd,
  deletePixelAd,
  listAdsPixel,
  updatePixelAd,
  uploadImage,
  type CreatePixelAdRequest,
  type PixelAd
} from '../api/ads-mg';
import LicenseGuard from '../components/LicenseGuard';
import { message } from '../components/Message';
import PaginationBar from '../components/PaginationBar';
import { WEB_API_BASE } from '../config';
import { LAYOUT_PAGES, getBlockPrice } from '../data/pixelLayout';

interface FormData {
  title: string;
  description: string;
  link_url: string;
  block_id: string; // 新增block_id字段
  x_position: number;
  y_position: number;
  width: number;
  height: number;
  z_index: number;
  contact_info: string;
  notes: string; // 新增notes字段
  price: number;
  expires_at: string;
}

const initialFormData: FormData = {
  title: '',
  description: '',
  link_url: '',
  block_id: '', // 新增
  x_position: 0,
  y_position: 0,
  width: 100,
  height: 100,
  z_index: 1,
  contact_info: '',
  notes: '', // 新增
  price: 0,
  expires_at: '',
};

export default function AdsManagement() {
  const [ads, setAds] = useState<PixelAd[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingAd, setEditingAd] = useState<PixelAd | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  
  // 图片上传相关状态
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [, setUploadingImage] = useState(false);

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
      return result.imagePath;
    } catch (error: any) {
      message.error('图片上传失败：' + error.message);
      return '';
    } finally {
      setUploadingImage(false);
    }
  };

  // 获取广告列表
  const fetchAds = async (page = 1, limit = pageSize, search = '', status = '') => {
    setLoading(true);
    try {
      const data = await listAdsPixel({
        page,
        limit,
        search: search || undefined,
        status: status || undefined,
      });
      setAds(data.ads);
      setTotalCount(data.pagination.total);
    } catch (error) {
      message.error('获取广告列表出错');
    } finally {
      setLoading(false);
    }
  };

  // 检查位置是否可用
  const checkPosition = async (x: number, y: number, width: number, height: number, excludeId?: string) => {
    try {
      const data = await checkPixelPosition({
        x_position: x,
        y_position: y,
        width,
        height,
        exclude_id: excludeId,
      });
      return data.available;
    } catch (error) {
      return false;
    }
  };

  // 根据块ID获取块信息
  const getBlockInfo = (blockId: string) => {
    for (const page of LAYOUT_PAGES) {
      const block = page.layout.find(b => b.blockId === blockId);
      if (block) {
        return { block, page };
      }
    }
    return null;
  };

  // 创建或更新广告
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
    if (!formData.link_url.trim()) {
      message.error('请输入跳转链接');
      return;
    }
    if (!formData.block_id.trim()) {
      message.error('请选择广告位块ID');
      return;
    }
    if (!formData.contact_info.trim()) {
      message.error('请输入联系方式');
      return;
    }

    // 根据块ID获取位置和尺寸信息
    const blockInfo = getBlockInfo(formData.block_id);
    if (!blockInfo) {
      message.error('选择的块ID无效');
      return;
    }

    // 更新表单数据的坐标和尺寸
    const updatedFormData = {
      ...formData,
      x_position: blockInfo.block.x * 50, // 假设基础网格大小为50px
      y_position: blockInfo.block.y * 50,
      width: blockInfo.block.width * 50,
      height: blockInfo.block.height * 50,
    };

    // 检查位置冲突
    const available = await checkPosition(
      updatedFormData.x_position,
      updatedFormData.y_position,
      updatedFormData.width,
      updatedFormData.height,
      editingAd?.id
    );

    if (!available) {
      message.error('该广告位已被占用，请选择其他位置');
      return;
    }

    setSubmitting(true);
    try {
      // 如果选择了新图片，先上传
      let imagePath = editingAd?.image_path || '';
      if (selectedFile) {
        imagePath = await handleImageUpload();
        if (!imagePath && selectedFile) {
          // 上传失败
          setSubmitting(false);
          return;
        }
      }

      const payload: CreatePixelAdRequest = {
        ...updatedFormData,
        expires_at: new Date(updatedFormData.expires_at).getTime(),
        image_path: imagePath, // 包含图片路径
      };

      if (editingAd) {
        await updatePixelAd(editingAd.id, payload);
        message.success('广告更新成功');
      } else {
        await createPixelAd(payload);
        message.success('广告创建成功');
      }
      
      setShowModal(false);
      setEditingAd(null);
      setFormData(initialFormData);
      handleImageRemove(); // 清除图片状态
      fetchAds(currentPage, pageSize, searchTerm, statusFilter);
    } catch (error: any) {
      
      // 检查是否是认证错误
      if (error.status === 401 || error.message?.includes('unauthorized') || error.message?.includes('token')) {
        message.error('登录已过期，请重新登录');
        return;
      }
      
      // 检查是否是网络错误
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        message.error('网络连接失败，请检查网络后重试');
        return;
      }
      
      // 其他错误
      message.error(`提交广告出错: ${error.message || '未知错误'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // 删除广告
  const handleDelete = async (ad: PixelAd) => {
    Modal.confirm({
      title: '确认删除广告',
      content: `确定要删除广告 "${ad.title}" 吗？删除后无法恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        try {
          await deletePixelAd(ad.id);
          message.success('广告删除成功');
          fetchAds(currentPage, pageSize, searchTerm, statusFilter);
        } catch (error) {
          message.error('删除广告出错：' + error);
        }
      }
    });
  };

  // 打开编辑模态框
  const handleEdit = (ad: PixelAd) => {
    setEditingAd(ad);
    setFormData({
      title: ad.title,
      description: ad.description,
      link_url: ad.link_url,
      block_id: ad.block_id || '', // 新增
      x_position: ad.x_position,
      y_position: ad.y_position,
      width: ad.width,
      height: ad.height,
      z_index: ad.z_index,
      contact_info: ad.contact_info || '',
      notes: ad.notes || '', // 新增
      price: ad.price,
      expires_at: new Date(ad.expires_at).toISOString().split('T')[0],
    });
    
    // 清除图片状态，显示当前图片信息
    handleImageRemove();
    if (ad.image_path) {
      // 如果是相对路径，存储相对路径用于显示时转换
      // 如果是完整URL（如用户上传的新图片），直接使用
      setImagePreview(ad.image_path);
    }
    
    setShowModal(true);
  };

  // 打开新建模态框
  const handleCreate = () => {
    setEditingAd(null);
    setFormData(initialFormData);
    handleImageRemove(); // 清除图片状态
    setShowModal(true);
  };

  // 分页处理
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchAds(page, pageSize, searchTerm, statusFilter);
  };

  // 分页大小变化处理
  const handlePageSizeChange = (current: number, size: number) => {
    void current;
    setPageSize(size);
    setCurrentPage(1);
    fetchAds(1, size, searchTerm, statusFilter);
  };

  // 搜索处理
  const handleSearch = () => {
    setCurrentPage(1);
    fetchAds(1, pageSize, searchTerm, statusFilter);
  };

  // 重置搜索
  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('');
    setCurrentPage(1);
    fetchAds(1, pageSize, '', '');
  };

  // 格式化日期
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  // 格式化价格
  const formatPrice = (price: number) => {
    return `¥${price.toFixed(2)}`;
  };

  // 获取完整的图片URL
  const getFullImageUrl = (imagePath: string) => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    return `${WEB_API_BASE}${imagePath}`;
  };


  useEffect(() => {
    fetchAds();
  }, []);

  useEffect(() => {
    if (formData.expires_at === '' && !editingAd) {
      // 设置默认过期时间为30天后
      const defaultExpiry = new Date();
      defaultExpiry.setDate(defaultExpiry.getDate() + 30);
      setFormData(prev => ({
        ...prev,
        expires_at: defaultExpiry.toISOString().split('T')[0]
      }));
    }
  }, [showModal, editingAd]);

  return (
    <LicenseGuard feature="ads_management">
      <div className="p-6 max-w-7xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">广告管理</h1>
        <p className="text-slate-600">管理像素广告的创建、编辑和删除</p>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">搜索广告</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索广告标题或描述..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>
          
          <div className="w-full lg:w-48">
            <label className="block text-sm font-medium text-slate-700 mb-1">状态筛选</label>
            <Select
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              placeholder="全部状态"
              style={{ width: '100%' }}
              allowClear
              className="h-[42px]"
              options={[
                { value: 'active', label: '活跃' },
                { value: 'inactive', label: '停用' },
                { value: 'expired', label: '已过期' },
              ]}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              搜索
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors"
            >
              重置
            </button>
          </div>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-sm text-slate-600">
          共 {ads.length} 条广告
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          新建广告
        </button>
      </div>

      {/* 广告列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-slate-600">加载中...</span>
          </div>
        ) : ads.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-slate-400 mb-2">暂无广告</div>
            <button
              onClick={handleCreate}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              创建第一个广告
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    广告信息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    位置/尺寸
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    价格
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    过期时间
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {ads.map((ad) => (
                  <tr key={ad.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{ad.title}</div>
                        <div className="text-sm text-slate-500 line-clamp-2">{ad.description}</div>
                        <div className="text-xs text-blue-600 mt-1 truncate">
                          <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {ad.link_url}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      <div>({ad.x_position}, {ad.y_position})</div>
                      <div className="text-slate-500">{ad.width} × {ad.height}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ad.status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : ad.status === 'inactive'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {ad.status === 'active' ? '活跃' : ad.status === 'inactive' ? '停用' : '已过期'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {formatPrice(ad.price)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {formatDate(ad.expires_at)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => window.open(ad.link_url, '_blank')}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="预览"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(ad)}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title="编辑"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(ad)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="删除"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 分页 */}
      {totalCount > 0 && (
        <div className="flex justify-center mt-6">
          <PaginationBar
            page={currentPage}
            pageSize={pageSize}
            total={totalCount}
            onChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            showSizeChanger={true}
            pageSizeOptions={['10', '20', '50', '100']}
          />
        </div>
      )}

      {/* 创建/编辑模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 pt-20">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">
                {editingAd ? '编辑广告' : '新建广告'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <CloseOutlined className="text-xl" />
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      跳转链接 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={formData.link_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      广告位块ID <span className="text-red-500">*</span>
                    </label>
                    <Select
                      showSearch
                      placeholder="搜索并选择广告位块"
                      value={formData.block_id || undefined}
                      onChange={(value) => {
                        setFormData(prev => ({ ...prev, block_id: value }));
                        // 根据块ID自动设置价格
                        const price = getBlockPrice(value);
                        setFormData(prev => ({ ...prev, price }));
                      }}
                      style={{ width: '100%' }}
                      suffixIcon={<SearchOutlined />}
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={[
                        ...LAYOUT_PAGES.flatMap(page => 
                          page.layout.map(block => ({
                            value: block.blockId,
                            label: `${block.blockId} (${page.name} - ¥${getBlockPrice(block.blockId)})`,
                            key: `${page.id}-${block.blockId}`
                          }))
                        )
                      ]}
                      listHeight={200}
                      className="h-[42px]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      层级
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={formData.z_index}
                      onChange={(e) => setFormData(prev => ({ ...prev, z_index: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* 图片上传区域 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      广告图片
                    </label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-4">
                      {imagePreview ? (
                        <div className="text-center">
                          <img 
                            src={imagePreview.startsWith('http') ? imagePreview : getFullImageUrl(imagePreview)} 
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      联系方式 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.contact_info}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_info: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="输入联系方式（电话、微信、QQ、邮箱等）"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      价格（元）<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                      readOnly
                      title="价格根据选择的块ID自动计算"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      过期时间 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.expires_at}
                      onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
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

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? '提交中...' : (editingAd ? '更新' : '创建')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      </div>
    </LicenseGuard>
  );
}