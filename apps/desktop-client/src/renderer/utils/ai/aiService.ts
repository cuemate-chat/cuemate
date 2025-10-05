/**
 * AI 服务调用工具
 * 基于web版本的LLM Router调用逻辑适配到desktop
 */

export interface ModelConfig {
  provider: string;
  model_name: string;
  credentials: string; // JSON字符串
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
   * 从electron存储中获取用户的大模型配置信息
   */
  async getUserData(): Promise<UserData | null> {
    try {
      // 通过electron API获取用户数据
      if ((window as any).electronAPI && (window as any).electronAPI.getUserData) {
        const result = await (window as any).electronAPI.getUserData();
        return result.success ? result.userData : null;
      }

      return null;
    } catch (error) {
      console.error('获取用户数据失败:', error);
      return null;
    }
  }

  /**
   * 一次性调用AI (非流式)
   */
  async callAI(messages: ChatMessage[]): Promise<string> {
    const userData = await this.getUserData();
    if (!userData?.model) {
      throw new Error('请先在设置中配置大模型');
    }

    const { model, model_params } = userData;

    // 构建credentials
    const finalCredentials = model.credentials ? JSON.parse(model.credentials) : {};

    // 处理model_params
    const finalModelParams =
      model_params?.map((param) => ({
        param_key: param.param_key,
        value: !isNaN(Number(param.value)) ? Number(param.value) : param.value,
      })) || [];

    const response = await fetch(`${this.config.llmRouterUrl}/completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: model.provider,
        model: model.model_name,
        credentials: finalCredentials,
        model_params: finalModelParams,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI调用失败: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result.content || '抱歉，AI没有返回内容';
  }

  /**
   * 流式调用AI
   * 实现类似ChatGPT的实时输出效果
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

    try {
      const response = await fetch(`${this.config.llmRouterUrl}/completion/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: model.provider,
          model: model.model_name,
          credentials: finalCredentials,
          model_params: finalModelParams,
          messages: messages,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        onChunk({
          content: '',
          finished: true,
          error: `AI调用失败: ${response.status} - ${errorText}`,
        });
        return;
      }

      // 检查是否支持流式响应
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/event-stream') && !contentType.includes('application/json')) {
        // 回退到普通调用
        const result = await response.json();
        const content = result.content || '抱歉，AI没有返回内容';

        // 模拟流式输出效果
        await this.simulateStreamOutput(content, onChunk);
        return;
      }

      if (contentType.includes('text/event-stream')) {
        // 处理SSE流
        await this.handleSSEStream(response, onChunk);
      } else {
        // 普通JSON响应，模拟流式输出
        const result = await response.json();
        const content = result.content || '抱歉，AI没有返回内容';
        await this.simulateStreamOutput(content, onChunk);
      }
    } catch (error) {
      onChunk({
        content: '',
        finished: true,
        error: `网络错误: ${(error as Error).message}`,
      });
    }
  }

  /**
   * 使用自定义模型调用AI流式接口（用于面试场景）
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

    try {
      const response = await fetch(`${this.config.llmRouterUrl}/completion/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: customModel.provider,
          model: customModel.model_name,
          credentials: finalCredentials,
          model_params: finalModelParams,
          messages: messages,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        onChunk({
          content: '',
          finished: true,
          error: `AI调用失败: ${response.status} - ${errorText}`,
        });
        return;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/event-stream') && !contentType.includes('application/json')) {
        const result = await response.json();
        const content = result.content || '抱歉，AI没有返回内容';
        await this.simulateStreamOutput(content, onChunk);
        return;
      }

      if (contentType.includes('text/event-stream')) {
        await this.handleSSEStream(response, onChunk);
      } else {
        const result = await response.json();
        const content = result.content || '抱歉，AI没有返回内容';
        await this.simulateStreamOutput(content, onChunk);
      }
    } catch (error) {
      onChunk({
        content: '',
        finished: true,
        error: `网络错误: ${(error as Error).message}`,
      });
    }
  }

  /**
   * 处理Server-Sent Events流
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
              const content = parsed.choices?.[0]?.delta?.content || parsed.content || '';
              if (content) {
                onChunk({ content, finished: false });
              }
            } catch (e) {
              console.warn('解析SSE数据失败:', data);
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
      let delay = 30; // 基础延迟30ms
      if (['。', '！', '？', '.', '!', '?'].includes(words[i])) {
        delay = 200; // 句子结束停顿200ms
      } else if (['，', '、', ',', ';', ':'].includes(words[i])) {
        delay = 100; // 逗号等停顿100ms
      } else if (words[i] === '\n') {
        delay = 150; // 换行停顿150ms
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // 输出完成
    onChunk({ content: '', finished: true });
  }
}

// 导出单例
export const aiService = new AIService();
