import { Config } from '../config/index.js';

export class DocumentProcessor {
  // 仍保留类型签名以便未来扩展，但当前未使用
  constructor(_config: Config['processing']) {}

  async splitText(content: string): Promise<string[]> {
    return [content];
  }
}
