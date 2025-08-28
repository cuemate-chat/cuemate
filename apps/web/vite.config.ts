import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.VITE_WEB_API_BASE || 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // 将第三方库分离到单独的chunk
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('antd')) {
              return 'vendor-antd';
            }
            return 'vendor';
          }
          // 将API模块分离
          if (id.includes('/api/')) {
            return 'api';
          }
        },
      },
    },
    // 设置chunk大小警告阈值
    chunkSizeWarningLimit: 1000,
  },
});
