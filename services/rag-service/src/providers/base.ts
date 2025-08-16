export interface EmbeddingRequest {
  texts: string[];
  model?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  provider: string;
}

export abstract class BaseEmbeddingProvider {
  protected config: Record<string, any>;
  protected name: string;

  constructor(name: string, config: Record<string, any>) {
    this.name = name;
    this.config = config;
  }

  abstract embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
  abstract isAvailable(): boolean;
}
