import WebSocket from 'ws';
import { logger } from '../utils/logger.js';
import { BaseAsrProvider, type AsrProviderConfig, type AsrProviderInfo } from './base.js';

export interface DeepgramConfig extends AsrProviderConfig {
  apiKey?: string;
  model: string;
  language: string;
  punctuate: boolean;
  profanityFilter: boolean;
  redact: boolean;
  diarize: boolean;
  numerals: boolean;
  endpointing: number;
  interimResults: boolean;
  utteranceEndMs: number;
}

export class DeepgramProvider extends BaseAsrProvider {
  private ws: WebSocket | null = null;

  constructor(config: DeepgramConfig) {
    super(config);
  }

  getName(): string {
    return 'deepgram';
  }

  getInfo(): AsrProviderInfo {
    return {
      name: 'deepgram',
      displayName: 'Deepgram',
      type: 'realtime',
      supportsStreamingInput: true,
      supportsLanguageDetection: true,
      supportedLanguages: ['zh', 'en', 'es', 'fr', 'de', 'ja', 'ko'],
      maxAudioDurationMs: 5 * 60 * 1000, // 5分钟
    };
  }

  async initialize(): Promise<void> {
    this.validateConfig(['apiKey']);
    this.isInitialized = true;
    logger.info('Deepgram provider 已初始化');
  }

  async connect(): Promise<void> {
    const config = this.config as DeepgramConfig;
    if (!config.apiKey) {
      throw new Error('Deepgram API key not configured');
    }

    const params = new URLSearchParams({
      language: config.language,
      model: config.model,
      punctuate: String(config.punctuate),
      profanity_filter: String(config.profanityFilter),
      redact: String(config.redact),
      diarize: String(config.diarize),
      numerals: String(config.numerals),
      endpointing: String(config.endpointing),
      interim_results: String(config.interimResults),
      utterance_end_ms: String(config.utteranceEndMs),
      encoding: 'linear16',
      sample_rate: '48000',
      channels: '1',
    });

    const url = `wss://api.deepgram.com/v1/listen?${params}`;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url, {
        headers: {
          Authorization: `Token ${config.apiKey}`,
        },
      });

      this.ws.on('open', () => {
        logger.info('Deepgram connection established');
        this.emitConnected();
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const response = JSON.parse((data as any).toString());

          if ((response as any).type === 'Results') {
            const result = (response as any).channel?.alternatives?.[0];
            if (result) {
              this.emitTranscript({
                text: result.transcript,
                isFinal: (response as any).is_final || false,
                confidence: result.confidence,
                timestamp: Date.now(),
                duration: (response as any).duration,
                words: result.words,
              });
            }
          } else if ((response as any).type === 'Metadata') {
            logger.debug('Deepgram metadata:', response as any);
          } else if ((response as any).type === 'Error') {
            logger.error('Deepgram error:', response as any);
            this.emitError(new Error((response as any).message));
          }
        } catch (error) {
          logger.error('Failed to parse Deepgram message:', error as any);
        }
      });

      this.ws.on('error', (error) => {
        logger.error('Deepgram WebSocket error:', error as any);
        this.emitError(error as any);
        reject(error as any);
      });

      this.ws.on('close', (code, reason) => {
        logger.info(`Deepgram connection closed: ${code} - ${reason}`);
        this.emitDisconnected();

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnect();
        }
      });
    });
  }

  async sendAudio(audioBuffer: ArrayBuffer | Buffer): Promise<void> {
    if (!this.isConnected || !this.ws) {
      throw new Error('Deepgram not connected');
    }

    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(audioBuffer as any);
    }
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.emitDisconnected();
  }

  isAvailable(): boolean {
    const config = this.config as DeepgramConfig;
    return !!config.apiKey;
  }
}
