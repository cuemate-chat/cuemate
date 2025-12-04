import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import { createModuleLogger } from '../utils/logger.js';
import { BaseLLMProvider, CompletionRequest, CompletionResponse, RuntimeConfig } from './base.js';

const log = createModuleLogger('GeminiProvider');

export class GeminiProvider extends BaseLLMProvider {
  constructor() {
    super('gemini');
  }

  async complete(request: CompletionRequest, config: RuntimeConfig): Promise<CompletionResponse> {
    const apiKey = config.credentials.api_key;

    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    const temperature = config.modelParams.find(p => p.paramKey === 'temperature')?.value || 0.7;
    const maxTokens = config.modelParams.find(p => p.paramKey === 'max_tokens')?.value || 8192;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: config.model,
      generationConfig: {
        temperature: request.temperature ?? temperature,
        maxOutputTokens: request.maxTokens ?? maxTokens,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });

    const startTime = Date.now();

    try {
      // 转换 messages 格式为 Gemini 的 contents 格式
      const contents = request.messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      // system 消息作为第一条 user 消息
      const systemMessages = request.messages.filter(m => m.role === 'system');
      if (systemMessages.length > 0) {
        const systemPrompt = systemMessages.map(m => m.content).join('\n');
        contents.unshift({
          role: 'user',
          parts: [{ text: systemPrompt }],
        });
      }

      const result = await model.generateContent({ contents });
      const response = result.response;
      const latency = Date.now() - startTime;

      return {
        content: response.text(),
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata?.totalTokenCount || 0,
        },
        model: config.model,
        provider: 'gemini',
        latency,
      };
    } catch (error) {
      log.error('complete', 'Gemini completion failed', {}, error);
      throw error;
    }
  }

  async *stream(request: CompletionRequest, config: RuntimeConfig): AsyncGenerator<string> {
    const apiKey = config.credentials.api_key;

    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    const temperature = config.modelParams.find(p => p.paramKey === 'temperature')?.value || 0.7;
    const maxTokens = config.modelParams.find(p => p.paramKey === 'max_tokens')?.value || 8192;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: config.model,
      generationConfig: {
        temperature: request.temperature ?? temperature,
        maxOutputTokens: request.maxTokens ?? maxTokens,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });

    try {
      const contents = request.messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      const systemMessages = request.messages.filter(m => m.role === 'system');
      if (systemMessages.length > 0) {
        const systemPrompt = systemMessages.map(m => m.content).join('\n');
        contents.unshift({
          role: 'user',
          parts: [{ text: systemPrompt }],
        });
      }

      const result = await model.generateContentStream({ contents });

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }

      // 获取完整响应以提取 usage
      const response = await result.response;
      if (response.usageMetadata) {
        yield JSON.stringify({
          usage: {
            promptTokens: response.usageMetadata.promptTokenCount || 0,
            completionTokens: response.usageMetadata.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata.totalTokenCount || 0,
          },
        });
      }
    } catch (error) {
      log.error('stream', 'Gemini stream failed', {}, error);
      throw error;
    }
  }

  async healthCheck(config: RuntimeConfig): Promise<boolean> {
    const apiKey = config.credentials.api_key;

    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: config.model });

    try {
      await model.generateContent('ping');
      return true;
    } catch (error) {
      log.error('healthCheck', 'Gemini healthCheck failed', {}, error);
      throw error;
    }
  }
}
