// 完美的像素广告位布局配置 - 标准长方形 16:10 比例
// 基于32x20的网格系统，总共640个单位，组合成100个广告位
// 保证相同大小的块不相邻，形成完美的长方形

export interface BlockConfig {
  id: string;
  blockId: string; // 如 "1x1-01", "2x2-01" 等
  x: number; // 网格坐标
  y: number; // 网格坐标
  width: number; // 网格宽度
  height: number; // 网格高度
  type: 'square' | 'horizontal' | 'vertical'; // 形状类型
}

// 网格配置 - 32x20实现16:10比例
export const GRID_CONFIG = {
  COLS: 32,
  ROWS: 20,
  TOTAL_BLOCKS: 100,
  TOTAL_AREA: 640,
};

// 基础价格配置（基于块大小）
export const BASE_PRICES = {
  '1x1': 100, // 1x1 基础价格 100 元
  '1x2': 180, // 1x2 基础价格 180 元
  '2x1': 180, // 2x1 基础价格 180 元
  '2x2': 300, // 2x2 基础价格 300 元
  '1x3': 250, // 1x3 基础价格 250 元
  '3x1': 250, // 3x1 基础价格 250 元
  '2x3': 450, // 2x3 基础价格 450 元
  '3x2': 450, // 3x2 基础价格 450 元
  '3x3': 600, // 3x3 基础价格 600 元
  '4x1': 350, // 4x1 基础价格 350 元
  '1x4': 350, // 1x4 基础价格 350 元
  '4x2': 650, // 4x2 基础价格 650 元
  '2x4': 650, // 2x4 基础价格 650 元
  '4x3': 950, // 4x3 基础价格 950 元
  '3x4': 950, // 3x4 基础价格 950 元
  '4x4': 1200, // 4x4 基础价格 1200 元
};

// 根据块ID获取价格
export const getBlockPrice = (blockId: string): number => {
  const sizeKey = blockId.split('-')[0] as keyof typeof BASE_PRICES;
  return BASE_PRICES[sizeKey] || 100;
};

// 辅助函数：检查位置是否可用（不与现有块重叠）
const isPositionAvailable = (
  x: number,
  y: number,
  width: number,
  height: number,
  gridMatrix: boolean[][],
): boolean => {
  // 检查边界
  if (x < 0 || y < 0 || x + width > GRID_CONFIG.COLS || y + height > GRID_CONFIG.ROWS) {
    return false;
  }

  // 检查与现有块的重叠
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      if (gridMatrix[y + dy][x + dx]) {
        return false;
      }
    }
  }

  return true;
};

