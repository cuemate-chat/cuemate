import { Config } from '../config/index.js';

export class DocumentProcessor {
  constructor(private readonly config: Config['processing']) {}

  async splitText(content: string): Promise<string[]> {
    const { chunkSize, chunkOverlap } = this.config;
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += chunkSize - chunkOverlap) {
      chunks.push(content.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
