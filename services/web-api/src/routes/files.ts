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
      // JWT认证检查
      try {
        await req.jwtVerify();
      } catch (jwtError: any) {
        app.log.warn({ err: jwtError }, 'JWT认证失败');
        return reply.code(401).send({ error: '请先登录后再使用文件解析功能' });
      }

      const file = await req.file();
      if (!file) return reply.code(400).send({ error: '缺少文件，请选择要上传的简历文件' });

      const mimetype: string = file.mimetype || '';
      const filename: string = file.filename || '';
      const lower = filename.toLowerCase();

      app.log.info({ filename, mimetype, size: file.file.bytesRead }, '开始解析文件');

      const buf = await streamToBuffer(file.file);
      app.log.info({ filename, bufferSize: buf.length }, '文件已转换为Buffer');

      let text = '';

      // 支持PDF、DOC、DOCX和纯文本文件
      if (mimetype === 'application/pdf' || lower.endsWith('.pdf')) {
        try {
          // 使用require而不是import避免包初始化问题
          const pdf = require('pdf-parse');
          app.log.info({ filename, bufferSize: buf.length }, '开始解析PDF文件');
          const res = await pdf(buf);
          text = (res.text || '').trim();
          app.log.info({ filename, textLength: text.length }, 'PDF解析完成');
        } catch (pdfError: any) {
          app.log.error({ err: pdfError, filename }, 'PDF解析失败');
          return reply.code(422).send({ 
            error: `PDF文件解析失败：${pdfError.message || '文件可能已损坏或为扫描版PDF'}。建议转换为可编辑的PDF或直接复制粘贴文本内容。` 
          });
        }
      } else if (
        mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        lower.endsWith('.docx')
      ) {
        try {
          app.log.info({ filename, bufferSize: buf.length }, '开始解析DOCX文件');
          const res = await mammoth.extractRawText({ buffer: buf });
          text = (res.value || '').trim();
          app.log.info({ filename, textLength: text.length }, 'DOCX解析完成');
        } catch (docxError: any) {
          app.log.error({ err: docxError, filename }, 'DOCX解析失败');
          return reply.code(422).send({ 
            error: `DOCX文件解析失败：${docxError.message || '文件可能已损坏'}。请检查文件完整性或直接复制粘贴文本内容。` 
          });
        }
      } else if (mimetype === 'application/msword' || lower.endsWith('.doc')) {
        try {
          app.log.info({ filename, bufferSize: buf.length }, '开始解析DOC文件');
          // .doc文件使用mammoth解析（注意：对老版本DOC文件支持有限）
          const res = await mammoth.extractRawText({ buffer: buf });
          text = (res.value || '').trim();
          app.log.info({ filename, textLength: text.length }, 'DOC解析完成');

          // 如果解析结果为空或很短，可能是老版本DOC文件
          if (!text || text.length < 10) {
            app.log.warn(
              { filename, textLength: text.length },
              'DOC文件解析结果较短，可能是格式兼容性问题',
            );
            return reply.code(422).send({
              error:
                '此DOC文件可能是较老的格式（如DOC 97-2003），建议将文件另存为DOCX格式后重新上传，或直接复制粘贴文本内容',
            });
          }
        } catch (docError: any) {
          app.log.error({ err: docError, filename }, 'DOC解析失败');
          // 检查是否是格式兼容性问题
          if (docError.message && docError.message.includes('zip')) {
            return reply.code(422).send({
              error:
                '此DOC文件格式较老（如DOC 97-2003），无法自动解析。请将文件另存为DOCX格式后重新上传，或直接复制粘贴文本内容',
            });
          }
          return reply.code(422).send({ 
            error: `DOC文件解析失败：${docError.message || '文件可能已损坏或格式过旧'}。建议转换为DOCX格式或直接复制粘贴文本内容。` 
          });
        }
      } else if (mimetype === 'text/plain' || lower.endsWith('.txt')) {
        try {
          app.log.info({ filename, bufferSize: buf.length }, '开始解析TXT文件');
          text = buf.toString('utf-8').trim();
          app.log.info({ filename, textLength: text.length }, 'TXT解析完成');
        } catch (txtError: any) {
          app.log.error({ err: txtError, filename }, 'TXT解析失败');
          return reply.code(422).send({ 
            error: `文本文件解析失败：${txtError.message || '文件编码可能不兼容'}。请检查文件编码或直接复制粘贴文本内容。` 
          });
        }
      } else {
        return reply.code(415).send({
          error: `不支持的文件类型：${mimetype || '未知格式'} (${filename})。仅支持PDF、DOC、DOCX和TXT格式的简历文件。`,
        });
      }

      if (!text || text.length < 5) {
        return reply.code(422).send({ 
          error: `文件解析成功但未提取到有效文本内容（长度: ${text.length}字符）。请检查文件是否包含可读文本内容，或直接复制粘贴文本内容。` 
        });
      }

      app.log.info({ filename, finalTextLength: text.length }, '文件解析成功');
      return { text };
    } catch (err: any) {
      app.log.error({ err }, 'extract-text处理失败');
      
      // 根据错误类型返回更友好的错误信息
      if (err?.code === 'ENOENT') {
        return reply.code(400).send({ error: '文件不存在或无法读取，请重新选择文件' });
      } else if (err?.message?.includes('size')) {
        return reply.code(413).send({ error: '文件过大，请选择小于10MB的文件' });
      } else if (err?.message?.includes('multipart')) {
        return reply.code(400).send({ error: '文件上传格式错误，请重新选择文件' });
      }
      
      return reply.code(500).send({ 
        error: `文件解析服务异常：${err?.message || '未知错误'}。请稍后重试或直接复制粘贴文本内容。` 
      });
    }
  });
}
