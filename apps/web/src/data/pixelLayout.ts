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
  TOTAL_BLOCKS: 120,
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

// 重新设计：实现真正的错落有致布局，棋盘式交错，完全覆盖32x20网格
const createPerfectRectangleLayout = (): BlockConfig[] => {
  // 按照注释中的分配方案，重新设计布局策略
  const perfectLayout: BlockConfig[] = [
    // 第1行：错落有致，大块小块交错，完全覆盖x=0-31
    { id: '001', blockId: '4x4-001', x: 0, y: 0, width: 4, height: 4, type: 'square' }, // 16
    { id: '002', blockId: '2x2-002', x: 4, y: 0, width: 2, height: 2, type: 'square' }, // 4
    { id: '003', blockId: '3x3-003', x: 6, y: 0, width: 3, height: 3, type: 'square' }, // 9
    { id: '004', blockId: '1x4-004', x: 9, y: 0, width: 1, height: 4, type: 'vertical' }, // 4
    { id: '005', blockId: '4x2-005', x: 10, y: 0, width: 4, height: 2, type: 'horizontal' }, // 8
    { id: '006', blockId: '2x3-006', x: 14, y: 0, width: 2, height: 3, type: 'vertical' }, // 6
    { id: '007', blockId: '3x2-007', x: 16, y: 0, width: 3, height: 2, type: 'horizontal' }, // 6
    { id: '008', blockId: '2x4-008', x: 19, y: 0, width: 2, height: 4, type: 'vertical' }, // 8
    { id: '009', blockId: '4x3-009', x: 21, y: 0, width: 4, height: 3, type: 'horizontal' }, // 12
    { id: '010', blockId: '2x1-010', x: 25, y: 0, width: 2, height: 1, type: 'horizontal' }, // 2
    { id: '011', blockId: '2x3-011', x: 27, y: 0, width: 2, height: 3, type: 'vertical' }, // 6
    { id: '012', blockId: '3x1-012', x: 29, y: 0, width: 3, height: 1, type: 'horizontal' }, // 3

    // 第2行：继续交错布局，填充空隙，不与第一行重合
    { id: '013', blockId: '3x2-013', x: 26, y: 9, width: 3, height: 2, type: 'horizontal' }, // 6
    { id: '014', blockId: '2x2-014', x: 0, y: 4, width: 2, height: 2, type: 'square' }, // 4
    { id: '015', blockId: '3x1-015', x: 2, y: 4, width: 3, height: 1, type: 'horizontal' }, // 3
    { id: '016', blockId: '1x2-016', x: 4, y: 2, width: 1, height: 2, type: 'vertical' }, // 2
    { id: '017', blockId: '1x1-017', x: 5, y: 2, width: 1, height: 1, type: 'square' }, // 1
    { id: '018', blockId: '4x3-018', x: 5, y: 3, width: 4, height: 3, type: 'horizontal' }, // 12
    { id: '019', blockId: '2x1-019', x: 10, y: 2, width: 2, height: 1, type: 'horizontal' }, // 2
    { id: '020', blockId: '2x3-020', x: 9, y: 4, width: 2, height: 3, type: 'vertical' }, // 6
    { id: '021', blockId: '1x4-021', x: 12, y: 2, width: 1, height: 4, type: 'vertical' }, // 4
    { id: '022', blockId: '1x2-022', x: 13, y: 2, width: 1, height: 2, type: 'vertical' }, // 2
    { id: '023', blockId: '4x4-023', x: 14, y: 3, width: 4, height: 4, type: 'square' }, // 16
    { id: '024', blockId: '3x1-024', x: 16, y: 2, width: 3, height: 1, type: 'horizontal' }, // 3
    { id: '025', blockId: '4x2-025', x: 19, y: 4, width: 4, height: 2, type: 'horizontal' }, // 8
    { id: '026', blockId: '3x1-026', x: 21, y: 3, width: 3, height: 1, type: 'horizontal' }, // 3
    { id: '027', blockId: '1x1-027', x: 24, y: 3, width: 1, height: 1, type: 'square' }, // 1
    { id: '028', blockId: '2x4-028', x: 25, y: 1, width: 2, height: 4, type: 'vertical' }, // 4
    { id: '029', blockId: '2x1-029', x: 27, y: 3, width: 2, height: 1, type: 'horizontal' }, // 2
    { id: '030', blockId: '2x4-030', x: 29, y: 1, width: 2, height: 4, type: 'vertical' }, // 8
    { id: '031', blockId: '1x1-031', x: 31, y: 1, width: 1, height: 1, type: 'square' }, // 1

    // 第3行：错落有致，大小块混合，紧贴无缝隙
    { id: '032', blockId: '2x3-032', x: 0, y: 6, width: 2, height: 3, type: 'vertical' }, // (0-1, 6-8)
    { id: '033', blockId: '3x3-033', x: 2, y: 5, width: 3, height: 3, type: 'square' }, // (2, 6) 小缝隙
    { id: '034', blockId: '2x3-034', x: 5, y: 6, width: 2, height: 3, type: 'vertical' }, // (4-6, 6)
    { id: '035', blockId: '2x2-035', x: 7, y: 6, width: 2, height: 2, type: 'square' }, // (7-8, 6-7)
    { id: '036', blockId: '2x3-036', x: 9, y: 7, width: 2, height: 3, type: 'vertical' }, // (9, 6-8)
    { id: '037', blockId: '1x1-037', x: 10, y: 3, width: 1, height: 1, type: 'square' }, // (3, 6-7)
    { id: '038', blockId: '1x3-038', x: 11, y: 3, width: 1, height: 3, type: 'vertical' }, // (3, 6-7)
    { id: '039', blockId: '1x4-039', x: 13, y: 4, width: 1, height: 4, type: 'vertical' }, // (3, 6-7)
    { id: '040', blockId: '2x4-040', x: 11, y: 6, width: 2, height: 4, type: 'vertical' }, // (10-13, 6-7)
    { id: '041', blockId: '3x4-041', x: 14, y: 7, width: 3, height: 4, type: 'vertical' }, // (14-16, 7-10) 错落
    { id: '042', blockId: '1x4-042', x: 18, y: 3, width: 1, height: 4, type: 'vertical' }, // (17, 7) 小缝隙
    { id: '043', blockId: '2x3-043', x: 23, y: 4, width: 2, height: 3, type: 'vertical' }, // (23, 6) 小缝隙
    { id: '044', blockId: '4x4-044', x: 25, y: 5, width: 4, height: 4, type: 'square' }, // (24-25, 4-5) 错落
    { id: '045', blockId: '2x1-045', x: 27, y: 4, width: 2, height: 1, type: 'horizontal' }, // (27-29, 4-5) 错落
    { id: '046', blockId: '2x2-046', x: 29, y: 5, width: 2, height: 2, type: 'square' }, // (31, 2-3) 错落
    { id: '047', blockId: '2x1-047', x: 26, y: 11, width: 2, height: 1, type: 'horizontal' }, // (31, 2-3) 错落
    { id: '048', blockId: '1x2-048', x: 31, y: 2, width: 1, height: 2, type: 'vertical' }, // (31, 2-3) 错落
    { id: '049', blockId: '1x3-049', x: 31, y: 4, width: 1, height: 3, type: 'vertical' }, // (31, 4-6) 继续错落

    // 第4行：继续错落有致，紧贴前面各行的最大y值，无缝隙
    { id: '050', blockId: '3x3-050', x: 0, y: 9, width: 3, height: 3, type: 'square' }, // (0-1, 9-10) 紧贴第3行032块底部
    { id: '051', blockId: '1x1-051', x: 2, y: 8, width: 1, height: 1, type: 'square' }, // (2, 8-10) 紧贴033块底部
    { id: '052', blockId: '2x3-052', x: 3, y: 8, width: 2, height: 3, type: 'vertical' }, // (3-4, 8) 错落高度
    { id: '053', blockId: '2x3-053', x: 7, y: 8, width: 2, height: 3, type: 'vertical' }, // (7-10, 8-9) 紧贴035块底部
    { id: '054', blockId: '2x3-054', x: 5, y: 9, width: 2, height: 3, type: 'vertical' }, // (5-7, 8-10) 大块填隙
    { id: '055', blockId: '4x3-055', x: 9, y: 10, width: 4, height: 3, type: 'horizontal' }, // (17-19, 7) 错落填隙
    { id: '056', blockId: '1x3-056', x: 13, y: 8, width: 1, height: 3, type: 'vertical' }, // (19-20, 6-8) 错落高度
    { id: '057', blockId: '2x2-057', x: 17, y: 7, width: 2, height: 2, type: 'square' }, // (21, 7-8) 小块填隙
    { id: '058', blockId: '4x3-058', x: 19, y: 6, width: 4, height: 3, type: 'horizontal' }, // (22-23, 6) 横条错落
    { id: '059', blockId: '2x3-059', x: 23, y: 7, width: 2, height: 3, type: 'vertical' }, // (22, 7-9) 细长填隙
    { id: '060', blockId: '3x4-060', x: 29, y: 7, width: 3, height: 4, type: 'vertical' }, // (25-26, 7-8) 大块替代小块

    // 第5行：继续错落布局，填充剩余空间
    { id: '061', blockId: '1x3-061', x: 0, y: 12, width: 1, height: 3, type: 'vertical' }, // (2-3, 9-11) 紧贴051块底部
    { id: '062', blockId: '2x2-062', x: 1, y: 12, width: 2, height: 2, type: 'square' }, // (4, 11-12) 小高块
    { id: '063', blockId: '2x3-063', x: 3, y: 11, width: 2, height: 3, type: 'vertical' }, // (5-6, 12) 横条
    { id: '064', blockId: '2x1-064', x: 5, y: 12, width: 2, height: 1, type: 'horizontal' }, // (5-6, 12) 横条
    { id: '065', blockId: '2x2-065', x: 7, y: 11, width: 2, height: 2, type: 'square' }, // (7-8, 12-13) 方块
    { id: '066', blockId: '4x1-066', x: 13, y: 11, width: 4, height: 1, type: 'horizontal' }, // (9, 11-13) 高块错落
    { id: '067', blockId: '2x3-067', x: 17, y: 9, width: 2, height: 3, type: 'vertical' }, // (10-12, 11) 横条
    { id: '068', blockId: '3x4-068', x: 19, y: 9, width: 3, height: 4, type: 'vertical' }, // (13-14, 11-12) 方块填隙
    { id: '069', blockId: '3x4-069', x: 22, y: 10, width: 3, height: 4, type: 'vertical' }, // (15, 12-13) 小高块
    { id: '070', blockId: '1x3-070', x: 25, y: 9, width: 1, height: 3, type: 'vertical' }, // (21-22, 10-12) 高块
    { id: '071', blockId: '3x3-071', x: 29, y: 11, width: 3, height: 3, type: 'square' }, // (23, 10) 小方块

    // 第6行：最终行，完成100块布局
    { id: '072', blockId: '4x2-072', x: 1, y: 14, width: 4, height: 2, type: 'horizontal' }, // (0-2, 15-16) 横块开始
    { id: '073', blockId: '2x4-073', x: 5, y: 13, width: 2, height: 4, type: 'vertical' }, // (3-4, 14-17) 高块填隙
    { id: '074', blockId: '3x3-074', x: 7, y: 13, width: 3, height: 3, type: 'square' }, // (5-7, 13-15) 大方块
    { id: '075', blockId: '3x2-075', x: 10, y: 13, width: 3, height: 2, type: 'horizontal' }, // (8, 13-14) 小高块
    { id: '076', blockId: '2x3-076', x: 13, y: 12, width: 2, height: 3, type: 'vertical' }, // (9-12, 13-14) 横块
    { id: '077', blockId: '4x4-077', x: 15, y: 12, width: 4, height: 4, type: 'square' }, // (13-14, 12-14) 高块错落
    { id: '078', blockId: '4x1-078', x: 19, y: 14, width: 4, height: 1, type: 'horizontal' }, // (15, 15-18) 细长高块
    { id: '079', blockId: '2x2-079', x: 23, y: 14, width: 2, height: 2, type: 'square' }, // (16-17, 14-15) 方块
    { id: '080', blockId: '3x3-080', x: 25, y: 12, width: 3, height: 3, type: 'square' }, // (18-20, 14) 横条
    { id: '081', blockId: '1x3-081', x: 28, y: 11, width: 1, height: 3, type: 'vertical' }, // (25-28, 12-15) 大方块
    { id: '082', blockId: '4x3-082', x: 28, y: 14, width: 4, height: 3, type: 'horizontal' }, // (29-31, 14-15) 横块结束

    // 第7行：继续错落布局，18个块左右
    { id: '083', blockId: '1x2-083', x: 0, y: 15, width: 1, height: 2, type: 'vertical' }, // (0, 17-18) 小高块开始
    { id: '084', blockId: '1x1-084', x: 1, y: 16, width: 1, height: 1, type: 'square' }, // (1-2, 18) 横条
    { id: '085', blockId: '3x2-085', x: 2, y: 16, width: 3, height: 2, type: 'horizontal' }, // (3, 17) 小方块
    { id: '086', blockId: '2x1-086', x: 5, y: 17, width: 2, height: 1, type: 'horizontal' }, // (4, 17-18) 小高块
    { id: '087', blockId: '1x3-087', x: 7, y: 16, width: 1, height: 3, type: 'vertical' }, // (5-7, 19) 横条错落
    { id: '088', blockId: '2x2-088', x: 8, y: 16, width: 2, height: 2, type: 'square' }, // (8-9, 19-20) 方块
    { id: '089', blockId: '2x2-089', x: 10, y: 15, width: 2, height: 2, type: 'square' }, // (10, 16) 小方块
    { id: '090', blockId: '2x1-090', x: 12, y: 15, width: 2, height: 1, type: 'horizontal' }, // (11-12, 16-18) 高块
    { id: '091', blockId: '1x3-091', x: 14, y: 15, width: 1, height: 3, type: 'vertical' }, // (13, 15-16) 小高块
    { id: '092', blockId: '3x3-092', x: 15, y: 16, width: 3, height: 3, type: 'square' }, // (14-15, 16) 横条
    { id: '093', blockId: '4x3-093', x: 18, y: 16, width: 4, height: 3, type: 'horizontal' }, // (15-18, 16) 长横条
    { id: '094', blockId: '1x1-094', x: 19, y: 15, width: 1, height: 1, type: 'square' }, // (19, 19-21) 高块
    { id: '095', blockId: '2x1-095', x: 20, y: 15, width: 2, height: 1, type: 'horizontal' }, // (20-21, 15-16) 方块
    { id: '096', blockId: '1x3-096', x: 22, y: 15, width: 1, height: 3, type: 'vertical' }, // (22, 19) 小方块
    { id: '097', blockId: '1x1-097', x: 22, y: 9, width: 1, height: 1, type: 'square' }, // (23-24, 16) 横条
    { id: '098', blockId: '3x1-098', x: 19, y: 13, width: 3, height: 1, type: 'horizontal' }, // (25-27, 15-16) 横块
    { id: '099', blockId: '4x4-099', x: 23, y: 16, width: 4, height: 4, type: 'square' }, // (28, 18-21) 高块
    { id: '100', blockId: '1x1-100', x: 25, y: 15, width: 1, height: 1, type: 'square' }, // (29-31, 15)
    { id: '101', blockId: '2x1-101', x: 26, y: 15, width: 2, height: 1, type: 'horizontal' }, // (29-31, 15)
    { id: '102', blockId: '2x1-102', x: 28, y: 17, width: 2, height: 1, type: 'horizontal' }, // (28, 16-18) 高块

    // 最后一行：完成剩余空间填充，103-120
    { id: '103', blockId: '2x3-103', x: 0, y: 17, width: 2, height: 3, type: 'vertical' }, // (0, 17) 小方块
    { id: '104', blockId: '2x2-104', x: 2, y: 18, width: 2, height: 2, type: 'square' }, // (1-2, 17-18) 方块
    { id: '105', blockId: '3x2-105', x: 4, y: 18, width: 3, height: 2, type: 'horizontal' }, // (3, 18-19) 高块
    { id: '106', blockId: '1x1-106', x: 7, y: 19, width: 1, height: 1, type: 'square' }, // (4-5, 18) 横条
    { id: '107', blockId: '2x2-107', x: 8, y: 18, width: 2, height: 2, type: 'square' }, // (6, 18) 小方块
    { id: '108', blockId: '3x3-108', x: 10, y: 17, width: 3, height: 3, type: 'square' }, // (8, 18-19) 高块
    { id: '109', blockId: '1x1-109', x: 12, y: 16, width: 1, height: 1, type: 'square' }, // (9-10, 18-19) 方块
    { id: '110', blockId: '1x4-110', x: 13, y: 16, width: 1, height: 4, type: 'vertical' }, // (11, 17) 小方块
    { id: '111', blockId: '1x1-111', x: 14, y: 18, width: 1, height: 1, type: 'square' }, // (12-13, 16-18) 高块
    { id: '112', blockId: '3x1-112', x: 14, y: 19, width: 3, height: 1, type: 'horizontal' }, // (15, 19) 小方块
    { id: '113', blockId: '4x1-113', x: 17, y: 19, width: 4, height: 1, type: 'horizontal' }, // (16-17, 19) 横条
    { id: '114', blockId: '1x1-114', x: 21, y: 19, width: 1, height: 1, type: 'square' }, // (18, 19) 小方块
    { id: '115', blockId: '1x2-115', x: 22, y: 18, width: 1, height: 2, type: 'vertical' }, // (22, 19) 横条
    { id: '116', blockId: '1x2-116', x: 27, y: 16, width: 1, height: 2, type: 'vertical' }, // (27, 19) 小方块
    { id: '117', blockId: '1x2-117', x: 27, y: 18, width: 1, height: 2, type: 'vertical' }, // (28, 19) 小方块
    { id: '118', blockId: '1x2-118', x: 28, y: 18, width: 1, height: 2, type: 'vertical' }, // (29, 18) 小方块
    { id: '119', blockId: '2x1-119', x: 30, y: 17, width: 2, height: 1, type: 'horizontal' }, // (30, 18) 小方块
    { id: '120', blockId: '3x2-120', x: 29, y: 18, width: 3, height: 2, type: 'horizontal' }, // (30-31, 19) 横条结束
  ];

  // 验证布局是否正确
  const totalArea = perfectLayout.reduce((sum, block) => sum + block.width * block.height, 0);
  console.log(`完美布局生成: 总块数 = ${perfectLayout.length}`);
  console.log(`总面积 = ${totalArea} (期望: 640)`);

  if (perfectLayout.length !== 120) {
    console.error(`布局错误：总块数 ${perfectLayout.length} 不等于期望的 120`);
  }

  if (totalArea !== 640) {
    console.error(`布局错误：总面积 ${totalArea} 不等于期望的 640`);
  }

  return perfectLayout;
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

// 验证函数：检查blockId和实际尺寸是否匹配
export const validateBlockIds = (): void => {
  const mismatches: string[] = [];

  PIXEL_LAYOUT.forEach((block) => {
    const [sizePart] = block.blockId.split('-');
    const [widthStr, heightStr] = sizePart.split('x');
    const expectedWidth = parseInt(widthStr);
    const expectedHeight = parseInt(heightStr);

    if (block.width !== expectedWidth || block.height !== expectedHeight) {
      mismatches.push(
        `ID ${block.id}: blockId="${block.blockId}" (期望: ${expectedWidth}x${expectedHeight}), ` +
          `实际: width=${block.width}, height=${block.height}`,
      );
    }
  });

  if (mismatches.length > 0) {
    console.error('发现blockId不匹配的问题:');
    mismatches.forEach((msg) => console.error(msg));
  } else {
    console.log('✅ 所有blockId都匹配实际尺寸');
  }
};

// 验证函数已导出，可直接使用
