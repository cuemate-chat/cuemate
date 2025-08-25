declare module 'vosk' {
  export function setLogLevel(level: number): void;
  export class Model {
    constructor(modelPath: string);
  }
  export class KaldiRecognizer {
    constructor(model: Model, sampleRate: number);
    acceptWaveform(data: Buffer): boolean;
    result(): string;
    finalResult(): string;
  }
}