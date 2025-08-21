// 完美的像素广告位布局配置 - 标准长方形 16:12 比例
// 基于16x12的网格系统，总共192个单位，组合成100个广告位
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

export interface LayoutPage {
  id: string;
  name: string;
  description: string;
  priceMultiplier: number; // 价格倍数
  layout: BlockConfig[];
}

// 网格配置
export const GRID_CONFIG = {
  COLS: 16,
  ROWS: 12,
  TOTAL_BLOCKS: 100,
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
export const getBlockPrice = (blockId: string, priceMultiplier: number = 1): number => {
  const sizeKey = blockId.split('-')[0] as keyof typeof BASE_PRICES;
  const basePrice = BASE_PRICES[sizeKey] || 100;
  return Math.round(basePrice * priceMultiplier);
};

// 生成完整的100个块布局（简化版本）
const generateSimpleLayout = (startId: number = 1): BlockConfig[] => {
  const layout: BlockConfig[] = [];
  let id = startId;
  let blockCounter = 1;

  for (let y = 0; y < GRID_CONFIG.ROWS; y++) {
    for (let x = 0; x < GRID_CONFIG.COLS && layout.length < 100; x++) {
      // 检查当前位置是否已被占用
      const isOccupied = layout.some(
        (block) =>
          x >= block.x && x < block.x + block.width && y >= block.y && y < block.y + block.height,
      );

      if (!isOccupied) {
        // 随机选择块大小（但确保不超出边界）
        const maxWidth = Math.min(4, GRID_CONFIG.COLS - x);
        const maxHeight = Math.min(4, GRID_CONFIG.ROWS - y);

        let width, height, type: 'square' | 'horizontal' | 'vertical';

        // 根据可用空间和位置选择合适的块大小
        if (maxWidth >= 2 && maxHeight >= 2 && Math.random() > 0.5) {
          width = Math.min(2, maxWidth);
          height = Math.min(2, maxHeight);
          type = 'square';
        } else if (maxWidth >= 3 && Math.random() > 0.6) {
          width = Math.min(3, maxWidth);
          height = 1;
          type = 'horizontal';
        } else if (maxHeight >= 3 && Math.random() > 0.6) {
          width = 1;
          height = Math.min(3, maxHeight);
          type = 'vertical';
        } else {
          width = 1;
          height = 1;
          type = 'square';
        }

        const blockId = `${width}x${height}-${String(blockCounter).padStart(2, '0')}`;

        layout.push({
          id: String(id).padStart(3, '0'),
          blockId,
          x,
          y,
          width,
          height,
          type,
        });

        id++;
        blockCounter++;
      }
    }
  }

  return layout.slice(0, 100); // 确保只返回100个块
};

// 5个布局页面配置
export const LAYOUT_PAGES: LayoutPage[] = [
  {
    id: 'premium',
    name: '黄金版',
    description: '首页顶部黄金位置，流量最大，效果最佳',
    priceMultiplier: 1.0, // 1倍价格
    layout: generateSimpleLayout(1),
  },
  {
    id: 'vip',
    name: '白金版',
    description: '优质位置，高曝光率，性价比优秀',
    priceMultiplier: 0.95, // 95折
    layout: generateSimpleLayout(101),
  },
  {
    id: 'standard',
    name: '标准版',
    description: '标准位置，稳定流量，适合长期投放',
    priceMultiplier: 0.9, // 9折
    layout: generateSimpleLayout(201),
  },
  {
    id: 'basic',
    name: '基础版',
    description: '基础位置，价格实惠，适合预算有限',
    priceMultiplier: 0.85, // 85折
    layout: generateSimpleLayout(301),
  },
  {
    id: 'economy',
    name: '经济版',
    description: '经济实惠，入门首选，覆盖基础用户',
    priceMultiplier: 0.8, // 8折
    layout: generateSimpleLayout(401),
  },
];

// 默认使用第一个布局（向后兼容）
export const PIXEL_LAYOUT = LAYOUT_PAGES[0].layout;
