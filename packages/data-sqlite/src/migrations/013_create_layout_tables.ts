export const version = 13;
export const name = '013_create_layout_tables';

export function up(db: any): void {
  // 1. 创建 BASE_PRICES 表存储价格配置
  db.exec(`
    CREATE TABLE base_prices (
      id TEXT PRIMARY KEY,          -- 价格 ID 如 '1x1', '2x2', '4x4' 等
      price REAL NOT NULL,          -- 基础价格
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );
  `);

  // 插入 BASE_PRICES 数据
  const basePrices = [
    { id: '1x1', price: 100 },
    { id: '1x2', price: 180 },
    { id: '2x1', price: 180 },
    { id: '2x2', price: 300 },
    { id: '1x3', price: 250 },
    { id: '3x1', price: 250 },
    { id: '2x3', price: 450 },
    { id: '3x2', price: 450 },
    { id: '3x3', price: 600 },
    { id: '4x1', price: 350 },
    { id: '1x4', price: 350 },
    { id: '4x2', price: 650 },
    { id: '2x4', price: 650 },
    { id: '4x3', price: 950 },
    { id: '3x4', price: 950 },
    { id: '4x4', price: 1200 },
  ];

  basePrices.forEach(({ id, price }) => {
    db.exec(`
      INSERT INTO base_prices (id, price) 
      VALUES ('${id}', ${price});
    `);
  });

  // 2. 创建 block_configs 表存储 120 个块布局数据
  db.exec(`
    CREATE TABLE block_configs (
      id TEXT PRIMARY KEY,          -- 块 ID 如 '001', '002' 等
      block_id TEXT NOT NULL,       -- 块完整 ID 如 '4x4-001', '2x2-002' 等
      x INTEGER NOT NULL,           -- 网格 x 坐标
      y INTEGER NOT NULL,           -- 网格 y 坐标  
      width INTEGER NOT NULL,       -- 网格宽度
      height INTEGER NOT NULL,      -- 网格高度
      type TEXT NOT NULL CHECK (type IN ('square', 'horizontal', 'vertical')),
      size TEXT NOT NULL,           -- 尺寸如 '4x4', '2x2' 等
      price_id TEXT NOT NULL,       -- 关联 base_prices 的 id
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (price_id) REFERENCES base_prices(id)
    );
  `);

  // 插入 120 个块配置数据
  const blockConfigs = [
    // 第 1 行：错落有致，大块小块交错，完全覆盖 x=0-31
    { id: '001', blockId: '4x4-001', x: 0, y: 0, width: 4, height: 4, type: 'square' },
    { id: '002', blockId: '2x2-002', x: 4, y: 0, width: 2, height: 2, type: 'square' },
    { id: '003', blockId: '3x3-003', x: 6, y: 0, width: 3, height: 3, type: 'square' },
    { id: '004', blockId: '1x4-004', x: 9, y: 0, width: 1, height: 4, type: 'vertical' },
    { id: '005', blockId: '4x2-005', x: 10, y: 0, width: 4, height: 2, type: 'horizontal' },
    { id: '006', blockId: '2x3-006', x: 14, y: 0, width: 2, height: 3, type: 'vertical' },
    { id: '007', blockId: '3x2-007', x: 16, y: 0, width: 3, height: 2, type: 'horizontal' },
    { id: '008', blockId: '2x4-008', x: 19, y: 0, width: 2, height: 4, type: 'vertical' },
    { id: '009', blockId: '4x3-009', x: 21, y: 0, width: 4, height: 3, type: 'horizontal' },
    { id: '010', blockId: '2x1-010', x: 25, y: 0, width: 2, height: 1, type: 'horizontal' },
    { id: '011', blockId: '2x3-011', x: 27, y: 0, width: 2, height: 3, type: 'vertical' },
    { id: '012', blockId: '3x1-012', x: 29, y: 0, width: 3, height: 1, type: 'horizontal' },

    // 第 2 行：继续交错布局，填充空隙，不与第一行重合
    { id: '013', blockId: '3x2-013', x: 26, y: 9, width: 3, height: 2, type: 'horizontal' },
    { id: '014', blockId: '2x2-014', x: 0, y: 4, width: 2, height: 2, type: 'square' },
    { id: '015', blockId: '3x1-015', x: 2, y: 4, width: 3, height: 1, type: 'horizontal' },
    { id: '016', blockId: '1x2-016', x: 4, y: 2, width: 1, height: 2, type: 'vertical' },
    { id: '017', blockId: '1x1-017', x: 5, y: 2, width: 1, height: 1, type: 'square' },
    { id: '018', blockId: '4x3-018', x: 5, y: 3, width: 4, height: 3, type: 'horizontal' },
    { id: '019', blockId: '2x1-019', x: 10, y: 2, width: 2, height: 1, type: 'horizontal' },
    { id: '020', blockId: '2x3-020', x: 9, y: 4, width: 2, height: 3, type: 'vertical' },
    { id: '021', blockId: '1x4-021', x: 12, y: 2, width: 1, height: 4, type: 'vertical' },
    { id: '022', blockId: '1x2-022', x: 13, y: 2, width: 1, height: 2, type: 'vertical' },
    { id: '023', blockId: '4x4-023', x: 14, y: 3, width: 4, height: 4, type: 'square' },
    { id: '024', blockId: '3x1-024', x: 16, y: 2, width: 3, height: 1, type: 'horizontal' },
    { id: '025', blockId: '4x2-025', x: 19, y: 4, width: 4, height: 2, type: 'horizontal' },
    { id: '026', blockId: '3x1-026', x: 21, y: 3, width: 3, height: 1, type: 'horizontal' },
    { id: '027', blockId: '1x1-027', x: 24, y: 3, width: 1, height: 1, type: 'square' },
    { id: '028', blockId: '2x4-028', x: 25, y: 1, width: 2, height: 4, type: 'vertical' },
    { id: '029', blockId: '2x1-029', x: 27, y: 3, width: 2, height: 1, type: 'horizontal' },
    { id: '030', blockId: '2x4-030', x: 29, y: 1, width: 2, height: 4, type: 'vertical' },
    { id: '031', blockId: '1x1-031', x: 31, y: 1, width: 1, height: 1, type: 'square' },

    // 第 3 行：错落有致，大小块混合，紧贴无缝隙
    { id: '032', blockId: '2x3-032', x: 0, y: 6, width: 2, height: 3, type: 'vertical' },
    { id: '033', blockId: '3x3-033', x: 2, y: 5, width: 3, height: 3, type: 'square' },
    { id: '034', blockId: '2x3-034', x: 5, y: 6, width: 2, height: 3, type: 'vertical' },
    { id: '035', blockId: '2x2-035', x: 7, y: 6, width: 2, height: 2, type: 'square' },
    { id: '036', blockId: '2x3-036', x: 9, y: 7, width: 2, height: 3, type: 'vertical' },
    { id: '037', blockId: '1x1-037', x: 10, y: 3, width: 1, height: 1, type: 'square' },
    { id: '038', blockId: '1x3-038', x: 11, y: 3, width: 1, height: 3, type: 'vertical' },
    { id: '039', blockId: '1x4-039', x: 13, y: 4, width: 1, height: 4, type: 'vertical' },
    { id: '040', blockId: '2x4-040', x: 11, y: 6, width: 2, height: 4, type: 'vertical' },
    { id: '041', blockId: '3x4-041', x: 14, y: 7, width: 3, height: 4, type: 'vertical' },
    { id: '042', blockId: '1x4-042', x: 18, y: 3, width: 1, height: 4, type: 'vertical' },
    { id: '043', blockId: '2x3-043', x: 23, y: 4, width: 2, height: 3, type: 'vertical' },
    { id: '044', blockId: '4x4-044', x: 25, y: 5, width: 4, height: 4, type: 'square' },
    { id: '045', blockId: '2x1-045', x: 27, y: 4, width: 2, height: 1, type: 'horizontal' },
    { id: '046', blockId: '2x2-046', x: 29, y: 5, width: 2, height: 2, type: 'square' },
    { id: '047', blockId: '2x1-047', x: 26, y: 11, width: 2, height: 1, type: 'horizontal' },
    { id: '048', blockId: '1x2-048', x: 31, y: 2, width: 1, height: 2, type: 'vertical' },
    { id: '049', blockId: '1x3-049', x: 31, y: 4, width: 1, height: 3, type: 'vertical' },

    // 第 4 行：继续错落有致，紧贴前面各行的最大 y 值，无缝隙
    { id: '050', blockId: '3x3-050', x: 0, y: 9, width: 3, height: 3, type: 'square' },
    { id: '051', blockId: '1x1-051', x: 2, y: 8, width: 1, height: 1, type: 'square' },
    { id: '052', blockId: '2x3-052', x: 3, y: 8, width: 2, height: 3, type: 'vertical' },
    { id: '053', blockId: '2x3-053', x: 7, y: 8, width: 2, height: 3, type: 'vertical' },
    { id: '054', blockId: '2x3-054', x: 5, y: 9, width: 2, height: 3, type: 'vertical' },
    { id: '055', blockId: '4x3-055', x: 9, y: 10, width: 4, height: 3, type: 'horizontal' },
    { id: '056', blockId: '1x3-056', x: 13, y: 8, width: 1, height: 3, type: 'vertical' },
    { id: '057', blockId: '2x2-057', x: 17, y: 7, width: 2, height: 2, type: 'square' },
    { id: '058', blockId: '4x3-058', x: 19, y: 6, width: 4, height: 3, type: 'horizontal' },
    { id: '059', blockId: '2x3-059', x: 23, y: 7, width: 2, height: 3, type: 'vertical' },
    { id: '060', blockId: '3x4-060', x: 29, y: 7, width: 3, height: 4, type: 'vertical' },

    // 第 5 行：继续错落布局，填充剩余空间
    { id: '061', blockId: '1x3-061', x: 0, y: 12, width: 1, height: 3, type: 'vertical' },
    { id: '062', blockId: '2x2-062', x: 1, y: 12, width: 2, height: 2, type: 'square' },
    { id: '063', blockId: '2x3-063', x: 3, y: 11, width: 2, height: 3, type: 'vertical' },
    { id: '064', blockId: '2x1-064', x: 5, y: 12, width: 2, height: 1, type: 'horizontal' },
    { id: '065', blockId: '2x2-065', x: 7, y: 11, width: 2, height: 2, type: 'square' },
    { id: '066', blockId: '4x1-066', x: 13, y: 11, width: 4, height: 1, type: 'horizontal' },
    { id: '067', blockId: '2x3-067', x: 17, y: 9, width: 2, height: 3, type: 'vertical' },
    { id: '068', blockId: '3x4-068', x: 19, y: 9, width: 3, height: 4, type: 'vertical' },
    { id: '069', blockId: '3x4-069', x: 22, y: 10, width: 3, height: 4, type: 'vertical' },
    { id: '070', blockId: '1x3-070', x: 25, y: 9, width: 1, height: 3, type: 'vertical' },
    { id: '071', blockId: '3x3-071', x: 29, y: 11, width: 3, height: 3, type: 'square' },

    // 第 6 行：最终行，完成 100 块布局
    { id: '072', blockId: '4x2-072', x: 1, y: 14, width: 4, height: 2, type: 'horizontal' },
    { id: '073', blockId: '2x4-073', x: 5, y: 13, width: 2, height: 4, type: 'vertical' },
    { id: '074', blockId: '3x3-074', x: 7, y: 13, width: 3, height: 3, type: 'square' },
    { id: '075', blockId: '3x2-075', x: 10, y: 13, width: 3, height: 2, type: 'horizontal' },
    { id: '076', blockId: '2x3-076', x: 13, y: 12, width: 2, height: 3, type: 'vertical' },
    { id: '077', blockId: '4x4-077', x: 15, y: 12, width: 4, height: 4, type: 'square' },
    { id: '078', blockId: '4x1-078', x: 19, y: 14, width: 4, height: 1, type: 'horizontal' },
    { id: '079', blockId: '2x2-079', x: 23, y: 14, width: 2, height: 2, type: 'square' },
    { id: '080', blockId: '3x3-080', x: 25, y: 12, width: 3, height: 3, type: 'square' },
    { id: '081', blockId: '1x3-081', x: 28, y: 11, width: 1, height: 3, type: 'vertical' },
    { id: '082', blockId: '4x3-082', x: 28, y: 14, width: 4, height: 3, type: 'horizontal' },

    // 第 7 行：继续错落布局，18 个块左右
    { id: '083', blockId: '1x2-083', x: 0, y: 15, width: 1, height: 2, type: 'vertical' },
    { id: '084', blockId: '1x1-084', x: 1, y: 16, width: 1, height: 1, type: 'square' },
    { id: '085', blockId: '3x2-085', x: 2, y: 16, width: 3, height: 2, type: 'horizontal' },
    { id: '086', blockId: '2x1-086', x: 5, y: 17, width: 2, height: 1, type: 'horizontal' },
    { id: '087', blockId: '1x3-087', x: 7, y: 16, width: 1, height: 3, type: 'vertical' },
    { id: '088', blockId: '2x2-088', x: 8, y: 16, width: 2, height: 2, type: 'square' },
    { id: '089', blockId: '2x2-089', x: 10, y: 15, width: 2, height: 2, type: 'square' },
    { id: '090', blockId: '2x1-090', x: 12, y: 15, width: 2, height: 1, type: 'horizontal' },
    { id: '091', blockId: '1x3-091', x: 14, y: 15, width: 1, height: 3, type: 'vertical' },
    { id: '092', blockId: '3x3-092', x: 15, y: 16, width: 3, height: 3, type: 'square' },
    { id: '093', blockId: '4x3-093', x: 18, y: 16, width: 4, height: 3, type: 'horizontal' },
    { id: '094', blockId: '1x1-094', x: 19, y: 15, width: 1, height: 1, type: 'square' },
    { id: '095', blockId: '2x1-095', x: 20, y: 15, width: 2, height: 1, type: 'horizontal' },
    { id: '096', blockId: '1x3-096', x: 22, y: 15, width: 1, height: 3, type: 'vertical' },
    { id: '097', blockId: '1x1-097', x: 22, y: 9, width: 1, height: 1, type: 'square' },
    { id: '098', blockId: '3x1-098', x: 19, y: 13, width: 3, height: 1, type: 'horizontal' },
    { id: '099', blockId: '4x4-099', x: 23, y: 16, width: 4, height: 4, type: 'square' },
    { id: '100', blockId: '1x1-100', x: 25, y: 15, width: 1, height: 1, type: 'square' },
    { id: '101', blockId: '2x1-101', x: 26, y: 15, width: 2, height: 1, type: 'horizontal' },
    { id: '102', blockId: '2x1-102', x: 28, y: 17, width: 2, height: 1, type: 'horizontal' },

    // 最后一行：完成剩余空间填充，103-120
    { id: '103', blockId: '2x3-103', x: 0, y: 17, width: 2, height: 3, type: 'vertical' },
    { id: '104', blockId: '2x2-104', x: 2, y: 18, width: 2, height: 2, type: 'square' },
    { id: '105', blockId: '3x2-105', x: 4, y: 18, width: 3, height: 2, type: 'horizontal' },
    { id: '106', blockId: '1x1-106', x: 7, y: 19, width: 1, height: 1, type: 'square' },
    { id: '107', blockId: '2x2-107', x: 8, y: 18, width: 2, height: 2, type: 'square' },
    { id: '108', blockId: '3x3-108', x: 10, y: 17, width: 3, height: 3, type: 'square' },
    { id: '109', blockId: '1x1-109', x: 12, y: 16, width: 1, height: 1, type: 'square' },
    { id: '110', blockId: '1x4-110', x: 13, y: 16, width: 1, height: 4, type: 'vertical' },
    { id: '111', blockId: '1x1-111', x: 14, y: 18, width: 1, height: 1, type: 'square' },
    { id: '112', blockId: '3x1-112', x: 14, y: 19, width: 3, height: 1, type: 'horizontal' },
    { id: '113', blockId: '4x1-113', x: 17, y: 19, width: 4, height: 1, type: 'horizontal' },
    { id: '114', blockId: '1x1-114', x: 21, y: 19, width: 1, height: 1, type: 'square' },
    { id: '115', blockId: '1x2-115', x: 22, y: 18, width: 1, height: 2, type: 'vertical' },
    { id: '116', blockId: '1x2-116', x: 27, y: 16, width: 1, height: 2, type: 'vertical' },
    { id: '117', blockId: '1x2-117', x: 27, y: 18, width: 1, height: 2, type: 'vertical' },
    { id: '118', blockId: '1x2-118', x: 28, y: 18, width: 1, height: 2, type: 'vertical' },
    { id: '119', blockId: '2x1-119', x: 30, y: 17, width: 2, height: 1, type: 'horizontal' },
    { id: '120', blockId: '3x2-120', x: 29, y: 18, width: 3, height: 2, type: 'horizontal' },
  ];

  const now = Date.now();
  blockConfigs.forEach(({ id, blockId, x, y, width, height, type }) => {
    const size = `${width}x${height}`;
    const priceId = size;

    db.exec(`
      INSERT INTO block_configs (id, block_id, x, y, width, height, type, size, price_id, created_at, updated_at) 
      VALUES ('${id}', '${blockId}', ${x}, ${y}, ${width}, ${height}, '${type}', '${size}', '${priceId}', ${now}, ${now});
    `);
  });

  // 3. 修改 pixel_ads 表结构 - 移除不需要的字段
  // SQLite 不支持 DROP COLUMN，需要重建表

  // 创建新的 pixel_ads 表
  db.exec(`
    CREATE TABLE pixel_ads_new (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      link_url TEXT NOT NULL,
      image_path TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      contact_info TEXT,
      user_id TEXT NOT NULL,
      block_config_id TEXT NOT NULL,    -- 关联 block_configs 的 id
      created_at INTEGER NOT NULL,
      updated_at INTEGER,
      expires_at INTEGER NOT NULL,
      block_id TEXT,                    -- 保留原有的 block_id 字段
      notes TEXT,                       -- 保留原有的 notes 字段
      FOREIGN KEY (block_config_id) REFERENCES block_configs(id)
    );
  `);

  // 复制现有数据到新表（如果存在）
  try {
    db.exec(`
      INSERT INTO pixel_ads_new (
        id, title, description, link_url, image_path, status, 
        contact_info, user_id, created_at, updated_at, expires_at,
        block_id, notes, block_config_id
      )
      SELECT 
        id, title, description, link_url, image_path, status,
        contact_info, user_id, created_at, updated_at, expires_at,
        block_id, notes, 
        CASE 
          WHEN block_id IS NOT NULL THEN substr(block_id, -3)
          ELSE '001'
        END as block_config_id
      FROM pixel_ads;
    `);
  } catch (e) {
    // 如果复制失败（可能是原表不存在数据），继续
  }

  // 删除原表并重命名新表
  db.exec(`DROP TABLE IF EXISTS pixel_ads;`);
  db.exec(`ALTER TABLE pixel_ads_new RENAME TO pixel_ads;`);

  // 创建索引
  db.exec(`CREATE INDEX idx_pixel_ads_status ON pixel_ads(status);`);
  db.exec(`CREATE INDEX idx_pixel_ads_expires_at ON pixel_ads(expires_at);`);
  db.exec(`CREATE INDEX idx_pixel_ads_user_id ON pixel_ads(user_id);`);
  db.exec(`CREATE INDEX idx_pixel_ads_block_config_id ON pixel_ads(block_config_id);`);
  db.exec(`CREATE INDEX idx_block_configs_block_id ON block_configs(block_id);`);
  db.exec(`CREATE INDEX idx_block_configs_position ON block_configs(x, y);`);
  db.exec(`CREATE INDEX idx_base_prices_id ON base_prices(id);`);
}

