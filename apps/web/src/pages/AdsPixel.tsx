import {
  ArrowPathIcon,
  ArrowsPointingOutIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  ComputerDesktopIcon,
  CurrencyDollarIcon,
  EyeIcon,
  LinkIcon,
  PaintBrushIcon,
  PencilIcon,
  PhoneIcon,
  PhotoIcon,
  SparklesIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getPublicActiveAds, type PixelAd } from '../api/pixel-ads';
import { message } from '../components/Message';
import { GRID_CONFIG, LAYOUT_PAGES, getBlockPrice, type BlockConfig } from '../data/pixelLayout';

interface AdBlock extends BlockConfig {
  ad?: PixelAd;
  isAvailable: boolean;
  pixelX: number;    // 实际像素位置
  pixelY: number;
  pixelWidth: number; // 实际像素大小
  pixelHeight: number;
}


export default function AdsPixel() {
  const [ads, setAds] = useState<PixelAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [adBlocks, setAdBlocks] = useState<AdBlock[]>([]);
  const [hoveredBlock, setHoveredBlock] = useState<AdBlock | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<AdBlock | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  
  // UI 控制
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(false); // 操作指南折叠状态
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false); // 状态图例折叠状态
  
  // 模拟上传的临时数据
  const [tempAds, setTempAds] = useState<Record<string, { title: string; image: string; link?: string }>>({});
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // 获取活跃广告并初始化块布局
  const fetchActiveAds = async () => {
    setLoading(true);
    try {
      const data = await getPublicActiveAds();
      const adsData = data.ads || [];
      setAds(adsData);
      initializeAdBlocks(adsData);
    } catch (error) {
      message.error('获取广告数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 计算网格单元大小 - 确保32:20网格完全铺满16:10比例的容器
  const calculateGridSize = () => {
    const containerElement = containerRef.current || document.querySelector('.flex-1.relative.overflow-hidden.bg-white');
    if (!containerElement) return 20; // 默认值
    
    const availableWidth = containerElement.clientWidth;
    const availableHeight = containerElement.clientHeight;
    
    // 32:20网格比例 = 1.6:1，正好是16:10比例
    // 计算每个网格单元的大小，确保完全铺满容器
    const gridUnitWidth = availableWidth / GRID_CONFIG.COLS; // 宽度 / 32
    const gridUnitHeight = availableHeight / GRID_CONFIG.ROWS; // 高度 / 20
    
    // 由于32:20 = 16:10，两者应该相等，选择较小的确保不溢出
    return Math.min(gridUnitWidth, gridUnitHeight);
  };

  // 使用预定义布局初始化广告块 - 基于百分比计算位置和大小
  const initializeAdBlocks = (adsData: PixelAd[]) => {
    const blocks: AdBlock[] = LAYOUT_PAGES[0].layout.map(config => {
      // 查找该块对应的广告
      let ad = adsData.find(ad => {
        // 优先使用block_id匹配
        if (ad.block_id) {
          return ad.block_id === config.blockId;
        }
        // 旧的位置匹配已不适用，因为现在使用百分比
        return false;
      });
      
      // 如果没有真实广告，检查是否有临时上传的数据
      if (!ad && tempAds[config.blockId]) {
        const tempAd = tempAds[config.blockId];
        ad = {
          id: `temp-${config.blockId}`,
          block_id: config.blockId,
          title: tempAd.title,
          description: '模拟上传的广告',
          image_path: tempAd.image,
          link_url: tempAd.link || '',
          contact_info: '',
          notes: '临时数据，刷新后消失',
          x_position: 0, // 不再使用像素位置
          y_position: 0,
          width: 0,
          height: 0,
          z_index: 1,
          expires_at: Date.now() + 24 * 60 * 60 * 1000, // 24小时后过期
          created_at: Date.now(),
          updated_at: Date.now()
        } as PixelAd;
      }
      
      // 计算基于百分比的位置和大小
      // 32列 = 100%宽度，20行 = 100%高度
      const leftPercent = (config.x / GRID_CONFIG.COLS) * 100; // x位置百分比
      const topPercent = (config.y / GRID_CONFIG.ROWS) * 100; // y位置百分比
      const widthPercent = (config.width / GRID_CONFIG.COLS) * 100; // 宽度百分比
      const heightPercent = (config.height / GRID_CONFIG.ROWS) * 100; // 高度百分比
      
      return {
        ...config,
        ad,
        isAvailable: Boolean(!ad || (ad.expires_at && ad.expires_at < Date.now())),
        // 存储百分比值而不是像素值
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
  const handleMockUpload = () => {
    if (!selectedBlock || !uploadedFile) {
      message.error('请选择要上传的图片！');
      return;
    }

    // 创建图片 URL
    const imageUrl = URL.createObjectURL(uploadedFile);
    
    // 添加到临时数据
    setTempAds(prev => ({
      ...prev,
      [selectedBlock.blockId]: {
        title: `模拟广告 - ${selectedBlock.blockId}`,
        image: imageUrl,
        link: '#'
      }
    }));
    
    const price = getBlockPrice(selectedBlock.blockId);
    message.success(`模拟上传到块 ${selectedBlock.blockId} 成功！价格: ¥${price}`);
    setShowUploadModal(false);
    setSelectedBlock(null);
    setUploadedFile(null);
  };
  
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



  // 全屏切换 - 保持当前缩放状态并重新计算布局
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
        // 延迟重新计算布局以确保全屏生效
        setTimeout(() => {
          initializeAdBlocks(ads);
        }, 100);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        // 延迟重新计算布局以确保退出全屏生效
        setTimeout(() => {
          initializeAdBlocks(ads);
        }, 100);
      }
    } catch (error) {
      message.error('全屏功能不可用:' + error);
    }
  };

  // 监听全屏状态变化 - 重新计算布局
  const handleFullscreenChange = () => {
    const newFullscreenState = !!document.fullscreenElement;
    setIsFullscreen(newFullscreenState);
    // 延迟重新计算布局
    setTimeout(() => {
      initializeAdBlocks(ads);
    }, 100);
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
    fetchActiveAds();
  }, []);  // 只在组件加载时执行一次
  
  // 当临时广告数据变化时，重新初始化布局
  useEffect(() => {
    if (ads.length > 0) {
      initializeAdBlocks(ads);
    }
  }, [tempAds, ads]);

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
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <span className="mt-4 text-gray-700 text-lg">加载像素广告位中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col bg-white ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* 控制工具栏 */}
      {!isFullscreen && (
        <div className={`bg-white shadow-lg border-b border-gray-200 px-6 transition-transform duration-300 ${
          isToolbarCollapsed ? '-translate-y-full' : 'translate-y-0'
        } ${isToolbarCollapsed ? 'py-2' : 'py-4'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">像素广告位</h1>
              <p className="text-sm text-gray-600 mt-1">
                总块数: <span className="text-blue-600 font-medium">{GRID_CONFIG.TOTAL_BLOCKS}</span> | 
                已占用: <span className="text-green-600 font-medium">{adBlocks.filter(b => b.ad && !b.isAvailable).length}</span> | 
                可用: <span className="text-orange-600 font-medium">{adBlocks.filter(b => b.isAvailable).length}</span> |
                比例: <span className="text-purple-600 font-medium">{GRID_CONFIG.COLS}×{GRID_CONFIG.ROWS}</span>
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={toggleFullscreen}
                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                title="全屏 (Ctrl+F)"
              >
                <ArrowsPointingOutIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => fetchActiveAds()}
                className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm shadow-sm flex items-center gap-2"
              >
                <ArrowPathIcon className="w-4 h-4" />
                刷新
              </button>
              <button
                onClick={() => setIsToolbarCollapsed(!isToolbarCollapsed)}
                className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                title="折叠工具栏"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

        </div>
      )}

      {/* 画布容器 - 铺满屏幕 */}
      <div className="flex-1 relative overflow-hidden bg-white">
        <div
          ref={containerRef}
          className="w-full h-full relative flex items-center justify-center"
          style={{ cursor: 'default' }}
        >
          {/* 广告块容器 - 16:10比例完全铺满画布容器，居中显示 */}
          <div
            className="relative"
            style={{
              width: '100%',
              height: '100%',
              aspectRatio: '16/10', // 强制16:10比例
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
                  className="absolute border-2 cursor-pointer transition-all duration-200 hover:z-10 hover:shadow-lg hover:border-blue-400 flex items-center justify-center text-xs font-medium overflow-hidden"
                  style={{
                    left: `${block.pixelX}%`,
                    top: `${block.pixelY}%`,
                    width: `${block.pixelWidth}%`,
                    height: `${block.pixelHeight}%`,
                    ...blockStyle,
                    boxShadow: hoveredBlock?.id === block.id 
                      ? '0 0 15px rgba(59, 130, 246, 0.5)' 
                      : '0 1px 3px rgba(0, 0, 0, 0.1)',
                  }}
                  onClick={() => handleBlockClick(block)}
                  onMouseEnter={() => setHoveredBlock(block)}
                  onMouseLeave={() => setHoveredBlock(null)}
                  title={block.ad ? 
                    `${block.ad.title} - ${block.ad.description}` : 
                    `空闲块 ${block.blockId} - 点击模拟上传`
                  }
                >
                  {/* 块内容 */}
                  <div className={`text-center w-full h-full flex flex-col justify-center relative z-10 ${block.ad && block.ad.image_path ? '' : 'p-1'}`}>
                    {block.ad && block.ad.image_path ? (
                      // 显示广告图片 - 填满整个块，无padding和border
                      <div className="w-full h-full relative overflow-hidden">
                        <img 
                          src={block.ad.image_path}
                          alt={block.ad.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // 图片加载失败时显示文本
                            const target = e.target as HTMLElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `
                                <div class="w-full h-full flex flex-col items-center justify-center text-center">
                                  <div class="font-bold">${block.blockId}</div>
                                  <div class="text-xs truncate mt-1 font-medium">${block.ad?.title || ''}</div>
                                  <div class="text-xs mt-1 text-red-500">图片加载失败</div>
                                </div>
                              `;
                            }
                          }}
                        />
                        {/* 图片上的覆盖信息 */}
                        <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          <div className="text-white text-center text-xs">
                            <div className="font-bold">{block.blockId}</div>
                            <div className="truncate">{block.ad.title}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // 无图片或空闲块的文本显示
                      <div className="text-center">
                        <div className="font-bold">{block.blockId}</div>
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
                                {getBlockPrice(block.blockId)}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* 悬停效果 */}
                  {hoveredBlock?.id === block.id && (
                    <div className="absolute inset-0 bg-blue-100/30 animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 悬停信息面板 */}
        {hoveredBlock && (
          <div className="absolute top-4 left-4 bg-white bg-opacity-95 backdrop-blur-sm p-4 rounded-lg shadow-xl text-sm max-w-xs z-30 border border-gray-200">
            <div className="font-semibold text-gray-900 text-lg flex items-center gap-2">
              <PhotoIcon className="w-5 h-5 text-blue-600" />
              {hoveredBlock.blockId}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              网格位置: {hoveredBlock.x}, {hoveredBlock.y} | 
              网格大小: {hoveredBlock.width} × {hoveredBlock.height}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              容器占比: {hoveredBlock.pixelWidth.toFixed(1)}% × {hoveredBlock.pixelHeight.toFixed(1)}%
            </div>
            {hoveredBlock.ad ? (
              <>
                <div className="text-sm text-blue-700 mt-3 font-medium">{hoveredBlock.ad.title}</div>
                <div className="text-xs text-gray-700 mt-1">{hoveredBlock.ad.description}</div>
                {hoveredBlock.ad.contact_info && (
                  <div className="text-xs text-green-700 mt-1 flex items-center gap-1">
                    <PhoneIcon className="w-3 h-3" />
                    {hoveredBlock.ad.contact_info}
                  </div>
                )}
                {hoveredBlock.ad.notes && (
                  <div className="text-xs text-orange-700 mt-1 flex items-center gap-1">
                    <PencilIcon className="w-3 h-3" />
                    {hoveredBlock.ad.notes}
                  </div>
                )}
                <div className="text-xs text-purple-700 mt-2 font-medium flex items-center gap-1">
                  <ClockIcon className="w-3 h-3" />
                  {formatExpireTime(hoveredBlock.ad.expires_at)}
                </div>
                <div className="text-xs text-emerald-700 mt-1 font-bold flex items-center gap-1">
                  <LinkIcon className="w-3 h-3" />
                  点击访问链接
                </div>
              </>
            ) : (
              <div className="text-xs text-gray-500 mt-2">
                <div className="flex items-center gap-1 mb-1">
                  <SparklesIcon className="w-3 h-3" />
                  此块可用，点击可模拟上传广告
                </div>
                <div className="flex items-center gap-1">
                  <CurrencyDollarIcon className="w-3 h-3" />
                  价格: ¥{getBlockPrice(hoveredBlock.blockId)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 操作指南 - 悬浮在最顶层，可折叠 */}
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-70 backdrop-blur-sm rounded-lg shadow-lg text-xs text-gray-700 border border-gray-200 transition-all duration-300 z-[9999]">
          <div className="flex items-center justify-between p-2 cursor-pointer" onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}>
            <div className="font-semibold text-gray-900 flex items-center gap-2">
              <ComputerDesktopIcon className="w-4 h-4" />
              操作指南
            </div>
            {isControlsCollapsed ? (
              <ChevronDownIcon className="w-4 h-4 text-gray-500 hover:text-gray-700" />
            ) : (
              <ChevronUpIcon className="w-4 h-4 text-gray-500 hover:text-gray-700" />
            )}
          </div>
          {!isControlsCollapsed && (
            <div className="px-3 pb-3 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <PhotoIcon className="w-3 h-3 text-blue-500" />
                点击空闲块进行模拟上传
              </div>
              <div className="flex items-center gap-2 text-xs">
                <LinkIcon className="w-3 h-3 text-green-500" />
                点击广告块访问链接
              </div>
              <div className="flex items-center gap-2 text-xs">
                <EyeIcon className="w-3 h-3 text-purple-500" />
                悬停查看详细信息
              </div>
              <div className="flex items-center gap-2 text-xs">
                <ArrowsPointingOutIcon className="w-3 h-3 text-orange-500" />
                Ctrl+F 全屏模式
              </div>
            </div>
          )}
        </div>

        {/* 状态图例 - 悬浮在最顶层，可折叠 */}
        <div className="absolute bottom-4 right-4 bg-white bg-opacity-70 backdrop-blur-sm rounded-lg shadow-lg text-xs border border-gray-200 transition-all duration-300 z-[9999]">
          <div className="flex items-center justify-between p-2 cursor-pointer" onClick={() => setIsLegendCollapsed(!isLegendCollapsed)}>
            <div className="font-semibold text-gray-900 flex items-center gap-2">
              <PaintBrushIcon className="w-4 h-4" />
              状态图例
            </div>
            {isLegendCollapsed ? (
              <ChevronDownIcon className="w-4 h-4 text-gray-500 hover:text-gray-700" />
            ) : (
              <ChevronUpIcon className="w-4 h-4 text-gray-500 hover:text-gray-700" />
            )}
          </div>
          {!isLegendCollapsed && (
            <div className="px-3 pb-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border border-gray-400 rounded" style={{ background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)' }}></div>
                <span className="text-gray-700">空闲可用</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border border-blue-500 rounded" style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }}></div>
                <span className="text-blue-700">已占用</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border border-red-500 rounded" style={{ background: 'linear-gradient(135deg, #fee2e2, #fecaca)' }}></div>
                <span className="text-red-700">已过期</span>
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
        
        {/* 折叠工具栏时显示按钮 */}
        {isToolbarCollapsed && !isFullscreen && (
          <button
            onClick={() => setIsToolbarCollapsed(false)}
            className="fixed top-2 right-1/2 transform translate-x-1/2 z-50 bg-gray-800 bg-opacity-80 text-white px-4 py-2 rounded-b-lg shadow-lg hover:bg-opacity-90 transition-all"
            title="展开工具栏"
          >
            ↓ 展开工具栏
          </button>
        )}
      </div>

      {/* 模拟上传弹窗 */}
      {showUploadModal && selectedBlock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white border border-gray-300 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 flex items-center gap-2">
              <PhotoIcon className="w-6 h-6 text-blue-600" />
              模拟上传到块 {selectedBlock.blockId}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <EyeIcon className="w-4 h-4" />
                  块信息
                </label>
                <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 border border-gray-200">
                  <div>网格位置: {selectedBlock.x}, {selectedBlock.y}</div>
                  <div>网格大小: {selectedBlock.width} × {selectedBlock.height}</div>
                  <div>像素大小: {selectedBlock.pixelWidth} × {selectedBlock.pixelHeight} px</div>
                  <div>块类型: <span className="text-blue-600">{selectedBlock.type === 'square' ? '正方形' : selectedBlock.type === 'horizontal' ? '横长方形' : '竖长方形'}</span></div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <PhotoIcon className="w-4 h-4" />
                  上传文件
                </label>
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
                  onDrop={handleFileDrop}
                  onDragOver={handleDragOver}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  {uploadedFile ? (
                    <div className="space-y-2">
                      <img 
                        src={URL.createObjectURL(uploadedFile)} 
                        alt="预览" 
                        className="max-w-full max-h-32 mx-auto rounded" 
                      />
                      <div className="text-sm text-green-600 font-medium">{uploadedFile.name}</div>
                      <div className="text-xs text-gray-500">点击更换图片</div>
                    </div>
                  ) : (
                    <div>
                      <PhotoIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <div className="text-gray-600">
                        点击或拖拽图片到此处<br/>
                        <span className="text-xs text-gray-500">支持 JPG, PNG, GIF 格式</span>
                      </div>
                    </div>
                  )}
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleMockUpload}
                disabled={!uploadedFile}
                className={`px-6 py-2 text-white rounded-lg transition-all shadow-lg ${
                  uploadedFile 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {uploadedFile ? '模拟上传' : '请选择图片'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}