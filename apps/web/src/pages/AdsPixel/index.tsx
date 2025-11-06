import EyeIcon from '@heroicons/react/16/solid/EyeIcon';
import {
  ArrowPathIcon,
  ArrowsPointingOutIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  ComputerDesktopIcon,
  CurrencyDollarIcon,
  LinkIcon,
  PaintBrushIcon,
  PhotoIcon,
  SparklesIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Select } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getBlockConfigs, getPublicActiveAds, type BlockConfig, type PixelAd } from '../../api/ads';
import { message } from '../../components/Message';
import PageLoading from '../../components/PageLoading';
import { useLoading } from '../../hooks/useLoading';
import { WEB_API_BASE } from '../../config';
import MockUploadDrawer from './MockUploadDrawer';

interface AdBlock extends BlockConfig {
  ad?: PixelAd;
  isAvailable: boolean;
  pixelX: number;    // 百分比位置
  pixelY: number;
  pixelWidth: number; // 百分比大小
  pixelHeight: number;
}

// 获取图片 URL 的辅助函数
const getImageUrl = (imagePath: string): string => {
  // 如果是 blob URL（模拟上传的图片），直接返回
  if (imagePath.startsWith('blob:')) {
    return imagePath;
  }
  
  // 如果是完整的 HTTP URL，直接返回
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // 如果是本地开发环境（端口 5174），使用完整的 API 地址
  if (window.location.port === '5174' || window.location.hostname === 'localhost') {
    return `${WEB_API_BASE}${imagePath}`;
  }
  
  // 生产环境（nginx 代理），直接使用相对路径
  return imagePath;
};