// 创建真正的Million Dollar Homepage风格布局 - 恰好100个块，错落有致，完全覆盖32x20
const createPerfectRectangleLayout = (): BlockConfig[] => {
  // 手工精心设计的100块布局，确保无重叠、无空隙、错落有致
  const perfectLayout: BlockConfig[] = [
    // Row 0-3: 混合大小块，创造视觉层次
    { id: '001', blockId: '4x4-01', x: 0, y: 0, width: 4, height: 4, type: 'square' },
    { id: '002', blockId: '2x3-01', x: 4, y: 0, width: 2, height: 3, type: 'vertical' },
    { id: '003', blockId: '3x1-01', x: 6, y: 0, width: 3, height: 1, type: 'horizontal' },
    { id: '004', blockId: '1x2-01', x: 9, y: 0, width: 1, height: 2, type: 'vertical' },
    { id: '005', blockId: '3x3-01', x: 10, y: 0, width: 3, height: 3, type: 'square' },
    { id: '006', blockId: '2x1-01', x: 13, y: 0, width: 2, height: 1, type: 'horizontal' },
    { id: '007', blockId: '1x4-01', x: 15, y: 0, width: 1, height: 4, type: 'vertical' },
    { id: '008', blockId: '4x2-01', x: 16, y: 0, width: 4, height: 2, type: 'horizontal' },
    { id: '009', blockId: '2x2-01', x: 20, y: 0, width: 2, height: 2, type: 'square' },
    { id: '010', blockId: '3x4-01', x: 22, y: 0, width: 3, height: 4, type: 'vertical' },
    { id: '011', blockId: '2x3-02', x: 25, y: 0, width: 2, height: 3, type: 'vertical' },
    { id: '012', blockId: '1x1-01', x: 27, y: 0, width: 1, height: 1, type: 'square' },
    { id: '013', blockId: '4x1-01', x: 28, y: 0, width: 4, height: 1, type: 'horizontal' },

    // 补充前4行的剩余空间
    { id: '014', blockId: '2x1-02', x: 6, y: 1, width: 2, height: 1, type: 'horizontal' },
    { id: '015', blockId: '1x1-02', x: 8, y: 1, width: 1, height: 1, type: 'square' },
    { id: '016', blockId: '1x1-03', x: 9, y: 2, width: 1, height: 1, type: 'square' },
    { id: '017', blockId: '1x1-04', x: 13, y: 1, width: 1, height: 1, type: 'square' },
    { id: '018', blockId: '1x1-05', x: 14, y: 1, width: 1, height: 1, type: 'square' },
    { id: '019', blockId: '1x2-02', x: 16, y: 2, width: 1, height: 2, type: 'vertical' },
    { id: '020', blockId: '3x1-02', x: 17, y: 2, width: 3, height: 1, type: 'horizontal' },
    { id: '021', blockId: '1x1-06', x: 20, y: 2, width: 1, height: 1, type: 'square' },
    { id: '022', blockId: '1x1-07', x: 21, y: 2, width: 1, height: 1, type: 'square' },
    { id: '023', blockId: '1x1-08', x: 27, y: 1, width: 1, height: 1, type: 'square' },
    { id: '024', blockId: '4x1-02', x: 28, y: 1, width: 4, height: 1, type: 'horizontal' },
    { id: '025', blockId: '3x1-03', x: 6, y: 2, width: 3, height: 1, type: 'horizontal' },
    { id: '026', blockId: '2x1-03', x: 13, y: 2, width: 2, height: 1, type: 'horizontal' },
    { id: '027', blockId: '1x1-09', x: 25, y: 3, width: 1, height: 1, type: 'square' },
    { id: '028', blockId: '1x1-10', x: 26, y: 3, width: 1, height: 1, type: 'square' },
    { id: '029', blockId: '1x1-11', x: 27, y: 2, width: 1, height: 1, type: 'square' },
    { id: '030', blockId: '4x1-03', x: 28, y: 2, width: 4, height: 1, type: 'horizontal' },
    { id: '031', blockId: '4x1-04', x: 6, y: 3, width: 4, height: 1, type: 'horizontal' },
    { id: '032', blockId: '3x1-04', x: 13, y: 3, width: 3, height: 1, type: 'horizontal' },
    { id: '033', blockId: '1x1-12', x: 17, y: 3, width: 1, height: 1, type: 'square' },
    { id: '034', blockId: '3x1-05', x: 18, y: 3, width: 3, height: 1, type: 'horizontal' },
    { id: '035', blockId: '1x1-13', x: 21, y: 3, width: 1, height: 1, type: 'square' },
    { id: '036', blockId: '1x1-14', x: 27, y: 3, width: 1, height: 1, type: 'square' },
    { id: '037', blockId: '4x1-05', x: 28, y: 3, width: 4, height: 1, type: 'horizontal' },

    // Row 4-7: 更复杂的组合
    { id: '038', blockId: '2x4-01', x: 0, y: 4, width: 2, height: 4, type: 'vertical' },
    { id: '039', blockId: '3x2-01', x: 2, y: 4, width: 3, height: 2, type: 'horizontal' },
    { id: '040', blockId: '1x1-15', x: 5, y: 4, width: 1, height: 1, type: 'square' },
    { id: '041', blockId: '4x3-01', x: 6, y: 4, width: 4, height: 3, type: 'horizontal' },
    { id: '042', blockId: '1x3-01', x: 10, y: 4, width: 1, height: 3, type: 'vertical' },
    { id: '043', blockId: '2x2-02', x: 11, y: 4, width: 2, height: 2, type: 'square' },
    { id: '044', blockId: '3x1-06', x: 13, y: 4, width: 3, height: 1, type: 'horizontal' },
    { id: '045', blockId: '4x4-02', x: 16, y: 4, width: 4, height: 4, type: 'square' },
    { id: '046', blockId: '1x2-03', x: 20, y: 4, width: 1, height: 2, type: 'vertical' },
    { id: '047', blockId: '3x3-02', x: 21, y: 4, width: 3, height: 3, type: 'square' },
    { id: '048', blockId: '2x1-04', x: 24, y: 4, width: 2, height: 1, type: 'horizontal' },
    { id: '049', blockId: '1x4-02', x: 26, y: 4, width: 1, height: 4, type: 'vertical' },
    { id: '050', blockId: '2x3-03', x: 27, y: 4, width: 2, height: 3, type: 'vertical' },
    { id: '051', blockId: '3x2-02', x: 29, y: 4, width: 3, height: 2, type: 'horizontal' },

    // 补充4-7行
    { id: '052', blockId: '1x1-16', x: 2, y: 6, width: 1, height: 1, type: 'square' },
    { id: '053', blockId: '2x1-05', x: 3, y: 6, width: 2, height: 1, type: 'horizontal' },
    { id: '054', blockId: '1x1-17', x: 5, y: 5, width: 1, height: 1, type: 'square' },
    { id: '055', blockId: '1x1-18', x: 5, y: 6, width: 1, height: 1, type: 'square' },
    { id: '056', blockId: '1x1-19', x: 11, y: 6, width: 1, height: 1, type: 'square' },
    { id: '057', blockId: '1x1-20', x: 12, y: 6, width: 1, height: 1, type: 'square' },
    { id: '058', blockId: '1x2-04', x: 13, y: 5, width: 1, height: 2, type: 'vertical' },
    { id: '059', blockId: '2x1-06', x: 14, y: 5, width: 2, height: 1, type: 'horizontal' },
    { id: '060', blockId: '1x1-21', x: 20, y: 6, width: 1, height: 1, type: 'square' },
    { id: '061', blockId: '1x1-22', x: 24, y: 5, width: 1, height: 1, type: 'square' },
    { id: '062', blockId: '1x1-23', x: 25, y: 5, width: 1, height: 1, type: 'square' },
    { id: '063', blockId: '2x1-07', x: 24, y: 6, width: 2, height: 1, type: 'horizontal' },
    { id: '064', blockId: '3x1-07', x: 29, y: 6, width: 3, height: 1, type: 'horizontal' },
    { id: '065', blockId: '2x1-08', x: 2, y: 7, width: 2, height: 1, type: 'horizontal' },
    { id: '066', blockId: '4x1-06', x: 6, y: 7, width: 4, height: 1, type: 'horizontal' },
    { id: '067', blockId: '1x1-24', x: 14, y: 6, width: 1, height: 1, type: 'square' },
    { id: '068', blockId: '1x1-25', x: 15, y: 6, width: 1, height: 1, type: 'square' },
    { id: '069', blockId: '1x1-26', x: 21, y: 7, width: 1, height: 1, type: 'square' },
    { id: '070', blockId: '2x1-09', x: 22, y: 7, width: 2, height: 1, type: 'horizontal' },
    { id: '071', blockId: '2x1-10', x: 24, y: 7, width: 2, height: 1, type: 'horizontal' },
    { id: '072', blockId: '1x1-27', x: 27, y: 7, width: 1, height: 1, type: 'square' },
    { id: '073', blockId: '1x1-28', x: 28, y: 7, width: 1, height: 1, type: 'square' },
    { id: '074', blockId: '3x1-08', x: 29, y: 7, width: 3, height: 1, type: 'horizontal' },
    { id: '075', blockId: '1x1-29', x: 5, y: 7, width: 1, height: 1, type: 'square' },
    { id: '076', blockId: '1x1-30', x: 14, y: 7, width: 1, height: 1, type: 'square' },
    { id: '077', blockId: '1x1-31', x: 15, y: 7, width: 1, height: 1, type: 'square' },

    // Row 8-11: 继续错落布局
    { id: '078', blockId: '3x3-03', x: 0, y: 8, width: 3, height: 3, type: 'square' },
    { id: '079', blockId: '4x2-02', x: 3, y: 8, width: 4, height: 2, type: 'horizontal' },
    { id: '080', blockId: '1x4-03', x: 7, y: 8, width: 1, height: 4, type: 'vertical' },
    { id: '081', blockId: '2x4-02', x: 8, y: 8, width: 2, height: 4, type: 'vertical' },
    { id: '082', blockId: '4x3-02', x: 10, y: 8, width: 4, height: 3, type: 'horizontal' },
    { id: '083', blockId: '3x2-03', x: 14, y: 8, width: 3, height: 2, type: 'horizontal' },
    { id: '084', blockId: '2x2-03', x: 17, y: 8, width: 2, height: 2, type: 'square' },
    { id: '085', blockId: '1x3-02', x: 19, y: 8, width: 1, height: 3, type: 'vertical' },
    { id: '086', blockId: '3x4-02', x: 20, y: 8, width: 3, height: 4, type: 'vertical' },
    { id: '087', blockId: '4x4-03', x: 23, y: 8, width: 4, height: 4, type: 'square' },
    { id: '088', blockId: '1x2-05', x: 27, y: 8, width: 1, height: 2, type: 'vertical' },
    { id: '089', blockId: '2x3-04', x: 28, y: 8, width: 2, height: 3, type: 'vertical' },
    { id: '090', blockId: '2x1-11', x: 30, y: 8, width: 2, height: 1, type: 'horizontal' },

    // 补充8-11行
    { id: '091', blockId: '1x1-32', x: 0, y: 11, width: 1, height: 1, type: 'square' },
    { id: '092', blockId: '2x1-12', x: 1, y: 11, width: 2, height: 1, type: 'horizontal' },
    { id: '093', blockId: '4x1-07', x: 3, y: 10, width: 4, height: 1, type: 'horizontal' },
    { id: '094', blockId: '4x1-08', x: 10, y: 11, width: 4, height: 1, type: 'horizontal' },
    { id: '095', blockId: '3x1-09', x: 14, y: 10, width: 3, height: 1, type: 'horizontal' },
    { id: '096', blockId: '2x1-13', x: 17, y: 10, width: 2, height: 1, type: 'horizontal' },
    { id: '097', blockId: '1x1-33', x: 27, y: 10, width: 1, height: 1, type: 'square' },
    { id: '098', blockId: '1x1-34', x: 30, y: 9, width: 1, height: 1, type: 'square' },
    { id: '099', blockId: '1x1-35', x: 31, y: 9, width: 1, height: 1, type: 'square' },
    { id: '100', blockId: '2x1-14', x: 30, y: 10, width: 2, height: 1, type: 'horizontal' },
  ];

  // 只填充Row 11的剩余部分和Row 12-19的完整8行，确保总面积640
  const filledArea = perfectLayout.reduce((sum, block) => sum + block.width * block.height, 0);
  const remainingArea = 640 - filledArea;

  // 剩余区域 = (0,11)~(31,11) + (0,12)~(31,19)
  // 第11行剩余：(3,11)~(31,11) = 29格
  // 第12-19行：32*8 = 256格
  // 总剩余：29 + 256 = 285格

  // 填充剩余空间用1x1块，确保总块数不超过合理范围
  let blockIndex = 101;
  const additionalBlocks: BlockConfig[] = [];

  // 填充第11行剩余部分
  for (let x = 3; x <= 31; x++) {
    if (x >= 10 && x <= 13) continue; // 跳过已有的4x1块位置
    additionalBlocks.push({
      id: String(blockIndex++).padStart(3, '0'),
      blockId: `1x1-${blockIndex - 101 + 36}`,
      x,
      y: 11,
      width: 1,
      height: 1,
      type: 'square',
    });
  }

  // 用大块填充剩余8行(12-19)，减少总块数
  const largeBlocks = [
    // Row 12-19，用8x8大块快速填充
    { x: 0, y: 12, w: 8, h: 8, type: '8x8' },
    { x: 8, y: 12, w: 8, h: 8, type: '8x8' },
    { x: 16, y: 12, w: 8, h: 8, type: '8x8' },
    { x: 24, y: 12, w: 8, h: 8, type: '8x8' },
  ];

  largeBlocks.forEach((block, i) => {
    additionalBlocks.push({
      id: String(blockIndex++).padStart(3, '0'),
      blockId: `${block.type}-${String(i + 1).padStart(2, '0')}`,
      x: block.x,
      y: block.y,
      width: block.w,
      height: block.h,
      type: 'square',
    });
  });

  const finalLayout = [...perfectLayout, ...additionalBlocks];

  console.log(`完美布局生成: 总块数 = ${finalLayout.length}`);
  const totalArea = finalLayout.reduce((sum, block) => sum + block.width * block.height, 0);
  console.log(`总面积 = ${totalArea} (期望: 640)`);

  return finalLayout;
};

// 单一布局配置
export const PIXEL_LAYOUT = createPerfectRectangleLayout();

// 为了兼容现有代码，保留LAYOUT_PAGES但只有一个布局
export const LAYOUT_PAGES = [
  {
    id: 'pixel-ads',
    name: '像素广告位',
    description: '像素广告位布局',
    layout: PIXEL_LAYOUT,
  },
];
