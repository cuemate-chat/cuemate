# CueMate Desktop Audio Client

CueMate 桌面音频捕获客户端，用于捕获系统音频并发送到远程 ASR 服务进行语音识别。

## ✨ 功能特性

- 🎵 **系统音频捕获**: 通过虚拟声卡捕获扬声器输出
- 🔄 **跨平台支持**: Windows、macOS、Linux
- 📡 **实时传输**: WebSocket 连接到远程 ASR 服务
- 🎛️ **设备管理**: 自动检测和管理音频设备
- 🚀 **一键安装**: 自动安装虚拟音频驱动

## 🎯 免费虚拟音频解决方案

| 平台 | 驱动 | 说明 |
|-----|------|------|
| **Windows** | VB-Audio Cable | 完全免费，支持立体声 |
| **macOS** | BlackHole | 开源免费，低延迟 |
| **Linux** | PulseAudio Virtual | 系统自带，无需安装 |

## 🛠️ 开发环境

### 前置要求

- Node.js 18+
- Rust 1.70+
- Tauri CLI

### 安装依赖

```bash
# 安装前端依赖
pnpm install

# 安装 Tauri CLI (如果未安装)
pnpm add -g @tauri-apps/cli
```

### 开发模式

```bash
# 启动开发服务器
cargo tauri dev
```

### 构建应用

```bash
# 构建生产版本
cargo tauri build
```

## 📁 项目结构

```
apps/desktop-client/
├── src/                    # React 前端源码
│   ├── App.tsx            # 主应用组件
│   ├── App.css            # 样式文件
│   └── main.tsx           # 入口文件
├── src-tauri/             # Tauri Rust 后端
│   ├── src/
│   │   ├── audio/         # 音频处理模块
│   │   │   ├── mod.rs     # 模块定义
│   │   │   ├── capture.rs # 音频捕获
│   │   │   ├── device_manager.rs # 设备管理
│   │   │   └── virtual_driver.rs # 虚拟驱动
│   │   ├── commands.rs    # Tauri 命令
│   │   └── main.rs        # Rust 主程序
│   └── Cargo.toml         # Rust 依赖配置
└── package.json           # Node.js 配置
```

## 🎮 使用方法

### 1. 启动客户端
运行 CueMate Desktop Client

### 2. 安装虚拟音频驱动
- 客户端会自动检测是否已安装虚拟驱动
- 如未安装，点击"安装虚拟音频驱动"按钮
- 按照系统提示完成安装

### 3. 配置连接
- 设置 WebSocket 服务地址 (默认: `ws://localhost:8001`)
- 选择音频输入设备 (推荐选择虚拟设备)

### 4. 开始捕获
- 点击"🎤 开始音频捕获"
- 系统音频将实时发送到 ASR 服务

## 🔧 技术架构

### 音频处理流程
```
系统音频输出 → 虚拟声卡 → 音频捕获 → 格式转换 → WebSocket → ASR服务
```

### 关键技术
- **CPAL**: 跨平台音频库
- **Tokio**: 异步运行时
- **WebSocket**: 实时音频传输
- **Tauri**: 桌面应用框架

## 🎵 音频格式

| 参数 | 值 | 说明 |
|-----|---|------|
| 采样率 | 16kHz | WhisperLiveKit 推荐 |
| 声道 | 单声道 | 减少带宽占用 |
| 位深 | 16-bit | PCM 格式 |
| 编码 | 二进制 | WebSocket 传输 |

## 🔗 与 ASR 服务通信

客户端通过 WebSocket 连接到远程 ASR 服务：

1. **连接**: `ws://your-server:8001/asr`
2. **发送**: 二进制音频数据
3. **接收**: JSON 格式转录结果

## 🚨 故障排除

### 找不到虚拟音频设备
- 确认已正确安装虚拟驱动
- 重启系统后重新检测
- 检查系统音频设置

### WebSocket 连接失败
- 确认 ASR 服务已启动
- 检查防火墙设置
- 验证服务地址和端口

### 音频捕获无声音
- 确认选择了正确的虚拟输入设备
- 检查系统音频输出是否路由到虚拟设备
- 调整音频设备的音量设置

## 🔐 权限要求

### Windows
- 麦克风访问权限
- 管理员权限 (安装驱动时)

### macOS
- 麦克风访问权限
- 辅助功能权限 (可能需要)

### Linux
- 音频设备访问权限
- PulseAudio 配置权限

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