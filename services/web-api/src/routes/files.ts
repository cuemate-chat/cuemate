import multipart from '@fastify/multipart';
import type { FastifyInstance } from 'fastify';
import mammoth from 'mammoth';

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    if (Buffer.isBuffer(chunk)) {
      chunks.push(chunk);
    } else {
      chunks.push(Buffer.from(chunk));
    }
  }
  return Buffer.concat(chunks);
}

export function registerFileRoutes(app: FastifyInstance) {
  app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  app.post('/files/extract-text', async (req: any, reply) => {
    try {
      await req.jwtVerify();
      const file = await req.file();
      if (!file) return reply.code(400).send({ error: '缺少文件' });

      const mimetype: string = file.mimetype || '';
      const filename: string = file.filename || '';
      const lower = filename.toLowerCase();

      app.log.info({ filename, mimetype, size: file.file.bytesRead }, '开始解析文件');

      const buf = await streamToBuffer(file.file);
      app.log.info({ filename, bufferSize: buf.length }, '文件已转换为Buffer');

      let text = '';

      // 只支持PDF和DOC文件
      if (mimetype === 'application/pdf' || lower.endsWith('.pdf')) {
        try {
          // 使用require而不是import避免包初始化问题
          const pdf = require('pdf-parse');
          const res = await pdf(buf);
          text = (res.text || '').trim();
        } catch (pdfError: any) {
          app.log.error({ err: pdfError, filename }, 'PDF解析失败');
          return reply.code(422).send({ error: 'PDF文件解析失败，请检查文件是否损坏' });
        }
      } else if (
        mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        lower.endsWith('.docx')
      ) {
        try {
          const res = await mammoth.extractRawText({ buffer: buf });
          text = (res.value || '').trim();
        } catch (docxError: any) {
          app.log.error({ err: docxError, filename }, 'DOCX解析失败');
          return reply.code(422).send({ error: 'DOCX文件解析失败，请检查文件是否损坏' });
        }
      } else if (mimetype === 'application/msword' || lower.endsWith('.doc')) {
        try {
          // .doc文件使用mammoth解析（注意：对老版本DOC文件支持有限）
          const res = await mammoth.extractRawText({ buffer: buf });
          text = (res.value || '').trim();

          // 如果解析结果为空或很短，可能是老版本DOC文件
          if (!text || text.length < 10) {
            app.log.warn(
              { filename, textLength: text.length },
              'DOC文件解析结果较短，可能是格式兼容性问题',
            );
            return reply.code(422).send({
              error:
                '此DOC文件可能是较老的格式，建议将文件另存为DOCX格式后重新上传，或直接复制粘贴文本内容',
            });
          }
        } catch (docError: any) {
          app.log.error({ err: docError, filename }, 'DOC解析失败');
          // 检查是否是格式兼容性问题
          if (docError.message && docError.message.includes('zip')) {
            return reply.code(422).send({
              error:
                '此DOC文件格式较老，无法自动解析。请将文件另存为DOCX格式后重新上传，或直接复制粘贴文本内容',
            });
          }
          return reply.code(422).send({ error: 'DOC文件解析失败，请检查文件是否损坏' });
        }
      } else {
        return reply.code(415).send({
          error: `不支持的文件类型：${mimetype || filename}。仅支持PDF、DOC和DOCX格式的简历文件。`,
        });
      }

      if (!text) {
        return reply.code(422).send({ error: '文件解析成功但未提取到文本内容，请检查文件内容' });
      }

      return { text };
    } catch (err: any) {
      app.log.error({ err }, 'extract-text failed');
      return reply.code(500).send({ error: '文件解析失败：' + (err?.message || '未知错误') });
    }
  });
}
