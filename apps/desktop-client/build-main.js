import { build } from 'esbuild';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// 构建配置
const buildConfig = {
  platform: 'node',
  target: 'node18',
  format: 'esm',
  bundle: true,
  sourcemap: true,
  minify: process.env.NODE_ENV === 'production',
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  external: ['electron'],
};

// 构建主进程
async function buildMain() {
  console.log('🔨 构建主进程...');
  
  try {
    await build({
      ...buildConfig,
      entryPoints: [resolve(__dirname, 'src/main/index.ts')],
      outfile: resolve(__dirname, 'dist/main/index.js'),
    });
    console.log('✅ 主进程构建完成');
  } catch (error) {
    console.error('❌ 主进程构建失败:', error);
    process.exit(1);
  }
}

// 构建预加载脚本
async function buildPreloadScripts() {
  console.log('🔨 构建预加载脚本...');
  
  const preloadScripts = [
    {
      entry: resolve(__dirname, 'src/main/preload/controlBar.ts'),
      output: resolve(__dirname, 'dist/main/preload/controlBar.js'),
    },
    {
      entry: resolve(__dirname, 'src/main/preload/closeButton.ts'),
      output: resolve(__dirname, 'dist/main/preload/closeButton.js'),
    },
    {
      entry: resolve(__dirname, 'src/main/preload/mainContent.ts'),
      output: resolve(__dirname, 'dist/main/preload/mainContent.js'),
    },
  ];

  try {
    await Promise.all(
      preloadScripts.map(({ entry, output }) =>
        build({
          ...buildConfig,
          entryPoints: [entry],
          outfile: output,
        })
      )
    );
    console.log('✅ 预加载脚本构建完成');
  } catch (error) {
    console.error('❌ 预加载脚本构建失败:', error);
    process.exit(1);
  }
}

// 主构建函数
async function buildAll() {
  console.log('🚀 开始构建 Electron 主进程和预加载脚本');
  
  await Promise.all([
    buildMain(),
    buildPreloadScripts(),
  ]);
  
  console.log('🎉 Electron 主进程构建完成');
}

// 运行构建
if (import.meta.url === `file://${process.argv[1]}`) {
  buildAll().catch(error => {
    console.error('构建失败:', error);
    process.exit(1);
  });
}

export { buildAll };