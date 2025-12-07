export interface CompletionRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  responseFormat?: 'concise' | 'points' | 'detailed';
  metadata?: {
    userId?: string;
    sessionId?: string;
    context?: string;
  };
}

export interface RuntimeConfig {
  provider: string;
  model: string;
  credentials: Record<string, any>; // JSON 格式的凭证，每个 provider 自己解析
  model_params: Array<{           // 模型参数数组，每个 provider 自己解析需要的
    param_key: string;
    value: any;
  }>;
}

export interface CompletionResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  provider?: string;
  cached?: boolean;
  latency?: number;
}

export abstract class BaseLLMProvider {
  protected name: string;

  constructor(name: string) {
    this.name = name;
  }

  // 启动时不需要检查可用性，因为没有具体配置
  isAvailable(): boolean {
    return true;
  }

  // 运行时传入配置
  abstract complete(request: CompletionRequest, config: RuntimeConfig): Promise<CompletionResponse>;
  abstract stream(request: CompletionRequest, config: RuntimeConfig): AsyncGenerator<string> | Promise<AsyncGenerator<string>>;
  abstract healthCheck(config: RuntimeConfig): Promise<boolean>;

  getName(): string {
    return this.name;
  }
}
