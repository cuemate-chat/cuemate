import {
  ArrowsPointingOutIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Tabs } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { message } from '../components/Message';
import { GRID_CONFIG, LAYOUT_PAGES, getBlockPrice, type BlockConfig, type LayoutPage } from '../data/pixelLayout';

interface PixelAd {
  id: string;
  title: string;
  description: string;
  link_url: string;
  image_path: string;
  block_id?: string; // 块ID字段
  x_position: number;
  y_position: number;
  width: number;
  height: number;
  z_index: number;
  expires_at: number;
  contact_info?: string;
  notes?: string; // 备注字段
}

interface AdBlock extends BlockConfig {
  ad?: PixelAd;
  isAvailable: boolean;
  pixelX: number;    // 实际像素位置
  pixelY: number;
  pixelWidth: number; // 实际像素大小
  pixelHeight: number;
}

interface ViewportInfo {
  x: number;
  y: number;
  scale: number;
}

const MIN_SCALE = 0.1;  // 允许缩小到10%
const MAX_SCALE = 5;    // 允许放大到500%

export default function PixelAds() {
  const [ads, setAds] = useState<PixelAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [adBlocks, setAdBlocks] = useState<AdBlock[]>([]);
  const [hoveredBlock, setHoveredBlock] = useState<AdBlock | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<AdBlock | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState<LayoutPage>(LAYOUT_PAGES[0]);
  
  // 视口控制
  const [viewport, setViewport] = useState<ViewportInfo>({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);

  // 获取活跃广告并初始化块布局
  const fetchActiveAds = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pixel-ads/public/active');
      if (response.ok) {
        const data = await response.json();
        const adsData = data.ads || [];
        setAds(adsData);
        initializeAdBlocks(adsData);
      } else {
        message.error('获取广告数据失败');
      }
    } catch (error) {
      message.error('获取广告数据出错:' + error);
    } finally {
      setLoading(false);
    }
  };

  // 计算自适应的网格大小 - 100%填满屏幕
  const calculateGridSize = () => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight - (isFullscreen ? 0 : 80); // 减去工具栏高度
    
    // 完全填满屏幕 - 使用较大的值确保铺满
    const gridUnitWidth = screenWidth / GRID_CONFIG.COLS;
    const gridUnitHeight = screenHeight / GRID_CONFIG.ROWS;
    
    // 选择能完全填满的大小
    return Math.max(gridUnitWidth, gridUnitHeight);
  };

  // 使用预定义布局初始化广告块
  const initializeAdBlocks = (adsData: PixelAd[]) => {
    const baseGridSize = calculateGridSize();
    
    const blocks: AdBlock[] = currentPage.layout.map(config => {
      // 查找该块对应的广告
      const ad = adsData.find(ad => {
        // 优先使用block_id匹配
        if (ad.block_id) {
          return ad.block_id === config.blockId;
        } else {
          // 兼容旧数据，使用位置匹配
          const blockPixelX = config.x * baseGridSize;
          const blockPixelY = config.y * baseGridSize;
          const blockPixelW = config.width * baseGridSize;
          const blockPixelH = config.height * baseGridSize;
          
          return ad.x_position >= blockPixelX && 
                 ad.x_position < blockPixelX + blockPixelW &&
                 ad.y_position >= blockPixelY && 
                 ad.y_position < blockPixelY + blockPixelH;
        }
      });
      
      return {
        ...config,
        ad,
        isAvailable: Boolean(!ad || (ad.expires_at && ad.expires_at < Date.now())),
        pixelX: config.x * baseGridSize,
        pixelY: config.y * baseGridSize,
        pixelWidth: config.width * baseGridSize,
        pixelHeight: config.height * baseGridSize,
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
    if (isDragging) return; // 拖拽时不响应点击
    
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
    const price = selectedBlock ? getBlockPrice(selectedBlock.blockId, currentPage.priceMultiplier) : 0;
    message.success(`模拟上传到块 ${selectedBlock?.blockId} 成功！价格: ¥${price}`);
    setShowUploadModal(false);
    setSelectedBlock(null);
  };

  // 切换页面标签
  const handleTabChange = (key: string) => {
    const newPage = LAYOUT_PAGES.find(page => page.id === key);
    if (newPage) {
      setCurrentPage(newPage);
      // 重新初始化布局
      setTimeout(() => {
        initializeAdBlocks(ads);
      }, 50);
    }
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


  // 缩放处理
  const handleZoom = (delta: number, centerX?: number, centerY?: number) => {
    void centerX; void centerY;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, viewport.scale * delta));
    if (newScale !== viewport.scale) {
      setViewport(prev => ({
        ...prev,
        scale: newScale,
      }));
    }
  };

  // 滚轮缩放
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      handleZoom(delta, e.clientX - rect.left, e.clientY - rect.top);
    }
  };

  // 拖拽开始
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  // 拖拽移动
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - lastMousePos.x;
      const deltaY = e.clientY - lastMousePos.y;

      setViewport(prev => ({
        ...prev,
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));

      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  // 拖拽结束
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 重置视图
  const resetView = () => {
    setViewport({ x: 0, y: 0, scale: 1 });
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
      case '=':
      case '+':
        e.preventDefault();
        handleZoom(1.2);
        break;
      case '-':
        e.preventDefault();
        handleZoom(0.8);
        break;
      case 'r':
      case 'R':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          resetView();
        }
        break;
      case 'f':
      case 'F':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          toggleFullscreen();
        }
        break;
    }
  }, [viewport.scale]);

  useEffect(() => {
    fetchActiveAds();

    // 事件监听
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [handleKeyDown]);

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
        <div className="bg-white shadow-lg border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🎯 像素广告位</h1>
              <p className="text-sm text-gray-600 mt-1">
                当前: <span className="text-purple-600 font-medium">{currentPage.name}</span> | 
                总块数: <span className="text-blue-600 font-medium">{GRID_CONFIG.TOTAL_BLOCKS}</span> | 
                已占用: <span className="text-green-600 font-medium">{adBlocks.filter(b => b.ad && !b.isAvailable).length}</span> | 
                可用: <span className="text-orange-600 font-medium">{adBlocks.filter(b => b.isAvailable).length}</span> |
                比例: <span className="text-purple-600 font-medium">{GRID_CONFIG.COLS}×{GRID_CONFIG.ROWS}</span>
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleZoom(1.2)}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                title="放大 (+)"
              >
                <MagnifyingGlassPlusIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleZoom(0.8)}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                title="缩小 (-)"
              >
                <MagnifyingGlassMinusIcon className="w-5 h-5" />
              </button>
              <button
                onClick={resetView}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm shadow-sm"
                title="重置视图 (Ctrl+R)"
              >
                重置视图
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                title="全屏 (Ctrl+F)"
              >
                <ArrowsPointingOutIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => fetchActiveAds()}
                className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm shadow-sm"
              >
                🔄 刷新
              </button>
            </div>
          </div>

          {/* 页面标签 */}
          <Tabs
            activeKey={currentPage.id}
            onChange={handleTabChange}
            items={LAYOUT_PAGES.map(page => ({
              key: page.id,
              label: (
                <div className="text-center px-2">
                  <div className="font-medium">{page.name}</div>
                  <div className="text-xs text-gray-500">{page.description}</div>
                  <div className="text-xs font-bold text-blue-600">
                    价格倍数: {page.priceMultiplier}x
                  </div>
                </div>
              ),
            }))}
            size="large"
            className="pixel-ads-tabs"
          />
        </div>
      )}

      {/* 画布容器 - 铺满屏幕 */}
      <div className="flex-1 relative overflow-hidden bg-white">
        <div
          ref={containerRef}
          className="w-full h-full relative"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : 'default' }}
        >
          {/* 广告块容器 - 完全填满画布 */}
          <div
            className="absolute"
            style={{
              left: 0,
              top: 0,
              width: `${GRID_CONFIG.COLS * calculateGridSize()}px`,
              height: `${GRID_CONFIG.ROWS * calculateGridSize()}px`,
              transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
              transformOrigin: '0 0',
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
                    left: block.pixelX,
                    top: block.pixelY,
                    width: block.pixelWidth,
                    height: block.pixelHeight,
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
                  <div className="text-center p-1 w-full h-full flex flex-col justify-center relative z-10">
                    <div className="font-bold">{block.blockId}</div>
                    {block.ad ? (
                      <>
                        <div className="text-xs truncate mt-1 font-medium">
                          {block.ad.title}
                        </div>
                        {block.pixelWidth > 80 && block.pixelHeight > 60 && (
                          <div className="text-xs mt-1">
                            📷 {block.ad.image_path ? '有图片' : '无图片'}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="text-xs mt-1">点击上传</div>
                        {block.pixelWidth > 60 && block.pixelHeight > 40 && (
                          <div className="text-xs mt-1 font-bold text-green-600">
                            ¥{getBlockPrice(block.blockId, currentPage.priceMultiplier)}
                          </div>
                        )}
                      </>
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
            <div className="font-semibold text-gray-900 text-lg">🎯 {hoveredBlock.blockId}</div>
            <div className="text-xs text-gray-600 mt-1">
              网格位置: {hoveredBlock.x}, {hoveredBlock.y} | 
              网格大小: {hoveredBlock.width} × {hoveredBlock.height}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              像素大小: {hoveredBlock.pixelWidth} × {hoveredBlock.pixelHeight}
            </div>
            {hoveredBlock.ad ? (
              <>
                <div className="text-sm text-blue-700 mt-3 font-medium">{hoveredBlock.ad.title}</div>
                <div className="text-xs text-gray-700 mt-1">{hoveredBlock.ad.description}</div>
                {hoveredBlock.ad.contact_info && (
                  <div className="text-xs text-green-700 mt-1">📞 {hoveredBlock.ad.contact_info}</div>
                )}
                {hoveredBlock.ad.notes && (
                  <div className="text-xs text-orange-700 mt-1">📝 {hoveredBlock.ad.notes}</div>
                )}
                <div className="text-xs text-purple-700 mt-2 font-medium">
                  ⏰ {formatExpireTime(hoveredBlock.ad.expires_at)}
                </div>
                <div className="text-xs text-emerald-700 mt-1 font-bold">🔗 点击访问链接</div>
              </>
            ) : (
              <div className="text-xs text-gray-500 mt-2">
                ✨ 此块可用，点击可模拟上传广告<br/>
                💰 价格: ¥{getBlockPrice(hoveredBlock.blockId, currentPage.priceMultiplier)}
              </div>
            )}
          </div>
        )}

        {/* 控制信息 */}
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 backdrop-blur-sm p-3 rounded-lg shadow-lg text-xs text-gray-700 border border-gray-200">
          <div className="font-semibold mb-2 text-gray-900">🎮 操作指南:</div>
          <div className="space-y-1">
            <div>🖱️ 拖拽移动 | 滚轮缩放</div>
            <div>⌨️ +/- 缩放 | Ctrl+R 重置</div>
            <div>🖼️ 悬停查看 | 点击交互</div>
            <div>🔍 当前缩放: <span className="text-blue-600 font-bold">{Math.round(viewport.scale * 100)}%</span></div>
          </div>
        </div>

        {/* 图例 */}
        <div className="absolute bottom-4 right-4 bg-white bg-opacity-90 backdrop-blur-sm p-3 rounded-lg shadow-lg text-xs border border-gray-200">
          <div className="font-semibold mb-2 text-gray-900">🎨 状态图例:</div>
          <div className="space-y-2">
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

      {/* 模拟上传弹窗 */}
      {showUploadModal && selectedBlock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white border border-gray-300 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">🎯 模拟上传到块 {selectedBlock.blockId}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📊 块信息</label>
                <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 border border-gray-200">
                  <div>网格位置: {selectedBlock.x}, {selectedBlock.y}</div>
                  <div>网格大小: {selectedBlock.width} × {selectedBlock.height}</div>
                  <div>像素大小: {selectedBlock.pixelWidth} × {selectedBlock.pixelHeight} px</div>
                  <div>块类型: <span className="text-blue-600">{selectedBlock.type === 'square' ? '正方形' : selectedBlock.type === 'horizontal' ? '横长方形' : '竖长方形'}</span></div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📁 上传文件</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
                  <div className="text-gray-400 text-4xl mb-2">📷</div>
                  <div className="text-gray-600">
                    拖拽图片或动图到此处<br/>
                    <span className="text-xs text-gray-500">(这是模拟功能演示)</span>
                  </div>
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
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
              >
                🚀 模拟上传
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}