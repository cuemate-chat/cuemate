import { EventEmitter } from 'events';
import WebSocket from 'ws';
import type { Config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export interface TranscriptResult {
  text: string;
  isFinal: boolean;
  confidence?: number;
  timestamp: number;
  duration?: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

export class DeepgramProvider extends EventEmitter {
  private config: Config['deepgram'];
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnected = false;

  constructor(config: Config['deepgram']) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('Deepgram API key not configured');
    }

    const params = new URLSearchParams({
      language: this.config.language,
      model: this.config.model,
      punctuate: String(this.config.punctuate),
      profanity_filter: String(this.config.profanityFilter),
      redact: String(this.config.redact),
      diarize: String(this.config.diarize),
      numerals: String(this.config.numerals),
      endpointing: String(this.config.endpointing),
      interim_results: String(this.config.interimResults),
      utterance_end_ms: String(this.config.utteranceEndMs),
      encoding: 'linear16',
      sample_rate: '48000',
      channels: '1',
    });

    const url = `wss://api.deepgram.com/v1/listen?${params}`;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url, {
        headers: {
          Authorization: `Token ${this.config.apiKey}`,
        },
      });

      this.ws.on('open', () => {
        logger.info('Deepgram connection established');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const response = JSON.parse((data as any).toString());

          if ((response as any).type === 'Results') {
            const result = (response as any).channel?.alternatives?.[0];
            if (result) {
              const transcript: TranscriptResult = {
                text: result.transcript,
                isFinal: (response as any).is_final || false,
                confidence: result.confidence,
                timestamp: Date.now(),
                duration: (response as any).duration,
                words: result.words,
              };

              this.emit('transcript', transcript as any);
            }
          } else if ((response as any).type === 'Metadata') {
            logger.debug('Deepgram metadata:', response as any);
          } else if ((response as any).type === 'Error') {
            logger.error('Deepgram error:', response as any);
            this.emit('error', new Error((response as any).message));
          }
        } catch (error) {
          logger.error('Failed to parse Deepgram message:', error as any);
        }
      });

      this.ws.on('error', (error) => {
        logger.error('Deepgram WebSocket error:', error as any);
        this.emit('error', error as any);
        reject(error as any);
      });

      this.ws.on('close', (code, reason) => {
        logger.info(`Deepgram connection closed: ${code} - ${reason}`);
        this.isConnected = false;
        this.emit('disconnected');

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
    this.isConnected = false;
  }

  isAvailable(): boolean {
    return !!this.config.apiKey;
  }

  private async reconnect(): Promise<void> {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    logger.info(`Reconnecting to Deepgram in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        logger.error('Reconnection failed:', error as any);
      }
    }, delay);
  }
}
