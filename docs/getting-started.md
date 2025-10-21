# CueMate 本地开发快速上手

## 先决条件

### 必需工具
- **Node.js** ≥ 20（建议使用 20 或 24）
- **pnpm** ≥ 8.12
- **Docker Desktop** 已安装并运行
- **Git** 用于版本控制

### 系统要求
- **macOS**: 10.15 或更高版本（开发桌面应用需要）
- **内存**: 至少 4GB
- **磁盘空间**: 至少 10GB 可用空间

## 快速开始

项目提供了完整的 Makefile，推荐使用 make 命令进行开发。

### 方式一：使用 Makefile（推荐）

```bash
# 查看所有可用命令
make help

# 完整环境设置（一键安装 + 构建 + 启动所有服务）
make setup-complete

# 启动桌面客户端开发模式
make dev-desktop

# 查看服务状态
make status
```

### 方式二：手动命令

#### 1. 克隆仓库并安装依赖
```bash
git clone git@github.com:cuemate-chat/cuemate.git
cd cuemate
pnpm install
```

#### 2. 启动所有后端服务
```bash
cd infra/docker
env VERSION=v0.1.0 docker compose -f docker-compose.yml up -d
```

这将启动所有必需的服务：
- `cuemate-web` - Web 前端（端口 80）
- `cuemate-web-api` - 业务 API（端口 3001）
- `cuemate-llm-router` - LLM 路由（端口 3002）
- `cuemate-rag-service` - RAG 知识库（端口 3003）
- `cuemate-asr` - 语音识别（端口 10095）
- `cuemate-chroma` - 向量数据库（端口 8000）

### 3. 验证服务状态
```bash
# 检查所有服务是否运行
docker ps | grep cuemate

# 健康检查
curl http://localhost               # Web Frontend
curl http://localhost:3001/health   # Web API
curl http://localhost:3002/health   # LLM Router
curl http://localhost:3003/health   # RAG Service
curl http://localhost:8000/health   # ChromaDB
curl http://localhost:10095         # FunASR
```

### 4. 访问应用
- **Web 前端**: http://localhost （如果启动了 cuemate-web 服务）
- **桌面应用**: 参考下面的桌面客户端开发部分

## 服务端口一览

| 服务 | 端口 | 用途 |
|------|------|------|
| Web Frontend | 80 | Web 前端界面 |
| Web API | 3001 | 业务 API（SQLite 数据库） |
| LLM Router | 3002 | 大模型路由服务 |
| RAG Service | 3003 | 知识库检索服务 |
| ChromaDB | 8000 | 向量数据库 |
| FunASR | 10095 | 实时语音识别 |

## 桌面客户端开发

### 启动开发模式（热重载）
```bash
cd apps/desktop-client
pnpm electron:dev
```

首次启动时会自动：
- 编译 TypeScript 代码
- 构建渲染进程（React 应用）
- 构建主进程（Electron）
- 编译原生音频模块（macOS 专用）
- 启动 Electron 窗口

### 只构建不启动
```bash
cd apps/desktop-client

# 完整构建（包含类型检查、原生模块、主进程、渲染进程）
pnpm build

# 分步构建
pnpm typecheck              # TypeScript 类型检查
pnpm build:native:electron  # 编译原生音频模块
pnpm build:main            # 构建主进程
pnpm build:renderer        # 构建渲染进程
```

### 打包桌面应用
```bash
# 生成 macOS 安装包（.dmg）
cd apps/desktop-client
pnpm dist

# 查看生成的安装包
ls -lh release/*.dmg
```

## 本地开发服务（不使用 Docker）

如果你需要修改后端服务代码并调试，可以不用 Docker，直接运行：

```bash
# Web API 服务（端口 3001）
pnpm --filter @cuemate/web-api dev

# LLM 路由服务（端口 3002）
pnpm --filter @cuemate/llm-router dev

# RAG 知识库服务（端口 3003）
pnpm --filter @cuemate/rag-service dev

# Web 前端（端口 5173）
pnpm --filter @cuemate/web dev
```

注意：ChromaDB 和 FunASR 仍需要 Docker 运行。

## Docker 服务管理

### 使用 Makefile 管理（推荐）

