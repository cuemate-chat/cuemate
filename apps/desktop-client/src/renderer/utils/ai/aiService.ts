/**
 * AI 服务调用工具
 * 基于 web 版本的 LLM Router 调用逻辑适配到 desktop
 */

import { createLogger } from '../../../utils/rendererLogger.js';

const log = createLogger('AIService');

export interface ModelConfig {
  provider: string;
  model_name: string;
  credentials: string; // JSON 字符串
}

export interface ModelParam {
  param_key: string;
  value: string | number;
}

export interface UserData {
  model: ModelConfig;
  model_params: ModelParam[];
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamResponse {
  content: string;
  finished: boolean;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIServiceConfig {
  llmRouterUrl?: string;
}

class AIService {
  private config: AIServiceConfig = {
    llmRouterUrl: 'http://localhost:3002',
  };

  /**
   * 设置配置
   */
  setConfig(config: Partial<AIServiceConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取用户数据
   * 从 electron 存储中获取用户的大模型配置信息
   */
  async getUserData(): Promise<UserData | null> {
    try {
      // 通过 electron API 获取用户数据
      if ((window as any).electronAPI && (window as any).electronAPI.getUserData) {
        const result = await (window as any).electronAPI.getUserData();
        return result.success ? result.userData : null;
      }

      return null;
    } catch (error) {
      await log.error('getUserData', '获取用户数据失败', {}, error);
      return null;
    }
  }

  /**
   * 一次性调用 AI (非流式)
   */
  async callAI(messages: ChatMessage[]): Promise<string> {
    const userData = await this.getUserData();
    if (!userData?.model) {
      throw new Error('请先在设置中配置大模型');
    }

    const { model, model_params } = userData;

    // 构建 credentials
    const finalCredentials = model.credentials ? JSON.parse(model.credentials) : {};

    // 处理 model_params
    const finalModelParams =
      model_params?.map((param) => ({
        param_key: param.param_key,
        value: !isNaN(Number(param.value)) ? Number(param.value) : param.value,
      })) || [];

    const url = `${this.config.llmRouterUrl}/completion`;
    const requestBody = {
      provider: model.provider,
      model: model.model_name,
      credentials: finalCredentials,
      model_params: finalModelParams,
      messages: messages,
    };

    await log.http.request('callAI', url, 'POST', requestBody);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      await log.http.error('callAI', url, new Error(`HTTP ${response.status}`), requestBody, errorText);
      throw new Error(`AI 调用失败: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    await log.http.response('callAI', url, response.status, result);
    return result.content || '抱歉，AI 没有返回内容';
  }

  /**
   * 调用 AI 并返回 JSON 对象
   * 保证返回的一定是有效的 JSON,如果解析失败会返回空对象并打印错误日志,不会中断流程
   */
  async callAIForJson(messages: ChatMessage[]): Promise<any> {
    const content = await this.callAI(messages);

    // 尝试直接解析
    try {
      return JSON.parse(content);
    } catch (e) {
      // 尝试从响应中提取 JSON 部分(去除 markdown 代码块标记等)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e2) {
          // 提取的内容也不是有效 JSON
        }
      }

      // 无法解析,打印错误日志但返回空对象,不中断流程
      await log.error('callAIForJson', 'AI返回的不是有效的JSON格式', { llmResponse: content });
      return {};
    }
  }

  /**
   * 流式调用 AI
   * 实现类似 ChatGPT 的实时输出效果
   */
  async callAIStream(
    messages: ChatMessage[],
    onChunk: (chunk: StreamResponse) => void,
  ): Promise<void> {
    const userData = await this.getUserData();
    if (!userData?.model) {
      throw new Error('请先在设置中配置大模型');
    }

    const { model, model_params } = userData;
    const finalCredentials = model.credentials ? JSON.parse(model.credentials) : {};
    const finalModelParams =
      model_params?.map((param) => ({
        param_key: param.param_key,
        value: !isNaN(Number(param.value)) ? Number(param.value) : param.value,
      })) || [];

    const url = `${this.config.llmRouterUrl}/completion/stream`;
    const requestBody = {
      provider: model.provider,
      model: model.model_name,
      credentials: finalCredentials,
      model_params: finalModelParams,
      messages: messages,
    };

    try {
      await log.http.request('callAIStream', url, 'POST', requestBody);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        await log.http.error('callAIStream', url, new Error(`HTTP ${response.status}`), requestBody, errorText);
        onChunk({
          content: '',
          finished: true,
          error: `AI 调用失败: ${response.status} - ${errorText}`,
        });
        return;
      }

      // 检查是否支持流式响应
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/event-stream') && !contentType.includes('application/json')) {
        // 回退到普通调用
        const result = await response.json();
        const content = result.content || '抱歉，AI 没有返回内容';
        const usage = result.usage;

        // 模拟流式输出效果
        await this.simulateStreamOutput(content, onChunk, usage);
        return;
      }

      if (contentType.includes('text/event-stream')) {
        // 处理 SSE 流
        await this.handleSSEStream(response, onChunk);
      } else {
        // 普通 JSON 响应，模拟流式输出
        const result = await response.json();
        const content = result.content || '抱歉，AI 没有返回内容';
        const usage = result.usage;

        await this.simulateStreamOutput(content, onChunk, usage);
      }
    } catch (error) {
      await log.http.error('callAIStream', url, error, requestBody);
      onChunk({
        content: '',
        finished: true,
        error: `网络错误: ${(error as Error).message}`,
      });
    }
  }

  /**
   * 使用自定义模型调用 AI 流式接口（用于面试场景）
   * @param messages 消息列表
   * @param customModel 自定义模型配置
   * @param customModelParams 自定义模型参数
   * @param onChunk 流式响应回调
   */
  async callAIStreamWithCustomModel(
    messages: ChatMessage[],
    customModel: ModelConfig,
    customModelParams: ModelParam[],
    onChunk: (chunk: StreamResponse) => void,
  ): Promise<void> {
    const finalCredentials = customModel.credentials ? JSON.parse(customModel.credentials) : {};
    const finalModelParams =
      customModelParams?.map((param) => ({
        param_key: param.param_key,
        value: !isNaN(Number(param.value)) ? Number(param.value) : param.value,
      })) || [];

    const url = `${this.config.llmRouterUrl}/completion/stream`;
    const requestBody = {
      provider: customModel.provider,
      model: customModel.model_name,
      credentials: finalCredentials,
      model_params: finalModelParams,
      messages: messages,
    };

    try {
      await log.http.request('callAIStreamWithCustomModel', url, 'POST', requestBody);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        await log.http.error('callAIStreamWithCustomModel', url, new Error(`HTTP ${response.status}`), requestBody, errorText);
        onChunk({
          content: '',
          finished: true,
          error: `AI 调用失败: ${response.status} - ${errorText}`,
        });
        return;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/event-stream') && !contentType.includes('application/json')) {
        const result = await response.json();
        const content = result.content || '抱歉，AI 没有返回内容';
        const usage = result.usage;

        await this.simulateStreamOutput(content, onChunk, usage);
        return;
      }

      if (contentType.includes('text/event-stream')) {
        await this.handleSSEStream(response, onChunk);
      } else {
        const result = await response.json();
        const content = result.content || '抱歉，AI 没有返回内容';
        const usage = result.usage;

        await this.simulateStreamOutput(content, onChunk, usage);
      }
    } catch (error) {
      await log.http.error('callAIStreamWithCustomModel', url, error, requestBody);
      onChunk({
        content: '',
        finished: true,
        error: `网络错误: ${(error as Error).message}`,
      });
    }
  }

  /**
   * 处理 Server-Sent Events 流
   */
  private async handleSSEStream(
    response: Response,
    onChunk: (chunk: StreamResponse) => void,
  ): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法获取响应流');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          onChunk({ content: '', finished: true });
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onChunk({ content: '', finished: true });
              return;
            }

            try {
              const parsed = JSON.parse(data);

              // 检测是否是包含 usage 信息的 chunk
              if (parsed.usage) {
                onChunk({ content: '', finished: true, usage: parsed.usage });
                return;
              }

              const content = parsed.choices?.[0]?.delta?.content || parsed.content || '';

              // LLM Router 可能把 usage JSON 包装在 content 里
              if (content && content.startsWith('{') && content.includes('usage')) {
                try {
                  const usageData = JSON.parse(content);
                  if (usageData.usage) {
                    onChunk({ content: '', finished: true, usage: usageData.usage });
                    return;
                  }
                } catch {
                  // 不是 JSON，当普通内容处理
                }
              }

              if (content) {
                onChunk({ content, finished: false });
              }
            } catch (e) {
              log.warn('callAIStreamWithCustomModel', '解析 SSE 数据失败', { data });
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 模拟流式输出效果
   * 将完整的响应内容分块逐步输出，营造实时输出的视觉效果
   */
  private async simulateStreamOutput(
    content: string,
    onChunk: (chunk: StreamResponse) => void,
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number },
  ): Promise<void> {
    const words = content.split('');
    let currentContent = '';

    for (let i = 0; i < words.length; i++) {
      currentContent += words[i];

      onChunk({
        content: words[i],
        finished: false,
      });

      // 动态延迟：标点符号后停顿久一点，营造思考效果
      let delay = 30; // 基础延迟 30ms
      if (['。', '！', '？', '.', '!', '?'].includes(words[i])) {
        delay = 200; // 句子结束停顿 200ms
      } else if (['，', '、', ',', ';', ':'].includes(words[i])) {
        delay = 100; // 逗号等停顿 100ms
      } else if (words[i] === '\n') {
        delay = 150; // 换行停顿 150ms
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // 输出完成，附带 usage 信息
    onChunk({ content: '', finished: true, usage });
  }
}

// 导出单例
export const aiService = new AIService();
