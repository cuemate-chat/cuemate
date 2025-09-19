# CueMate Desktop Audio Client

CueMate 桌面音频捕获客户端，用于捕获系统音频扬声器并发送到远程 ASR 服务进行语音识别。

## ✨ 功能特性

- 🎵 **系统音频扬声器捕获**: 基于 macOS ScreenCaptureKit 框架的原生音频捕获
- 🔄 **跨架构支持**: 支持 Intel (x86_64) 和 Apple Silicon (arm64)
- 📡 **实时传输**: WebSocket 连接到远程 ASR 服务
- 🎛️ **设备管理**: 自动检测和管理音频设备
- 🚀 **原生性能**: 无需外部依赖，使用系统原生 API

## 🎯 原生音频技术

### macOS ScreenCaptureKit
- **系统要求**: macOS 13.0+ (Ventura)
- **权限要求**: 屏幕录制权限 (包含系统音频扬声器)
- **技术优势**: 
  - 无需虚拟音频驱动
  - 系统级音频捕获
  - 低延迟高性能
  - 官方 API 支持

## 🛠️ 开发环境

### 前置要求

- **Node.js 18+**
- **pnpm 8+**
- **macOS 13.0+** (Ventura 或更高版本)
- **Xcode Command Line Tools** (包含 clang++ 编译器)
- **node-gyp 依赖**:
  - Python 3.x
  - C++ 编译器工具链

### 安装依赖

```bash
# 安装所有依赖 (包括编译原生模块)
pnpm install
# 该命令会自动执行:
# 1. 安装 Node.js 依赖
# 2. 编译 ScreenCaptureKit 原生模块
# 3. 构建 C++/Objective-C++ 代码
```

### 开发模式

```bash
cd apps/desktop-client

# 一键启动开发环境 (唯一需要的命令)
pnpm electron:dev
# 该命令使用 concurrently 并行执行:
# 1. pnpm dev - 启动 Vite 开发服务器  
# 2. pnpm build:native - 编译原生模块 (C++/Objective-C++)
# 3. pnpm build:main - 构建主进程 (TypeScript)
# 4. pnpm electron - 启动 Electron 应用
```

**注意**: 无需分别启动，`pnpm electron:dev` 已包含完整的开发流程！

### 服务管理

```bash
# 启动所有开发服务
pnpm dev & pnpm electron:dev

# 停止所有开发服务 (手动方式)
pkill -f 'pnpm.*dev' || pkill -f 'webpack-dev-server' || pkill -f 'vite' || pkill -f 'esbuild'

# 查看运行中的开发服务
ps aux | grep -E "(pnpm|electron)" | grep -v grep

# 注意: 关闭 Electron 客户端时，开发服务会自动停止
```

### 构建应用

```bash
# 构建生产版本 (包括原生模块)
pnpm build
# 该命令执行:
# 1. pnpm build:native - 编译原生音频捕获模块
# 2. pnpm build:main - 构建 Electron 主进程
# 3. pnpm build:renderer - 构建前端代码

# 仅重新编译原生模块
pnpm build:native

# 打包 Electron 应用
pnpm electron:build
```

## 📁 项目结构

```
apps/desktop-client/
├── src/
│   ├── main/              # Electron 主进程
│   │   ├── index.ts       # 主进程入口
│   │   ├── windows/       # 窗口管理
│   │   ├── audio/         # TypeScript 音频接口层
│   │   │   └── SystemAudioCapture.ts
│   │   ├── websocket/     # WebSocket 客户端
│   │   └── native/        # 原生模块
│   │       └── screen_capture_audio/
│   │           ├── binding.gyp              # node-gyp 构建配置
│   │           ├── ScreenCaptureAudio.h     # C++ 头文件
│   │           ├── ScreenCaptureAudio.mm    # Objective-C++ 实现
│   │           ├── index.cpp                # Node.js 绑定层
│   │           └── build/                   # 编译输出目录
│   │               └── Release/
│   │                   └── screen_capture_audio.node
│   ├── renderer/          # React 前端源码
│   │   ├── components/    # UI 组件
│   │   └── pages/        # 页面组件
│   └── preload/          # 预加载脚本
└── package.json          # Node.js 配置
```

