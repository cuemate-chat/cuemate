import {
    ArrowPathIcon,
    EyeIcon,
    MagnifyingGlassIcon,
    PencilIcon,
    PlusIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import { Modal, Select } from 'antd';
import { useEffect, useState } from 'react';
import {
    deletePixelAd,
    getBlockConfigs,
    listAdsPixel,
    type BlockConfig,
    type PixelAd
} from '../../api/ads';
import LicenseGuard from '../../components/LicenseGuard';
import { message } from '../../components/Message';
import PageLoading from '../../components/PageLoading';
import PaginationBar from '../../components/PaginationBar';
import { useLoading } from '../../hooks/useLoading';
import CreateAdDrawer from './CreateAdDrawer';
import EditAdDrawer from './EditAdDrawer';

export default function AdsManagementList() {
  const [ads, setAds] = useState<PixelAd[]>([]);
  const { loading, start: startLoading, end: endLoading } = useLoading();
  const { loading: operationLoading, start: startOperation, end: endOperation } = useLoading();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [blockFilter, setBlockFilter] = useState<string>('');
  
  // 块配置相关状态
  const [allBlocks, setAllBlocks] = useState<BlockConfig[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);

  // 侧拉弹框状态
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [currentEditAd, setCurrentEditAd] = useState<PixelAd | null>(null);

  // 获取所有块配置
  const fetchBlockConfigs = async () => {
    setLoadingBlocks(true);
    try {
      const data = await getBlockConfigs();
      setAllBlocks(data.blockConfigs);
    } catch (error) {
      message.error('获取所有广告块失败');
    } finally {
      setLoadingBlocks(false);
    }
  };

  // 获取广告列表
  const fetchAds = async (page = 1, limit = pageSize, search = '', status = '', block = '') => {
    startLoading();
    try {
      const data = await listAdsPixel({
        page,
        limit,
        search: search || undefined,
        status: status || undefined,
        block_config_id: block || undefined,
      });
      setAds(data.ads);
      setTotalCount(data.pagination.total);
    } catch {
      
    } finally {
      await endLoading();
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
        startOperation();
        try {
          await deletePixelAd(ad.id);
          message.success('广告删除成功');
          fetchAds(currentPage, pageSize, searchTerm, statusFilter, blockFilter);
        } catch {
          
        } finally {
          await endOperation();
        }
      }
    });
  };

  // 打开编辑侧拉弹框
  const handleEdit = (ad: PixelAd) => {
    setCurrentEditAd(ad);
    setEditDrawerOpen(true);
  };

  // 打开新建侧拉弹框
  const handleCreate = () => {
    setCreateDrawerOpen(true);
  };

  // 处理跳转链接预览
  const handlePreviewLink = (ad: PixelAd) => {
    Modal.confirm({
      title: '确认跳转',
      content: (
        <div className="space-y-3">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            即将跳转到以下链接：
          </div>
          <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded border dark:border-slate-600 text-sm break-all dark:text-slate-100">
            {ad.link_url}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            链接将在新窗口中打开
          </div>
        </div>
      ),
      okText: '确认跳转',
      cancelText: '取消',
      onOk: () => {
        window.open(ad.link_url, '_blank', 'noopener,noreferrer');
      }
    });
  };

  // 分页处理
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchAds(page, pageSize, searchTerm, statusFilter, blockFilter);
  };

  // 分页大小变化处理
  const handlePageSizeChange = (current: number, size: number) => {
    void current;
    setPageSize(size);
    setCurrentPage(1);
    fetchAds(1, size, searchTerm, statusFilter, blockFilter);
  };

  // 搜索处理
  const handleSearch = () => {
    setCurrentPage(1);
    fetchAds(1, pageSize, searchTerm, statusFilter, blockFilter);
  };

  // 重置搜索
  const handleReset = () => {
    Modal.confirm({
      title: '确认重置搜索条件',
      content: (
        <div className="space-y-2">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            此操作将清除所有筛选和搜索条件，并返回到第一页
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            包括：搜索关键词、状态筛选、块信息筛选
          </div>
        </div>
      ),
      okText: '确认重置',
      cancelText: '取消',
      onOk: () => {
        setSearchTerm('');
        setStatusFilter('');
        setBlockFilter('');
        setCurrentPage(1);
        fetchAds(1, pageSize, '', '', '');
      }
    });
  };

  // 格式化日期
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  // 格式化价格
  const formatPrice = (price: number | undefined | null) => {
    if (price == null) return '¥0.00';
    return `¥${price.toFixed(2)}`;
  };

  useEffect(() => {
    fetchAds(1, pageSize, '', '', '');
    fetchBlockConfigs();
  }, []);

  // 删除操作时显示全屏 loading
  if (operationLoading) {
    return <PageLoading tip="正在删除广告，请稍候..." type="saving" />;
  }

  return (
    <LicenseGuard feature="ads_management">
      <div className="p-6 max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">广告管理</h1>
          <p className="text-slate-600 dark:text-slate-400">管理像素广告的创建、编辑和删除</p>
        </div>

        {/* 搜索和筛选 */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">搜索广告</label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索广告标题或描述..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
            
            <div className="w-full lg:w-48">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">块信息筛选</label>
              <Select
                showSearch
                value={blockFilter}
                onChange={(value) => setBlockFilter(value)}
                placeholder="选择广告块"
                style={{ width: '100%' }}
                allowClear
                className="h-[42px]"
                loading={loadingBlocks}
                filterOption={(input, option) =>
                  (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={allBlocks.map((block: BlockConfig) => ({
                  value: block.id,
                  label: `${block.block_id} (${block.width}x${block.height} - ¥${block.price})`,
                  key: block.id
                }))}
              />
            </div>

            <div className="w-full lg:w-48">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">状态筛选</label>
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
          <div className="text-sm text-slate-600 dark:text-slate-400">
            共 {ads.length} 条广告
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchAds(currentPage, pageSize, searchTerm, statusFilter, blockFilter);
                message.success('已刷新广告列表');
              }}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              新建广告
            </button>
          </div>
        </div>

        {/* 广告列表 */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {loading ? (
            <PageLoading tip="加载广告列表..." />
          ) : ads.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-slate-400 dark:text-slate-500 mb-2">暂无广告</div>
              <button
                onClick={handleCreate}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                创建第一个广告
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ tableLayout: 'fixed' }}>
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider" style={{ width: '6%' }}>
                      序号
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider" style={{ width: '21%' }}>
                      广告信息
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider" style={{ width: '10%' }}>
                      块信息
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider" style={{ width: '12%' }}>
                      位置/尺寸
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider" style={{ width: '8%' }}>
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider" style={{ width: '8%' }}>
                      价格
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider" style={{ width: '15%' }}>
                      过期时间
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider" style={{ width: '15%' }}>
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {ads.map((ad, index) => (
                    <tr key={ad.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 font-medium">
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{ad.title}</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{ad.description}</div>
                          <div className="text-xs text-blue-600 mt-1 truncate">
                            <button 
                              onClick={() => handlePreviewLink(ad)} 
                              className="hover:underline text-left break-all"
                            >
                              {ad.link_url}
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                        <div className="text-xs text-slate-500 dark:text-slate-400">块 ID</div>
                        <div className="font-medium text-blue-600">{ad.block_id || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                        <div>({ad.x || 0}, {ad.y || 0})</div>
                        <div className="text-slate-500 dark:text-slate-400">{ad.width || 0} × {ad.height || 0}</div>
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
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                        {formatPrice(ad.price)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                        {formatDate(ad.expires_at)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handlePreviewLink(ad)}
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

        {/* 侧拉弹框组件 */}
        <CreateAdDrawer
          open={createDrawerOpen}
          onClose={() => setCreateDrawerOpen(false)}
          onSuccess={() => {
            setCreateDrawerOpen(false);
            fetchAds(currentPage, pageSize, searchTerm, statusFilter, blockFilter);
          }}
        />

        <EditAdDrawer
          open={editDrawerOpen}
          onClose={() => setEditDrawerOpen(false)}
          ad={currentEditAd}
          onSuccess={() => {
            setEditDrawerOpen(false);
            fetchAds(currentPage, pageSize, searchTerm, statusFilter, blockFilter);
          }}
        />
      </div>
    </LicenseGuard>
  );
}