export default function AdsPixel() {
  const [ads, setAds] = useState<PixelAd[]>([]);
  const [blockConfigs, setBlockConfigs] = useState<BlockConfig[]>([]);
  const { loading, start: startLoading, end: endLoading } = useLoading();
  const [adBlocks, setAdBlocks] = useState<AdBlock[]>([]);
  const [hoveredBlock, setHoveredBlock] = useState<AdBlock | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<AdBlock | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  
  // UI 控制
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(false); // 操作指南折叠状态
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false); // 状态图例折叠状态
  
  // 模拟上传的临时数据
  const [tempAds, setTempAds] = useState<Record<string, { title: string; image: string; link?: string }>>({});
  
  // 筛选和高亮
  const [selectedBlockFilter, setSelectedBlockFilter] = useState<string>('');
  const [highlightedBlockId, setHighlightedBlockId] = useState<string>('');
  
  const containerRef = useRef<HTMLDivElement>(null);

  // 获取活跃广告和块配置并初始化布局
  const fetchData = async () => {
    startLoading();
    try {
      const [adsResponse, blockConfigsResponse] = await Promise.all([
        getPublicActiveAds(),
        getBlockConfigs()
      ]);

      const adsData = adsResponse.ads || [];
      const blockConfigsData = blockConfigsResponse.blockConfigs || [];

      setAds(adsData);
      setBlockConfigs(blockConfigsData);
      initializeAdBlocks(adsData, blockConfigsData);
    } catch (error) {
      // HTTP 客户端已经处理了错误提示，这里不再重复弹出
      console.error('获取数据失败:', error);
    } finally {
      await endLoading();
    }
  };


  // 使用块配置数据初始化广告块 - 基于百分比计算位置和大小
  const initializeAdBlocks = (adsData: PixelAd[], blockConfigsData: BlockConfig[]) => {
    const blocks: AdBlock[] = blockConfigsData.map(config => {
      // 查找该块对应的广告
      let ad = adsData.find(ad => ad.block_id === config.block_id);
      
      // 如果没有真实广告，检查是否有临时上传的数据
      if (!ad && tempAds[config.block_id]) {
        const tempAd = tempAds[config.block_id];
        ad = {
          id: `temp-${config.block_id}`,
          block_id: config.block_id,
          title: tempAd.title,
          description: '模拟上传的广告',
          image_path: tempAd.image,
          link_url: tempAd.link || '',
          contact_info: '',
          notes: '临时数据，刷新后消失',
          x: config.x,
          y: config.y, 
          width: config.width,
          height: config.height,
          type: config.type,
          price: config.price,
          expires_at: Date.now() + 24 * 60 * 60 * 1000, // 24 小时后过期
        } as PixelAd;
      }
      
      // 计算基于百分比的位置和大小
      // 32 列 = 100%宽度，20 行 = 100%高度
      const GRID_COLS = 32;
      const GRID_ROWS = 20;
      const leftPercent = (config.x / GRID_COLS) * 100;
      const topPercent = (config.y / GRID_ROWS) * 100;
      const widthPercent = (config.width / GRID_COLS) * 100;
      const heightPercent = (config.height / GRID_ROWS) * 100;
      
      return {
        ...config,
        ad,
        isAvailable: Boolean(!ad || (ad.expires_at && ad.expires_at < Date.now())),
        // 存储百分比值
        pixelX: leftPercent,
        pixelY: topPercent,
        pixelWidth: widthPercent,
        pixelHeight: heightPercent,
      };
    });
    
    setAdBlocks(blocks);
  };

  // 格式化时间
  const formatExpireTime = (timestamp: number) => {
    const now = Date.now();
    const diff = timestamp - now;
    
    if (diff < 0) return '已过期';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}天后过期`;
    if (hours > 0) return `${hours}小时后过期`;
    return '即将过期';
  };

  // 处理块点击
  const handleBlockClick = (block: AdBlock) => {
    if (block.ad && block.ad.link_url) {
      // 有广告且有链接，跳转
      window.open(block.ad.link_url, '_blank', 'noopener,noreferrer');
    } else if (block.isAvailable) {
      // 空闲块，显示模拟上传界面
      setSelectedBlock(block);
      setShowUploadModal(true);
    }
  };

  // 模拟上传处理
  // 处理块筛选 - 照抄广告管理页面的逻辑
  const handleBlockFilter = (blockConfigId: string) => {
    setSelectedBlockFilter(blockConfigId);
    // 根据选中的块配置 ID 找到对应的 block_id 进行高亮
    const selectedBlock = blockConfigs.find(b => b.id === blockConfigId);
    if (selectedBlock) {
      setHighlightedBlockId(selectedBlock.block_id);
    } else {
      setHighlightedBlockId('');
    }
  };

  const handleMockUpload = (file: File) => {
    if (!selectedBlock || !file) {
      message.error('请选择要上传的图片！');
      return;
    }

    // 创建图片 URL
    const imageUrl = URL.createObjectURL(file);
    
    // 添加到临时数据
    setTempAds(prev => {
      const newTempAds = {
        ...prev,
        [selectedBlock.block_id]: {
          title: `模拟广告 - ${selectedBlock.block_id}`,
          image: imageUrl,
          link: '#'
        }
      };
      return newTempAds;
    });
    
    const price = selectedBlock.price || 100;
    message.success(`模拟上传到块 ${selectedBlock.block_id} 成功！价格: ¥${price}`);
    setShowUploadModal(false);
    setSelectedBlock(null);
  };
  



  // 获取块的样式
  const getBlockStyle = (block: AdBlock) => {
    let bgColor, borderColor, textColor = '#1f2937'; // 默认深色文字
    
    if (block.ad) {
      if (block.ad.expires_at && block.ad.expires_at < Date.now()) {
        // 过期状态 - 红色系
        bgColor = 'linear-gradient(135deg, #fee2e2, #fecaca)';
        borderColor = '#ef4444';
        textColor = '#7f1d1d';
      } else {
        // 有广告状态 - 蓝色系
        bgColor = 'linear-gradient(135deg, #dbeafe, #bfdbfe)';
        borderColor = '#3b82f6';
        textColor = '#1e3a8a';
      }
    } else {
      // 空闲状态 - 灰色系
      if (block.type === 'square') {
        bgColor = 'linear-gradient(135deg, #f8fafc, #e2e8f0)';
        borderColor = '#94a3b8';
      } else if (block.type === 'horizontal') {
        bgColor = 'linear-gradient(90deg, #f1f5f9, #e2e8f0)';
        borderColor = '#94a3b8';
      } else {
        bgColor = 'linear-gradient(180deg, #f1f5f9, #e2e8f0)';
        borderColor = '#94a3b8';
      }
      textColor = '#475569';
    }
    
    return {
      background: bgColor,
      borderColor: borderColor,
      color: textColor,
    };
  };



  // 全屏切换
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      message.error('全屏功能不可用:' + error);
    }
  };

  // 监听全屏状态变化
  const handleFullscreenChange = () => {
    const newFullscreenState = !!document.fullscreenElement;
    setIsFullscreen(newFullscreenState);
  };

  // 键盘快捷键
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'f':
      case 'F':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          toggleFullscreen();
        }
        break;
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);  // 只在组件加载时执行一次
  
  // 当临时广告数据变化时，重新初始化布局
  useEffect(() => {
    if (ads.length > 0 && blockConfigs.length > 0) {
      initializeAdBlocks(ads, blockConfigs);
    }
  }, [tempAds, ads, blockConfigs]);

  useEffect(() => {
    // 事件监听
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [handleKeyDown]);  // 事件监听的依赖

  if (loading) {
    return <PageLoading tip="加载像素广告位中..." />;
  }

  return (
    <div className={`h-screen flex flex-col bg-white dark:bg-slate-900 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* 添加炫酷的高亮动画 CSS */}
      <style>{`
        .highlight-glow {
          position: relative;
          animation: glow-pulse 2s ease-in-out infinite;
        }
        
        .highlight-glow::before {
          content: '';
          position: absolute;
          inset: -4px;
          padding: 4px;
          background: linear-gradient(45deg, #fbbf24, #f59e0b, #d97706, #fbbf24);
          background-size: 300% 300%;
          border-radius: inherit;
          z-index: -1;
          animation: gradient-rotate 3s linear infinite;
        }
        
        @keyframes glow-pulse {
          0%, 100% { 
            transform: scale(1.1); 
            filter: brightness(1.2) saturate(1.3);
          }
          50% { 
            transform: scale(1.15); 
            filter: brightness(1.4) saturate(1.5);
          }
        }
        
        @keyframes gradient-rotate {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
      {/* 控制工具栏 */}
      {!isFullscreen && (
        <div className="bg-white dark:bg-slate-800 shadow-lg border-b border-gray-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">像素广告位</h1>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                总块数: <span className="text-blue-600 dark:text-blue-400 font-medium">{blockConfigs.length}</span> |
                已占用: <span className="text-green-600 dark:text-green-400 font-medium">{adBlocks.filter(b => b.ad && !b.isAvailable).length}</span> |
                可用: <span className="text-orange-600 dark:text-orange-400 font-medium">{adBlocks.filter(b => b.isAvailable).length}</span> |
                比例: <span className="text-purple-600 dark:text-purple-400 font-medium">32×20</span>
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* 块信息筛选 - 直接照抄广告管理页面的实现 */}
              <div className="min-w-[250px]">
                <Select
                  showSearch
                  value={selectedBlockFilter ? selectedBlockFilter : undefined}
                  onChange={(value) => handleBlockFilter((value as string) || '')}
                  placeholder="全部"
                  style={{ width: '100%' }}
                  allowClear
                  className="h-[42px]"
                  loading={loading}
                  filterOption={(input, option) =>
                    (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={blockConfigs.map((block: BlockConfig) => ({
                    value: block.id,
                    label: `${block.block_id} (${block.width}x${block.height} - ¥${block.price})`,
                    key: block.id
                  }))}
                />
              </div>
              
              <button
                onClick={toggleFullscreen}
                className="p-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors shadow-sm"
                title="全屏 (Ctrl+F)"
              >
                <ArrowsPointingOutIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => fetchData()}
                className="px-3 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm shadow-sm flex items-center gap-2"
              >
                <ArrowPathIcon className="w-4 h-4" />
                刷新
              </button>
            </div>
          </div>

        </div>
      )}

      {/* 画布容器 - 铺满屏幕 */}
      <div className="flex-1 relative overflow-hidden bg-white dark:bg-slate-900">
        <div
          ref={containerRef}
          className="w-full h-full relative flex items-center justify-center"
          style={{ cursor: 'default' }}
        >
          {/* 广告块容器 - 16:10 比例完全铺满画布容器，居中显示 */}
          <div
            className="relative"
            style={{
              width: '100%',
              height: '100%',
              aspectRatio: '16/10', // 强制 16:10 比例
              maxWidth: '100%',
              maxHeight: '100%',
            }}
          >
            {/* 广告块 */}
            {adBlocks.map((block) => {
              const blockStyle = getBlockStyle(block);
              return (
                <div
                  key={block.id}
                  className={`absolute cursor-pointer transition-all duration-200 hover:z-10 flex items-center justify-center text-xs font-medium overflow-hidden ${
                    // 有图片的块完全无边框，没图片的块要边框
                    block.ad && block.ad.image_path 
                      ? 'border-0' // 确保有图片的块完全无边框
                      : 'border-2 hover:shadow-lg hover:border-blue-400'
                  } ${
                    // 炫酷高亮特效 - 凸出浮起的感觉 + 动态边框发光
                    highlightedBlockId === block.block_id
                      ? 'z-50 highlight-glow'
                      : ''
                  }`}
                  style={{
                    left: `${block.pixelX}%`,
                    top: `${block.pixelY}%`,
                    width: `${block.pixelWidth}%`,
                    height: `${block.pixelHeight}%`,
                    // 有图片的块完全清除背景和边框样式，实现无缝拼接
                    ...(block.ad && block.ad.image_path ? {
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      margin: 0,
                    } : blockStyle),
                    boxShadow: highlightedBlockId === block.block_id
                      ? '0 20px 40px rgba(0, 0, 0, 0.3), 0 0 0 3px #fbbf24, 0 0 20px #fbbf24, 0 0 40px #fbbf24, inset 0 0 20px rgba(251, 191, 36, 0.2)' // 炫酷 3D 浮起 + 发光边框 + 内发光
                      : hoveredBlock?.id === block.id 
                        ? (block.ad && block.ad.image_path 
                            ? '0 8px 16px rgba(59, 130, 246, 0.3)' // 图片块悬停时轻微阴影
                            : '0 8px 16px rgba(59, 130, 246, 0.5)') 
                        : block.ad && block.ad.image_path 
                          ? 'none' // 有图片的块默认完全无阴影
                          : '0 1px 3px rgba(0, 0, 0, 0.1)', // 无图片的块有轻微阴影
                  }}
                  onClick={() => handleBlockClick(block)}
                  onMouseEnter={() => setHoveredBlock(block)}
                  onMouseLeave={() => setHoveredBlock(null)}
                  title={block.ad ? 
                    `${block.ad.title} - ${block.ad.description}` : 
                    `空闲块 ${block.block_id} - 点击模拟上传`
                  }
                >
                  {/* 块内容 */}
                  <div className={`w-full h-full ${block.ad && block.ad.image_path ? 'p-0 m-0' : 'text-center flex flex-col justify-center relative z-10 p-1'}`}>
                    {block.ad && block.ad.image_path ? (
                      // 显示广告图片 - 完全填满块，实现无缝拼接效果
                      <div className="w-full h-full relative overflow-hidden" style={{ margin: 0, padding: 0, border: 'none' }}>
                        {(() => {
                          const imageUrl = getImageUrl(block.ad.image_path);
                          return (
                            <img 
                              src={imageUrl}
                              alt={block.ad.title}
                              className="w-full h-full object-cover block"
                              style={{ 
                                display: 'block',
                                margin: 0,
                                padding: 0,
                                border: 'none',
                                outline: 'none',
                                // 确保图片完全贴合边界
                                verticalAlign: 'top'
                              }}
                              onError={(e) => {
                                // 图片加载失败时显示文本
                                const target = e.target as HTMLElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `
                                    <div class="w-full h-full flex flex-col items-center justify-center text-center border-2 border-red-300 bg-red-50">
                                      <div class="font-bold text-red-700">${block.block_id}</div>
                                      <div class="text-xs truncate mt-1 font-medium text-red-600">${block.ad?.title || ''}</div>
                                      <div class="text-xs mt-1 text-red-500">图片加载失败</div>
                                    </div>
                                  `;
                                }
                              }}
                            />
                          );
                        })()}
                        {/* 图片上的覆盖信息 - 悬停时显示 */}
                        <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          <div className="text-white text-center text-xs">
                            <div className="font-bold">{block.block_id}</div>
                            <div className="truncate">{block.ad.title}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // 无图片或空闲块的文本显示 - 保持传统的有边框样式
                      <>
                        <div className="font-bold">{block.block_id}</div>
                        {block.ad ? (
                          <div className="text-xs truncate mt-1 font-medium">
                            {block.ad.title}
                          </div>
                        ) : (
                          <>
                            <div className="text-xs mt-1">点击上传</div>
                            {block.pixelWidth > 6 && block.pixelHeight > 10 && ( // 调整为百分比阈值
                              <div className="text-xs mt-1 font-bold text-green-600 flex items-center justify-center gap-1">
                                <CurrencyDollarIcon className="w-3 h-3" />
                                {block.price || 100}
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* 悬停效果 - 区分图片块和非图片块 */}
                  {hoveredBlock?.id === block.id && !(block.ad && block.ad.image_path) && (
                    <div className="absolute inset-0 bg-blue-100/30 animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 悬停信息面板 */}
        {hoveredBlock && (
          <div className="absolute top-4 left-4 bg-white dark:bg-slate-900 bg-opacity-95 backdrop-blur-sm p-4 rounded-lg shadow-xl text-sm max-w-xs z-30 border border-gray-200 dark:border-slate-700">
            <div className="font-semibold text-gray-900 dark:text-slate-100 text-lg flex items-center gap-2">
              <PhotoIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {hoveredBlock.block_id}
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-medium">
              块 ID: {hoveredBlock.block_id}
            </div>
            <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">
              网格位置: {hoveredBlock.x}, {hoveredBlock.y} | 
              网格大小: {hoveredBlock.width} × {hoveredBlock.height}
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              容器占比: {hoveredBlock.pixelWidth.toFixed(1)}% × {hoveredBlock.pixelHeight.toFixed(1)}%
            </div>
            {hoveredBlock.ad ? (
              <>
                <div className="text-sm text-blue-700 dark:text-blue-400 mt-3 font-medium">{hoveredBlock.ad.title}</div>
                <div className="text-xs text-gray-700 dark:text-slate-300 mt-1">{hoveredBlock.ad.description}</div>

                <div className="text-xs text-purple-700 dark:text-purple-400 mt-2 font-medium flex items-center gap-1">
                  <ClockIcon className="w-3 h-3" />
                  {formatExpireTime(hoveredBlock.ad.expires_at)}
                </div>
                <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 font-bold flex items-center gap-1">
                  <LinkIcon className="w-3 h-3" />
                  点击访问链接
                </div>
              </>
            ) : (
              <div className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                <div className="flex items-center gap-1 mb-1">
                  <SparklesIcon className="w-3 h-3" />
                  此块可用，点击可模拟上传广告
                </div>
                <div className="flex items-center gap-1">
                  <CurrencyDollarIcon className="w-3 h-3" />
                  价格: ¥{hoveredBlock.price || 100}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 操作指南 - 悬浮在最顶层，可折叠 */}
        <div className="absolute bottom-4 left-4 bg-white dark:bg-slate-900 bg-opacity-70 backdrop-blur-sm rounded-lg shadow-lg text-xs text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 transition-all duration-300 z-[9996]">
          <div className="flex items-center justify-between p-2 cursor-pointer" onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}>
            <div className="font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <ComputerDesktopIcon className="w-4 h-4" />
              操作指南
            </div>
            {isControlsCollapsed ? (
              <ChevronDownIcon className="w-4 h-4 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300" />
            ) : (
              <ChevronUpIcon className="w-4 h-4 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300" />
            )}
          </div>
          {!isControlsCollapsed && (
            <div className="px-3 pb-3 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <PhotoIcon className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                点击空闲块进行模拟上传
              </div>
              <div className="flex items-center gap-2 text-xs">
                <LinkIcon className="w-3 h-3 text-green-500 dark:text-green-400" />
                点击广告块访问链接
              </div>
              <div className="flex items-center gap-2 text-xs">
                <EyeIcon className="w-3 h-3 text-purple-500 dark:text-purple-400" />
                悬停查看详细信息
              </div>
              <div className="flex items-center gap-2 text-xs">
                <ArrowsPointingOutIcon className="w-3 h-3 text-orange-500 dark:text-orange-400" />
                Ctrl+F 全屏模式
              </div>
            </div>
          )}
        </div>

        {/* 状态图例 - 悬浮在最顶层，可折叠 */}
        <div className="absolute bottom-4 right-4 bg-white dark:bg-slate-900 bg-opacity-70 backdrop-blur-sm rounded-lg shadow-lg text-xs border border-gray-200 dark:border-slate-700 transition-all duration-300 z-[9996]">
          <div className="flex items-center justify-between p-2 cursor-pointer" onClick={() => setIsLegendCollapsed(!isLegendCollapsed)}>
            <div className="font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <PaintBrushIcon className="w-4 h-4" />
              状态图例
            </div>
            {isLegendCollapsed ? (
              <ChevronDownIcon className="w-4 h-4 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300" />
            ) : (
              <ChevronUpIcon className="w-4 h-4 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300" />
            )}
          </div>
          {!isLegendCollapsed && (
            <div className="px-3 pb-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border border-gray-400 dark:border-slate-600 rounded" style={{ background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)' }}></div>
                <span className="text-gray-700 dark:text-slate-300">空闲可用</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border border-blue-500 dark:border-blue-600 rounded" style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }}></div>
                <span className="text-blue-700 dark:text-blue-400">已占用</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border border-red-500 dark:border-red-600 rounded" style={{ background: 'linear-gradient(135deg, #fee2e2, #fecaca)' }}></div>
                <span className="text-red-700 dark:text-red-400">已过期</span>
              </div>
            </div>
          )}
        </div>

        {/* 全屏退出按钮 */}
        {isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 p-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-lg z-40"
            title="退出全屏"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        )}
        
      </div>

      {/* 模拟上传侧拉弹框 */}
      <MockUploadDrawer
        open={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setSelectedBlock(null);
        }}
        selectedBlock={selectedBlock}
        onUpload={handleMockUpload}
      />
    </div>
  );
}