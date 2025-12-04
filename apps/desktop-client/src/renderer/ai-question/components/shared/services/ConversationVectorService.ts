/**
 * 对话向量服务
 * 负责将对话历史存储到 ChromaDB，并提供语义检索功能
 */

import { createLogger } from '../../../../../utils/rendererLogger.js';

const log = createLogger('ConversationVectorService');

interface ConversationDocument {
  id?: string;  // 唯一标识符，用于幂等性保护（upsert）
  content: string;
  metadata: {
    type: string;
    interviewId: string;
    sequence: number;
    question: string;
    answer: string;
    timestamp: number;
  };
}

export class ConversationVectorService {
  private ragServiceURL = 'http://localhost:3003';

  /**
   * 将一轮对话存入 ChromaDB
   *
   * 幂等性保护：使用 `{interviewId}_conv_{sequence}` 作为唯一 ID，
   * 后端应实现 upsert 逻辑，相同 ID 的文档会更新而非重复插入
   */
  async storeConversation(params: {
    interviewId: string;
    sequence: number;
    question: string;
    answer: string;
  }): Promise<boolean> {
    try {
      const { interviewId, sequence, question, answer } = params;

      // 构建文档内容（包含问题和答案）
      const content = `问题: ${question}\n回答: ${answer}`;

      // 生成唯一标识符，用于幂等性保护
      const documentId = `${interviewId}_conv_${sequence}`;

      const document: ConversationDocument = {
        id: documentId,
        content,
        metadata: {
          type: 'conversation',
          interviewId: interviewId,
          sequence,
          question,
          answer,
          timestamp: Date.now(),
        },
      };

      // 调用 RAG 服务存储（后端应根据 id 做 upsert）
      const response = await fetch(`${this.ragServiceURL}/ingest/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collection: `conversation_${interviewId}`,
          documents: [document],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        log.error('storeConversation', '存储失败', { errorText });
        return false;
      }

      return true;
    } catch (error) {
      log.error('storeConversation', '存储异常', undefined, error);
      return false;
    }
  }

  /**
   * 批量存储对话历史
   *
   * 幂等性保护：每个文档使用 `{interviewId}_conv_{sequence}` 作为唯一 ID
   */
  async batchStoreConversations(params: {
    interviewId: string;
    conversations: Array<{
      sequence: number;
      question: string;
      answer: string;
    }>;
  }): Promise<boolean> {
    try {
      const { interviewId, conversations } = params;

      const documents: ConversationDocument[] = conversations.map((conv) => ({
        id: `${interviewId}_conv_${conv.sequence}`,
        content: `问题: ${conv.question}\n回答: ${conv.answer}`,
        metadata: {
          type: 'conversation',
          interviewId: interviewId,
          sequence: conv.sequence,
          question: conv.question,
          answer: conv.answer,
          timestamp: Date.now(),
        },
      }));

      const response = await fetch(`${this.ragServiceURL}/ingest/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collection: `conversation_${interviewId}`,
          documents,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        log.error('batchStoreConversations', '批量存储失败', { errorText });
        return false;
      }

      return true;
    } catch (error) {
      log.error('batchStoreConversations', '批量存储异常', undefined, error);
      return false;
    }
  }

  /**
   * 语义检索相关对话历史
   *
   * 根据当前问题，从历史对话中检索最相关的几轮
   */
  async retrieveRelevantConversations(params: {
    interviewId: string;
    currentQuestion: string;
    topK?: number;
  }): Promise<Array<{ question: string; answer: string; similarity: number }>> {
    try {
      const { interviewId, currentQuestion, topK = 3 } = params;

      const response = await fetch(`${this.ragServiceURL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collection: `conversation_${interviewId}`,
          query: currentQuestion,
          n_results: topK,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        log.error('retrieveRelevantConversations', '检索失败', { errorText });
        return [];
      }

      const data = await response.json();

      // 解析结果
      const results = data.results || [];
      const conversations = results.map((result: any) => ({
        question: result.metadata?.question || '',
        answer: result.metadata?.answer || '',
        similarity: result.similarity || 0,
      }));

      return conversations;
    } catch (error) {
      log.error('retrieveRelevantConversations', '检索异常', undefined, error);
      return [];
    }
  }

  /**
   * 将简历/JD分块存入 ChromaDB
   *
   * 用于后续根据问题检索相关片段
   */
  async storeResumeAndJD(params: {
    interviewId: string;
    resume: string;
    jd: string;
  }): Promise<boolean> {
    try {
      const { interviewId, resume, jd } = params;

      // 简单分块策略：每500字一个chunk
      const resumeChunks = this.chunkText(resume, 500);
      const jdChunks = this.chunkText(jd, 300);

      const documents: any[] = [];

      // 简历chunks
      resumeChunks.forEach((chunk, index) => {
        documents.push({
          content: chunk,
          metadata: {
            type: 'resume_chunk',
            interviewId: interviewId,
            chunkIndex: index,
          },
        });
      });

      // JD chunks
      jdChunks.forEach((chunk, index) => {
        documents.push({
          content: chunk,
          metadata: {
            type: 'jd_chunk',
            interviewId: interviewId,
            chunkIndex: index,
          },
        });
      });

      const response = await fetch(`${this.ragServiceURL}/ingest/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collection: `resume_jd_${interviewId}`,
          documents,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        log.error('storeResumeAndJD', '存储简历/JD失败', { errorText });
        return false;
      }

      log.debug('storeResumeAndJD', '简历/JD存储成功', {
        interviewId,
        resumeChunks: resumeChunks.length,
        jdChunks: jdChunks.length,
      });

      return true;
    } catch (error) {
      log.error('storeResumeAndJD', '存储简历/JD异常', undefined, error);
      return false;
    }
  }

  /**
   * 检索相关的简历/JD片段
   */
  async retrieveRelevantResumeJD(params: {
    interviewId: string;
    currentQuestion: string;
    topK?: number;
  }): Promise<string[]> {
    try {
      const { interviewId, currentQuestion, topK = 2 } = params;

      const response = await fetch(`${this.ragServiceURL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collection: `resume_jd_${interviewId}`,
          query: currentQuestion,
          n_results: topK,
        }),
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const results = data.results || [];

      const chunks = results.map((result: any) => result.content || '');

      log.debug('retrieveRelevantResumeJD', '检索简历/JD片段成功', {
        interviewId,
        foundCount: chunks.length,
      });

      return chunks;
    } catch (error) {
      log.error('retrieveRelevantResumeJD', '检索简历/JD片段异常', undefined, error);
      return [];
    }
  }

  /**
   * 简单的文本分块函数
   */
  private chunkText(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/[。！？\n]+/);

    let currentChunk = '';

    for (const sentence of sentences) {
      if (!sentence.trim()) continue;

      if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence + '。';
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * 删除面试相关的所有向量数据
   */
  async deleteInterviewData(interviewId: string): Promise<boolean> {
    try {
      // 删除对话集合
      await fetch(`${this.ragServiceURL}/collection/conversation_${interviewId}`, {
        method: 'DELETE',
      });

      // 删除简历/JD集合
      await fetch(`${this.ragServiceURL}/collection/resume_jd_${interviewId}`, {
        method: 'DELETE',
      });

      log.debug('deleteInterviewData', '删除面试数据成功', { interviewId });
      return true;
    } catch (error) {
      log.error('deleteInterviewData', '删除面试数据异常', undefined, error);
      return false;
    }
  }
}

// 导出单例
export const conversationVectorService = new ConversationVectorService();
