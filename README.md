# CueMate - 实时语音面试助手

<div align="center">

[![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D8.0.0-orange.svg)](https://pnpm.io)

实时语音面试助手，提供智能语音识别、实时答案生成和知识库检索功能

[English](README.en.md) | 中文

</div>

## ✨ 核心功能

- 🎙️ **实时语音识别** - 基于 WhisperLiveKit 的本地语音识别，支持用户和面试官双声道
- 🤖 **智能答案生成** - 多 LLM 路由，支持 GPT-4、Moonshot、GLM、Qwen
- 📚 **RAG 知识库** - 私有知识库检索增强，提供精准上下文
- 🖥️ **跨平台支持** - 桌面端 (Mac/Win/Linux) + 移动端 (iOS/Android)
- 🔒 **隐私优先** - 支持完全离线模式，数据本地化处理
- ⚡ **极低延迟** - 优化的流式处理，毫秒级响应

## 🏗️ 技术架构

```
CueMate/
├── apps/                    # 应用层
│   ├── desktop-tauri/      # 桌面应用 (Tauri + React)
│   └── mobile-flutter/     # 移动应用 (Flutter)
├── services/               # 后端服务
│   ├── web-api/          # Web API 服务
│   ├── llm-router/       # LLM 路由服务
│   └── rag-service/      # RAG 知识库服务
├── packages/              # 共享包
│   ├── ui-kit/           # UI 组件库
│   ├── core-prompts/     # 提示词模板
│   └── cml-sdk/          # 客户端 SDK
└── infra/                # 基础设施
    ├── docker/           # Docker 配置
    └── nginx/            # Nginx 配置
```

## 快速开始

### 前置要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker & Docker Compose
- Rust (用于 Tauri 桌面应用)

### 安装步骤

1. **克隆仓库**

```bash
git clone https://github.com/yourusername/cuemate.git
cd cuemate
```

2. **环境配置**

```bash
cp .env.example .env
# 编辑 .env 文件，填入你的 API Keys
```

3. **安装依赖**

```bash
make install
# 或者
pnpm install
```

4. **启动服务**

```bash
# 启动所有服务 (Docker)
make docker-up

# 或者开发模式
make dev
```

5. **启动桌面应用**

```bash
make dev-desktop
# 或者
cd apps/desktop-tauri && pnpm tauri:dev
```

## 📝 配置说明

### API Keys 配置

在 `.env` 文件中配置必要的 API Keys：

```env
# ASR 配置
DEEPGRAM_API_KEY=your_deepgram_api_key

# LLM 配置
MOONSHOT_API_KEY=your_moonshot_api_key  # 可选
GLM_API_KEY=your_glm_api_key            # 可选
QWEN_API_KEY=your_qwen_api_key          # 可选
```

### 音频设备配置

#### macOS
- 推荐使用 BlackHole (免费) 或 Loopback (付费)
- 安装后在系统设置中选择虚拟音频设备

#### Windows
- 推荐使用 VB-Cable
- 安装虚拟声卡驱动后重启

#### Linux
- 使用 PulseAudio 或 PipeWire
- 通过配置文件设置虚拟音频设备

## 🔧 开发指南

### 项目命令

```bash
# 开发
make dev              # 启动所有服务
make dev-desktop      # 启动桌面应用
make dev-services     # 启动后端服务

# 构建
make build           # 构建所有应用
make build-desktop   # 构建桌面应用
make build-docker    # 构建 Docker 镜像

# 测试
make test           # 运行测试
make lint           # 代码检查
make format         # 格式化代码

# Docker
make docker-up      # 启动 Docker 服务
make docker-down    # 停止 Docker 服务
make docker-logs    # 查看日志
```

### 服务端点

- ASR Gateway: `http://localhost:3001`
- LLM Router: `http://localhost:3002`
- RAG Service: `http://localhost:3003`
- Main Gateway: `http://localhost:80`

## 📦 部署

### Docker 部署

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看状态
docker-compose ps
```

### Kubernetes 部署

```bash
# 应用配置
kubectl apply -f infra/k8s/

# 查看状态
kubectl get pods -n cuemate
```

## 🔐 安全与隐私

- ✅ 支持完全离线模式
- ✅ 数据本地加密存储
- ✅ PII 信息自动脱敏
- ✅ 审计日志记录
- ✅ 细粒度权限控制

## 📄 许可证

本项目采用 GNU GPL v3 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献指南

欢迎贡献代码！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详情。

## 📮 联系我们

- Issue: [GitHub Issues](https://github.com/yourusername/cuemate/issues)
- Email: contact@cuemate.ai

## 🙏 致谢

感谢以下开源项目：

- [Tauri](https://tauri.app/)
- [Deepgram](https://deepgram.com/)
- [OpenAI](https://openai.com/)
- [ChromaDB](https://www.trychroma.com/)

---

<div align="center">
Made with ❤️ by CueMate Team
</div>
