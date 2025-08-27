import multipart from '@fastify/multipart';
import type { FastifyInstance } from 'fastify';
import { promises as fs } from 'fs';
import mammoth from 'mammoth';
import path from 'path';
import { buildPrefixedError } from '../utils/error-response.js';

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
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  });

  // 图片上传路由
  app.post('/files/upload-image', async (req: any, reply) => {
    try {
      // JWT认证检查
      try {
        await req.jwtVerify();
      } catch (jwtError: any) {
        app.log.warn({ err: jwtError }, 'JWT认证失败');
        return reply.code(401).send(buildPrefixedError('图片上传失败', jwtError, 401));
      }

      const file = await req.file();
      if (!file)
        return reply
          .code(400)
          .send(
            buildPrefixedError('图片上传失败', new Error('缺少文件，请选择要上传的图片文件'), 400),
          );

      const mimetype: string = file.mimetype || '';
      const filename: string = file.filename || '';
      const lower = filename.toLowerCase();

      // 检查文件类型
      if (
        !mimetype.startsWith('image/') &&
        !['.jpg', '.jpeg', '.png', '.gif', '.webp'].some((ext) => lower.endsWith(ext))
      ) {
        return reply
          .code(400)
          .send(
            buildPrefixedError(
              '图片上传失败',
              new Error('只支持图片文件格式：JPG、PNG、GIF、WebP'),
              400,
            ),
          );
      }

      app.log.info({ filename, mimetype, size: file.file.bytesRead }, '开始上传图片');

      const buf = await streamToBuffer(file.file);

      // 生成带时间戳的文件名，避免重名
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '');
      const extension = path.extname(filename) || '.jpg';
      const nameWithoutExt = path.basename(filename, extension);
      const newFilename = `${nameWithoutExt}${timestamp}${extension}`;

      // 确保图片目录存在
      const imageDir = '/opt/cuemate/images';
      await fs.mkdir(imageDir, { recursive: true });

      // 保存图片文件
      const imagePath = path.join(imageDir, newFilename);
      await fs.writeFile(imagePath, buf);

      app.log.info({ filename, newFilename, imagePath, size: buf.length }, '图片上传成功');

      // 返回图片访问路径（前端通过这个路径访问图片）
      const imageUrl = `/images/${newFilename}`;

      return {
        success: true,
        message: '图片上传成功',
        imagePath: imageUrl,
        filename: newFilename,
        size: buf.length,
      };
    } catch (error: any) {
      app.log.error({ err: error, filename: req.file?.filename }, '图片上传失败');
      return reply.code(500).send(buildPrefixedError('图片上传失败', error, 500));
    }
  });

  app.post('/files/extract-text', async (req: any, reply) => {
    let text = ''; // 在函数开始就声明text变量

    try {
      // JWT认证检查
      try {
        await req.jwtVerify();
      } catch (jwtError: any) {
        app.log.warn({ err: jwtError }, 'JWT认证失败');
        return reply.code(401).send(buildPrefixedError('文件解析失败', jwtError, 401));
      }

      const file = await req.file();
      if (!file)
        return reply
          .code(400)
          .send(
            buildPrefixedError('文件解析失败', new Error('缺少文件，请选择要上传的简历文件'), 400),
          );

      const mimetype: string = file.mimetype || '';
      const filename: string = file.filename || '';
      const lower = filename.toLowerCase();

      app.log.info({ filename, mimetype, size: file.file.bytesRead }, '开始解析文件');

      const buf = await streamToBuffer(file.file);
      app.log.info({ filename, bufferSize: buf.length }, '文件已转换为Buffer');

      // 支持PDF、DOC、DOCX和纯文本文件
      if (mimetype === 'application/pdf' || lower.endsWith('.pdf')) {
        try {
          // 检查PDF文件头
          if (buf.length < 4 || buf.toString('ascii', 0, 4) !== '%PDF') {
            throw new Error('无效的PDF文件格式');
          }

          app.log.info({ filename, bufferSize: buf.length, pdfHeader: '%PDF' }, '开始解析PDF文件');

          // 使用pdf2json解析PDF
          const PDFParser = (await import('pdf2json')).default;

          return new Promise((resolve, reject) => {
            const pdfParser = new PDFParser();

            pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
              try {
                // 提取文本内容，保持原有的换行和格式
                const pages = pdfData.Pages || [];
                const textContent = pages
                  .map((page: any) => {
                    const texts = page.Texts || [];
                    return texts
                      .map((text: any) => {
                        const decodedText = decodeURIComponent(text.R[0].T);
                        return decodedText;
                      })
                      .join(' '); // 同一行内的文本用空格连接
                  })
                  .join('\n'); // 不同页面用换行符分隔

                const text = textContent.trim();

                if (text && text.length > 5) {
                  app.log.info(
                    { filename, textLength: text.length, pages: pages.length },
                    'PDF解析完成（使用pdf2json）',
                  );
                  resolve({ text });
                } else {
                  reject(new Error('pdf2json提取的文本内容过少'));
                }
              } catch (parseError: any) {
                reject(new Error(`pdf2json解析失败：${parseError.message}`));
              }
            });

            pdfParser.on('pdfParser_dataError', (err: any) => {
              reject(new Error(`pdf2json数据错误：${err.message}`));
            });

            // 解析PDF buffer
            pdfParser.parseBuffer(buf);
          });
        } catch (pdfError: any) {
          app.log.error({ err: pdfError, filename, errorMessage: pdfError.message }, 'PDF解析失败');

          let errorMessage = 'PDF文件解析失败';
          if (pdfError.message?.includes('无效的PDF文件格式')) {
            errorMessage += '：文件格式无效，请确保上传的是有效的PDF文件';
          } else if (pdfError.message?.includes('文本内容过少')) {
            errorMessage +=
              '：可能是图片PDF或扫描版PDF，建议转换为可编辑的PDF或直接复制粘贴文本内容';
          } else {
            errorMessage += `：${pdfError.message}`;
          }

          throw new Error(errorMessage);
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
          return reply
            .code(422)
            .send(
              buildPrefixedError(
                '文件解析失败',
                new Error(
                  `DOCX文件解析失败：${docxError.message || '文件可能已损坏'}。请检查文件完整性或直接复制粘贴文本内容。`,
                ),
                422,
              ),
            );
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
            return reply
              .code(422)
              .send(
                buildPrefixedError(
                  '文件解析失败',
                  new Error(
                    '此DOC文件可能是较老的格式（如DOC 97-2003），将文件另存为DOCX格式后重新上传，或直接复制粘贴文本内容',
                  ),
                  422,
                ),
              );
          }
        } catch (docError: any) {
          app.log.error({ err: docError, filename }, 'DOC解析失败');
          // 检查是否是格式兼容性问题
          if (docError.message && docError.message.includes('zip')) {
            return reply
              .code(422)
              .send(
                buildPrefixedError(
                  '文件解析失败',
                  new Error(
                    '此DOC文件格式较老（如DOC 97-2003），无法自动解析。请将文件另存为DOCX格式后重新上传，或直接复制粘贴文本内容',
                  ),
                  422,
                ),
              );
          }
          return reply
            .code(422)
            .send(
              buildPrefixedError(
                '文件解析失败',
                new Error(
                  `DOC文件解析失败：${docError.message || '文件可能已损坏或格式过旧'}。建议转换为DOCX格式或直接复制粘贴文本内容。`,
                ),
                422,
              ),
            );
        }
      } else {
        return reply
          .code(415)
          .send(
            buildPrefixedError(
              '文件解析失败',
              new Error(
                `不支持的文件类型：${mimetype || '未知格式'} (${filename})。仅支持PDF、DOC和DOCX格式的简历文件。`,
              ),
              415,
            ),
          );
      }

      if (!text || text.length < 5) {
        return reply
          .code(422)
          .send(
            buildPrefixedError(
              '文件解析失败',
              new Error(
                `文件解析成功但未提取到有效文本内容（长度: ${text.length}字符）。请检查文件是否包含可读文本内容，或直接复制粘贴文本内容。`,
              ),
              422,
            ),
          );
      }

      app.log.info({ filename, finalTextLength: text.length }, '文件解析成功');
      return { text };
    } catch (err: any) {
      app.log.error({ err }, 'extract-text处理失败');

      // 根据错误类型返回更友好的错误信息
      if (err?.code === 'ENOENT') {
        return reply
          .code(400)
          .send(
            buildPrefixedError(
              '文件解析失败',
              new Error('文件不存在或无法读取，请重新选择文件'),
              400,
            ),
          );
      } else if (err?.message?.includes('size')) {
        return reply
          .code(413)
          .send(
            buildPrefixedError('文件解析失败', new Error('文件过大，请选择小于10MB的文件'), 413),
          );
      } else if (err?.message?.includes('multipart')) {
        return reply
          .code(400)
          .send(
            buildPrefixedError('文件解析失败', new Error('文件上传格式错误，请重新选择文件'), 400),
          );
      }

      return reply
        .code(500)
        .send(
          buildPrefixedError(
            '文件解析失败',
            new Error(
              `文件解析服务异常：${err?.message || '未知错误'}。请稍后重试或直接复制粘贴文本内容。`,
            ),
            500,
          ),
        );
    }
  });
}
