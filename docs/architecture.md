# 架构与数据流

## 组件
- **desktop-tauri**: 桌面客户端
- **web**: Web前端界面  
- **web-api**: 后端API服务
- **llm-router**: LLM路由服务
- **rag-service**: RAG知识库服务
- **asr-user**: 用户语音识别 (WhisperLiveKit)
- **asr-interviewer**: 面试官语音识别 (WhisperLiveKit)

## 数据流
音频→WhisperLiveKit ASR→Web API→LLM路由（并行要点/完整）→RAG检索→前端展示

## 端口分配
- **Web API**: 3001
- **LLM Router**: 3002  
- **RAG Service**: 3003
- **ASR User**: 8001 (WebSocket: ws://localhost:8001/asr)
- **ASR Interviewer**: 8002 (WebSocket: ws://localhost:8002/asr)
- **Web Frontend**: 5173 (dev) / 80 (prod)
- **Desktop App**: 5174 (dev)
