export interface CompletionRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  responseFormat?: 'concise' | 'points' | 'detailed';
  metadata?: {
    userId?: string;
    sessionId?: string;
    context?: string;
  };
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
  protected config: any;

  constructor(name: string, config: any) {
    this.name = name;
    this.config = config;
  }

  abstract isAvailable(): boolean;
  abstract complete(request: CompletionRequest): Promise<CompletionResponse>;
  abstract stream(request: CompletionRequest): AsyncGenerator<string> | Promise<AsyncGenerator<string>>;
  abstract healthCheck(): Promise<boolean>;

  getName(): string {
    return this.name;
  }
}
