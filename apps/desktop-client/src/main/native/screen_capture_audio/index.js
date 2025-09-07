// 导出编译好的原生模块
const path = require('path');

let nativeModule;
try {
  // 直接加载编译后的 .node 文件
  nativeModule = require('./build/Release/screen_capture_audio.node');
} catch (error) {
  console.error('无法加载原生音频捕获模块:', error);
  throw error;
}

module.exports = nativeModule;