## 🎮 使用方法

### 1. 启动客户端
运行 CueMate Desktop Client

### 2. 安装虚拟音频驱动
- 客户端会自动检测是否已安装虚拟驱动
- 如未安装，点击"安装虚拟音频驱动"按钮
- 按照系统提示完成安装

### 3. 配置连接
- 设置 WebSocket 服务地址 (默认: `ws://localhost:10095`)
- 选择音频输入设备 (推荐选择虚拟设备)

### 4. 开始捕获
- 点击"🎤 开始音频捕获"
- 系统音频扬声器将实时发送到 ASR 服务

## 🔧 技术架构

### 音频处理流程
```
系统音频扬声器输出 → ScreenCaptureKit → 原生模块 → TypeScript接口 → WebSocket → ASR服务
```

### 关键技术栈
- **ScreenCaptureKit**: macOS 原生系统音频扬声器捕获框架
- **Objective-C++**: ScreenCaptureKit API 调用层 (.mm 文件)
- **C++**: Node.js 原生模块绑定层 (.cpp 文件)
- **Node.js N-API**: JavaScript ↔ 原生代码桥接
- **TypeScript**: 音频接口封装层
- **Electron**: 桌面应用框架
- **WebSocket**: 实时音频数据传输

### 原生模块技术详情

#### 编程语言组合
1. **Objective-C++ (ScreenCaptureAudio.mm)**:
   - 调用 macOS ScreenCaptureKit 系统 API
   - 处理音频流数据回调
   - 管理系统权限和错误处理

2. **C++ (index.cpp)**:
   - Node.js N-API 绑定层
   - JavaScript 对象与原生对象转换
   - 线程安全的回调处理

3. **C++ 头文件 (ScreenCaptureAudio.h)**:
   - 跨语言接口定义
   - 避免在头文件中暴露 Objective-C 类型

## 🎵 音频格式

| 参数 | 值 | 说明 |
|-----|---|------|
| 采样率 | 16kHz | WhisperLiveKit 推荐 |
| 声道 | 单声道 | 减少带宽占用 |
| 位深 | 16-bit | PCM 格式 |
| 编码 | 二进制 | WebSocket 传输 |

## 🔗 与 ASR 服务通信

客户端通过 WebSocket 连接到远程 ASR 服务：

1. **连接**: `ws://your-server:10095/asr`
2. **发送**: 二进制音频数据
3. **接收**: JSON 格式转录结果

## 🚨 故障排除

### 原生模块编译失败
- 确认已安装 Xcode Command Line Tools: `xcode-select --install`
- 检查 Python 版本: `python3 --version` (需要 3.x)
- 确认 macOS 版本 ≥ 13.0
- 重新安装依赖: `rm -rf node_modules && pnpm install`

### 系统音频扬声器捕获权限错误
- 系统偏好设置 → 安全性与隐私 → 屏幕录制
- 添加并勾选 CueMate Desktop Client
- 重启应用使权限生效

### WebSocket 连接失败
- 确认 web-api 服务在端口 3001 运行
- 检查防火墙设置
- 验证服务地址和端口

### 音频捕获无声音
- 确认系统正在播放音频
- 检查系统音量设置
- 验证 ScreenCaptureKit 权限已授予

## 🔐 权限要求

### macOS (当前支持平台)
- **屏幕录制权限** (必需):
  - 系统偏好设置 → 安全性与隐私 → 屏幕录制
  - 添加 CueMate Desktop Client 应用
  - ScreenCaptureKit 框架需要此权限来捕获系统音频扬声器

### 权限配置步骤
1. 首次启动应用时，系统会弹出权限请求对话框
2. 点击"打开系统偏好设置"
3. 在"屏幕录制"选项卡中勾选应用
4. 重启应用以使权限生效

### 注意事项
- 屏幕录制权限包含了系统音频扬声器捕获权限
- 不需要单独的麦克风权限 (我们不捕获麦克风)
- 开发模式下同样需要配置权限

## 📋 待办事项

- [ ] 添加音频质量配置
- [ ] 实现自动重连机制
- [ ] 添加音频录制功能
- [ ] 支持多设备同时捕获
- [ ] 添加音频可视化
- [ ] 实现配置文件导入/导出

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License