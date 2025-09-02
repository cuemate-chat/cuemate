import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  
  // 开发服务器配置
  server: {
    port: 3000,
    host: 'localhost',
    cors: true,
    open: false, // Electron 会自动打开窗口
  },

  // 构建配置
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: true,
    
    rollupOptions: {
      input: {
        // 渲染进程入口（React应用）
        'control-bar': resolve(__dirname, 'src/renderer/control-bar/index.html'),
        'close-button': resolve(__dirname, 'src/renderer/close-button/index.html'),
        'main-content': resolve(__dirname, 'src/renderer/main-content/index.html'),
      },
      
      output: {        
        // 渲染进程文件输出配置
        entryFileNames: 'renderer/[name]/[name].js',
        chunkFileNames: 'renderer/chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || '';
          
          // HTML 文件
          if (name.endsWith('.html')) {
            const windowName = name.replace('.html', '');
            return `renderer/${windowName}/[name][extname]`;
          }
          
          // CSS 文件
          if (name.endsWith('.css')) {
            return 'renderer/assets/[name]-[hash][extname]';
          }
          
          // 其他资源文件
          return 'renderer/assets/[name]-[hash][extname]';
        },
      },
    },
  },

  // 解析配置
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@main': resolve(__dirname, 'src/main'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@components': resolve(__dirname, 'src/renderer/components'),
      '@hooks': resolve(__dirname, 'src/renderer/hooks'),
      '@utils': resolve(__dirname, 'src/renderer/utils'),
      '@assets': resolve(__dirname, 'src/renderer/assets'),
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },

  // CSS 配置
  css: {
    postcss: './postcss.config.js',
  },

  // 针对 Electron 的特殊配置
  define: {
    // 在渲染进程中定义全局变量
    __IS_DEV__: process.env.NODE_ENV === 'development',
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },

  // 优化配置
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'framer-motion',
      'lucide-react',
    ],
    exclude: [
      'electron',
    ],
  },

  // 环境变量
  envPrefix: 'VITE_',
});