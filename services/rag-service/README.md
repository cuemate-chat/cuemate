# RAG Service - 岗位简历向量化服务

## 功能概述

RAG Service 是一个专门处理岗位和简历信息的向量化服务，将文本数据转换为向量嵌入并存储在 Chroma 向量数据库中，支持语义搜索和智能匹配。

## 主要特性

### 1. 岗位信息处理
- 自动分块：将岗位描述按语义分割成小块
- 向量化：使用自定义嵌入算法生成向量表示
- 元数据管理：存储岗位ID、用户ID、创建时间等信息

### 2. 简历信息处理
- 内容分块：智能分割简历内容
- 关联存储：与岗位信息建立关联
- 全文检索：支持简历内容的语义搜索

### 3. 向量数据库集成
- Chroma 支持：使用 Chroma 作为向量存储后端
- 集合管理：分别为岗位和简历创建独立集合
- 数据同步：与 SQLite 数据库保持同步

## API 端点

### 岗位和简历处理
- `POST /jobs/process` - 处理岗位和简历信息
- `DELETE /jobs/:jobId` - 删除岗位相关数据
- `GET /jobs/search` - 搜索岗位和简历信息

### 通用文档处理
- `POST /ingest` - 单文档处理
- `POST /ingest/batch` - 批量文档处理
- `POST /delete/by-filter` - 按条件删除
- `GET /search/jobs` - 搜索 jobs 集合（不传 query 时返回前 k 条）
- `GET /search/resumes` - 搜索 resumes 集合（不传 query 时返回前 k 条）

## 环境变量配置

```bash
# 服务配置
RAG_PORT=3003
RAG_HOST=0.0.0.0

# 向量数据库配置
VECTOR_STORE_TYPE=chroma
CHROMA_PATH=http://cuemate-chroma:8000
DEFAULT_COLLECTION=default
JOBS_COLLECTION=jobs
RESUMES_COLLECTION=resumes

# 文档处理配置
CHUNK_SIZE=500
CHUNK_OVERLAP=50
MAX_CHUNKS_PER_DOC=1000

# 检索配置
TOP_K=10
MIN_SCORE=0.7
RERANK_ENABLED=false
HYBRID_SEARCH=false
```

## 数据流程

### 1. 创建岗位和简历
1. 前端提交岗位和简历信息
2. Web API 保存到 SQLite 数据库
3. 同时调用 RAG Service 的 `/jobs/process` 端点
4. RAG Service 将内容分块并生成向量嵌入
5. 存储到 Chroma 向量数据库

### 2. 更新岗位和简历
1. 前端更新岗位或简历信息
2. Web API 更新 SQLite 数据库
3. 调用 RAG Service 删除旧数据
4. 重新处理并存储新数据

### 3. 删除岗位和简历
1. 前端删除岗位
2. Web API 删除 SQLite 数据
3. 调用 RAG Service 删除相关向量数据

## 向量存储结构

### Jobs 集合
- 文档ID: `job:{jobId}:chunk:{index}`
- 内容: 岗位名称和描述的分块内容
- 元数据: 包含岗位ID、用户ID、标题、分块索引等

### Resumes 集合
- 文档ID: `resume:{resumeId}:chunk:{index}`
- 内容: 简历标题和内容的分块内容
- 元数据: 包含简历ID、岗位ID、用户ID、标题、分块索引等

## 使用示例

### 处理岗位和简历
```bash
curl -X POST http://localhost:3003/jobs/process \
  -H "Content-Type: application/json" \
  -d '{
    "job": {
      "id": "job-123",
      "title": "前端开发工程师",
      "description": "负责公司产品的前端开发工作...",
      "user_id": "user-456",
      "created_at": 1640995200000
    },
    "resume": {
      "id": "resume-789",
      "title": "张三的简历",
      "content": "个人技能：React, Vue, TypeScript...",
      "job_id": "job-123",
      "user_id": "user-456",
      "created_at": 1640995200000
    }
  }'
```

### 搜索相关岗位和简历
```bash
curl "http://localhost:3003/jobs/search?query=前端开发&userId=user-456&topK=5"
```

## 部署说明

1. 确保 Chroma 向量数据库已启动
2. 设置必要的环境变量
3. 启动 RAG Service
4. 配置 Web API 连接到 RAG Service

## 注意事项

- 使用内置的自定义嵌入算法，无需外部 API
- Chroma 数据库需要足够的存储空间
- 建议在生产环境中启用数据加密
- 定期备份向量数据库数据

### 常用诊断命令

```bash
# 查看 Chroma 集合列表
curl -s "http://localhost:8000/api/v1/collections" | jq '.[] | {name, id}'

# 统计 jobs 集合文档数量（不传 query 时返回前 k 条）
curl -s "http://localhost:3003/search/jobs?k=1000" | jq '.results | length'

# 列出 jobs 集合前 10 条概要
curl -s "http://localhost:3003/search/jobs?k=10" | jq '.results[] | {id, jobId: .metadata.jobId, userId: .metadata.userId, title: .metadata.title}'

# 统计 resumes 集合文档数量
curl -s "http://localhost:3003/search/resumes?k=1000" | jq '.results | length'

# 列出 resumes 集合前 10 条概要
curl -s "http://localhost:3003/search/resumes?k=10" | jq '.results[] | {id, jobId: .metadata.jobId, userId: .metadata.userId, title: .metadata.title}'

# 基于关键词检索（示例）
curl -s "http://localhost:3003/search/jobs?query=前端开发&k=5" | jq '.results | length'
curl -s "http://localhost:3003/search/resumes?query=React&k=5" | jq '.results | length'
```