```bash
# 启动所有服务
make docker-up

# 停止所有服务
make docker-down

# 重启所有服务
make restart

# 重新构建并启动
make rebuild

# 查看日志（交互式菜单）
make docker-logs

# 查看特定服务日志
make logs-web-api   # Web API 日志
make logs-llm       # LLM Router 日志
make logs-rag       # RAG Service 日志
make logs-asr       # ASR 服务日志
make logs-web       # Web Frontend 日志
make logs-all       # 所有服务日志

# 检查服务状态
make status
```

### 使用 docker compose 命令

#### 查看日志
```bash
docker logs cuemate-web           # Web Frontend
docker logs cuemate-web-api       # Web API
docker logs cuemate-llm-router    # LLM Router
docker logs cuemate-rag-service   # RAG Service
docker logs cuemate-asr           # FunASR
docker logs cuemate-chroma        # ChromaDB
```

### 重启服务
```bash
cd infra/docker

# 重启所有服务
env VERSION=v0.1.0 docker compose -f docker-compose.yml restart

# 重启特定服务
docker restart cuemate-web-api
```

### 重新构建并启动
```bash
cd infra/docker
env VERSION=v0.1.0 docker compose -f docker-compose.yml build
env VERSION=v0.1.0 docker compose -f docker-compose.yml up -d
```

### 停止所有服务
```bash
cd infra/docker
env VERSION=v0.1.0 docker compose -f docker-compose.yml down
```

## 数据存储位置

- **SQLite 数据库**: `~/data/sqlite/cuemate.db`
- **日志文件**: `~/data/logs/`
  - `~/data/logs/info/desktop-client/YYYY-MM-DD/info.log`
  - `~/data/logs/warn/desktop-client/YYYY-MM-DD/warn.log`
  - `~/data/logs/error/desktop-client/YYYY-MM-DD/error.log`
- **ChromaDB 数据**: Docker volume `cuemate-chroma-data`

## 调试技巧

### 桌面应用调试
1. 打开开发者工具：`Command+Option+I` (macOS)
2. 查看主进程日志：Terminal 输出
3. 查看渲染进程日志：开发者工具 Console

### 查看实时日志
```bash
# 桌面应用日志
tail -f ~/data/logs/info/desktop-client/$(date +%Y-%m-%d)/info.log

# Docker 服务日志
docker logs -f cuemate-web-api
```

### 测试 WebSocket 连接
```bash
# 使用 wscat 测试 FunASR WebSocket
npm install -g wscat
wscat -c ws://localhost:10095
```

## 常见问题

### 端口冲突
如果某个端口已被占用，可以修改 `infra/docker/docker-compose.yml` 中的端口映射。

### 桌面应用启动失败
1. 检查后端服务是否运行：`docker ps | grep cuemate`
2. 查看错误日志：`~/data/logs/error/desktop-client/`
3. 确保 FunASR 服务可访问：`curl http://localhost:10095`

## Makefile 命令参考

### 环境设置
```bash
make help              # 查看所有可用命令
make install           # 安装所有依赖
make setup             # 初始化项目设置
make setup-complete    # 完整环境设置（安装 + 构建 + 启动服务）
make check-deps        # 检查必需工具是否已安装
```

### 开发命令
```bash
make dev               # 启动 Web 前端开发模式
make dev-desktop       # 启动桌面客户端开发模式
make dev-services      # 启动所有后端服务
make build             # 构建所有应用
make build-desktop     # 构建桌面应用生产版本
make build-docker      # 构建并启动 Docker 服务
```

### Docker 服务
```bash
make docker-up         # 启动所有 Docker 服务
make docker-down       # 停止所有 Docker 服务
make restart           # 重启所有服务
make rebuild           # 重新构建并重启所有服务
make status            # 检查所有服务状态
```

### 日志查看
```bash
make docker-logs       # 显示日志命令菜单
make logs-web-api      # Web API 日志
make logs-llm          # LLM Router 日志
make logs-rag          # RAG Service 日志
make logs-asr          # ASR 服务日志
make logs-web          # Web Frontend 日志
make logs-all          # 所有服务日志
```

### 测试与代码质量
```bash
make test              # 运行所有测试
make test-watch        # 监听模式运行测试
make lint              # 代码检查
make format            # 代码格式化
```

### 清理
```bash
make clean             # 清理所有构建产物
make docker-clean      # 清理 Docker 数据（慎用）
```