import { build } from 'esbuild';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// 构建配置
const buildConfig = {
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  bundle: true,
  sourcemap: true,
  minify: process.env.NODE_ENV === 'production',
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  external: [
    'electron',
    'fs',
    'path', 
    'os',
    'crypto',
    'util',
    'events',
    'stream',
    'http',
    'https',
    'url',
    'querystring',
    'zlib',
    'child_process'
  ],
  alias: {
    'node:fs': 'fs',
    'node:path': 'path',
    'node:os': 'os',
    'node:url': 'url',
  },
};

// 构建主进程
async function buildMain(watchMode = false) {
  // 构建脚本中保留 console.log，因为这是构建工具
  try {
    const buildOptions = {
      ...buildConfig,
      entryPoints: [resolve(__dirname, 'src/main/index.ts')],
      outfile: resolve(__dirname, 'dist/main/index.cjs'),
    };

    if (watchMode) {
      const { context } = await import('esbuild');
      const buildContext = await context({
        ...buildOptions,
        plugins: [
          {
            name: 'rebuild-notify',
            setup(build) {
              build.onEnd((result) => {
                if (result.errors.length === 0) {
                  console.log('主进程重新构建完成');
                } else {
                  console.error('主进程重新构建失败');
                }
              });
            },
          },
        ],
      });
      await buildContext.watch();
      console.log('主进程构建监听已启动');
      return buildContext;
    } else {
      await build(buildOptions);
      console.log('主进程构建完成');
    }
  } catch (error) {
    console.error('主进程构建失败:', error);
    process.exit(1);
  }
}

// 构建预加载脚本
async function buildPreloadScripts(watchMode = false) {
  console.log('构建预加载脚本...');
  
  const preloadScripts = [
    {
      entry: resolve(__dirname, 'src/main/preload/controlBar.ts'),
      output: resolve(__dirname, 'dist/main/preload/controlBar.js'),
    },
    {
      entry: resolve(__dirname, 'src/main/preload/aiQuestion.ts'),
      output: resolve(__dirname, 'dist/main/preload/aiQuestion.js'),
    },
    {
      entry: resolve(__dirname, 'src/main/preload/aiQuestionHistory.ts'),
      output: resolve(__dirname, 'dist/main/preload/aiQuestionHistory.js'),
    },
    {
      entry: resolve(__dirname, 'src/main/preload/interviewer.ts'),
      output: resolve(__dirname, 'dist/main/preload/interviewer.js'),
    },
  ];

  try {
    if (watchMode) {
      const { context } = await import('esbuild');
      const contexts = await Promise.all(
        preloadScripts.map(async ({ entry, output }) => {
          const buildContext = await context({
            ...buildConfig,
            format: 'cjs', // 预加载脚本必须使用 CommonJS 格式
            entryPoints: [entry],
            outfile: output,
            plugins: [
              {
                name: 'preload-rebuild-notify',
                setup(build) {
                  build.onEnd((result) => {
                    if (result.errors.length === 0) {
                      console.log(`预加载脚本重新构建完成: ${entry}`);
                    } else {
                      console.error(`预加载脚本重新构建失败: ${entry}`);
                    }
                  });
                },
              },
            ],
          });
          await buildContext.watch();
          return buildContext;
        })
      );
      console.log('预加载脚本构建监听已启动');
      return contexts;
    } else {
      await Promise.all(
        preloadScripts.map(({ entry, output }) =>
          build({
            ...buildConfig,
            format: 'cjs', // 预加载脚本必须使用 CommonJS 格式
            entryPoints: [entry],
            outfile: output,
          })
        )
      );
      console.log('预加载脚本构建完成');
    }
  } catch (error) {
    console.error('预加载脚本构建失败:', error);
    process.exit(1);
  }
}

// 复制原生模块
function copyNativeModule() {
  try {
    const sourceNativeModule = resolve(__dirname, 'src/main/native/screen_capture_audio/build/Release/screen_capture_audio.node');
    const destDir = resolve(__dirname, 'dist/native/screen_capture_audio');
    const destFile = resolve(destDir, 'index.node');
    
    console.log('检查原生模块:', sourceNativeModule);
    console.log('文件存在:', existsSync(sourceNativeModule));
    
    if (existsSync(sourceNativeModule)) {
      if (!existsSync(destDir)) {
        console.log('创建目标目录:', destDir);
        mkdirSync(destDir, { recursive: true });
      }
      console.log('复制文件:', sourceNativeModule, '->', destFile);
      copyFileSync(sourceNativeModule, destFile);
      console.log('原生模块复制成功');
    } else {
      console.warn('原生模块未找到，跳过复制');
      console.warn('期望路径:', sourceNativeModule);
    }
  } catch (error) {
    console.error('复制原生模块失败:', error);
  }
}

// 主构建函数
async function buildAll(watchMode = false) {
  console.log('开始构建 Electron 主进程和预加载脚本');
  
  if (watchMode) {
    console.log('启用监听模式');
    const contexts = await Promise.all([
      buildMain(true),
      buildPreloadScripts(true),
    ]);
    
    // 复制原生模块
    copyNativeModule();
    
    console.log('Electron 主进程构建监听已启动');
    
    // 监听 Ctrl+C 退出
    process.on('SIGINT', async () => {
      console.log('\n正在停止构建监听...');
      try {
        await Promise.all(contexts.flat().filter(Boolean).map(ctx => ctx.dispose?.()));
        console.log('构建监听已停止');
        process.exit(0);
      } catch (error) {
        console.error('停止构建监听失败:', error);
        process.exit(1);
      }
    });
    
    return contexts;
  } else {
    await Promise.all([
      buildMain(),
      buildPreloadScripts(),
    ]);
    
    // 复制原生模块
    copyNativeModule();
    
    console.log('Electron 主进程构建完成');
  }
}

// 运行构建
if (import.meta.url === `file://${process.argv[1]}`) {
  const isWatchMode = process.argv.includes('--watch');
  
  buildAll(isWatchMode).catch(error => {
    console.error('构建失败:', error);
    process.exit(1);
  });
}

export { buildAll };
