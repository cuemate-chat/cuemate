import multipart from '@fastify/multipart';
import type { FastifyInstance } from 'fastify';
import { promises as fs } from 'fs';
import mammoth from 'mammoth';
import { randomUUID } from 'crypto';
import { join } from 'path';

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
          // 检查Buffer是否有效
          if (!buf || buf.length === 0) {
            throw new Error('PDF文件为空或无效');
          }

          // 检查PDF文件头，确保是有效的PDF文件
          const pdfHeader = buf.subarray(0, 4).toString();
          if (pdfHeader !== '%PDF') {
            throw new Error('文件不是有效的PDF格式');
          }

          // 使用临时文件解析PDF，避免pdf-parse库的内部路径问题
          const tempDir = '/opt/cuemate/pdf';
          const tempFileName = `${Date.now()}-${randomUUID()}.pdf`;
          const tempFilePath = join(tempDir, tempFileName);
          
          app.log.info({ filename, bufferSize: buf.length, pdfHeader, tempFilePath }, '开始解析PDF文件');
          
          let res: any = null;
          try {
            // 将Buffer写入临时文件
            await fs.writeFile(tempFilePath, buf);
            
            // 使用文件路径而不是Buffer来解析PDF
            const { default: pdfParse } = await import('pdf-parse');
            res = await pdfParse(await fs.readFile(tempFilePath));
            text = (res.text || '').trim();
            
            app.log.info({ filename, textLength: text.length, pages: res.numpages }, 'PDF解析完成');
            
          } finally {
            // 清理临时文件
            try {
              await fs.unlink(tempFilePath);
            } catch (cleanupError) {
              app.log.warn({ tempFilePath, err: cleanupError }, '清理临时PDF文件失败');
            }
          }

          // 检查解析结果
          if (!text && res && res.numpages && res.numpages > 0) {
            throw new Error('PDF解析成功但未提取到文本内容，可能是扫描版PDF或图片PDF');
          }
        } catch (pdfError: any) {
          app.log.error({ err: pdfError, filename, errorMessage: pdfError.message }, 'PDF解析失败');

          // 特殊处理 pdf-parse 库的内部路径错误
          if (pdfError.message?.includes('ENOENT') && pdfError.message?.includes('test/data')) {
            app.log.error({ filename }, 'PDF解析库内部路径错误，这是pdf-parse库的已知问题');
            return reply.code(422).send({
              error: `PDF文件解析失败，检测到pdf-parse库内部错误。`,
            });
          }

          // 处理其他PDF错误
          let errorMessage = 'PDF文件解析失败';
          if (pdfError.message?.includes('Invalid PDF')) {
            errorMessage = 'PDF文件格式无效';
          } else if (pdfError.message?.includes('加密') || pdfError.message?.includes('password')) {
            errorMessage = 'PDF文件已加密';
          } else if (pdfError.message?.includes('损坏')) {
            errorMessage = 'PDF文件损坏';
          }

          return reply.code(422).send({
            error: `${errorMessage}：${pdfError.message}`,
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
            error: `DOCX文件解析失败：${docxError.message || '文件可能已损坏'}。请检查文件完整性或直接复制粘贴文本内容。`,
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
            error: `DOC文件解析失败：${docError.message || '文件可能已损坏或格式过旧'}。建议转换为DOCX格式或直接复制粘贴文本内容。`,
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
            error: `文本文件解析失败：${txtError.message || '文件编码可能不兼容'}。请检查文件编码或直接复制粘贴文本内容。`,
          });
        }
      } else {
        return reply.code(415).send({
          error: `不支持的文件类型：${mimetype || '未知格式'} (${filename})。仅支持PDF、DOC、DOCX和TXT格式的简历文件。`,
        });
      }

      if (!text || text.length < 5) {
        return reply.code(422).send({
          error: `文件解析成功但未提取到有效文本内容（长度: ${text.length}字符）。请检查文件是否包含可读文本内容，或直接复制粘贴文本内容。`,
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
        error: `文件解析服务异常：${err?.message || '未知错误'}。请稍后重试或直接复制粘贴文本内容。`,
      });
    }
  });
}
