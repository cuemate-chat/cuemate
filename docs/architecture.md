# 架构与数据流

## 组件
- **desktop-tauri**: 桌面客户端
- **web**: Web前端界面  
- **web-api**: 后端API服务
- **llm-router**: LLM路由服务
- **rag-service**: RAG知识库服务
- **cuemate-asr**: 语音识别服务服务 (FunASR)

## 数据流
音频→FunASR→Web API→LLM路由（并行要点/完整）→RAG检索→前端展示

## 端口分配
- **Web API**: 3001
- **LLM Router**: 3002  
- **RAG Service**: 3003
- **CueMate ASR**: 10095 (WebSocket: ws://localhost:10095/asr)
- **Web Frontend**: 5173 (dev) / 80 (prod)
- **Desktop App**: 5174 (dev)