export function down(db: any): void {
  // 恢复原来的 pixel_ads 表结构
  db.exec(`
    CREATE TABLE pixel_ads_old (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      link_url TEXT NOT NULL,
      image_path TEXT NOT NULL,
      x_position INTEGER NOT NULL,
      y_position INTEGER NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      z_index INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active',
      contact_info TEXT,
      price REAL DEFAULT 0,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER,
      expires_at INTEGER NOT NULL,
      block_id TEXT,
      notes TEXT
    )
  `);

  // 复制数据回原表结构（设置默认值）
  try {
    db.exec(`
      INSERT INTO pixel_ads_old (
        id, title, description, link_url, image_path, 
        x_position, y_position, width, height, z_index,
        status, contact_info, price, user_id, 
        created_at, updated_at, expires_at, block_id, notes
      )
      SELECT 
        id, title, description, link_url, image_path,
        0, 0, 1, 1, 1,
        status, contact_info, 100, user_id,
        created_at, updated_at, expires_at, block_id, notes
      FROM pixel_ads;
    `);
  } catch (e) {
    // 忽略错误
  }

  // 删除新表和新创建的表
  db.exec(`DROP TABLE IF EXISTS pixel_ads;`);
  db.exec(`DROP TABLE IF EXISTS block_configs;`);
  db.exec(`DROP TABLE IF EXISTS base_prices;`);

  // 恢复原表
  db.exec(`ALTER TABLE pixel_ads_old RENAME TO pixel_ads;`);

  // 重新创建原有索引
  db.exec(`CREATE INDEX idx_pixel_ads_position ON pixel_ads(x_position, y_position);`);
  db.exec(`CREATE INDEX idx_pixel_ads_status ON pixel_ads(status);`);
  db.exec(`CREATE INDEX idx_pixel_ads_expires_at ON pixel_ads(expires_at);`);
  db.exec(`CREATE INDEX idx_pixel_ads_user_id ON pixel_ads(user_id);`);
  db.exec(`CREATE INDEX idx_pixel_ads_bounds ON pixel_ads(x_position, y_position, width, height);`);
  db.exec(`CREATE INDEX idx_pixel_ads_block_id ON pixel_ads(block_id);`);
}
