declare module '@fastify/multipart' {
  import { FastifyPluginAsync } from 'fastify';

  interface MultipartOptions {
    limits?: {
      fileSize?: number;
      files?: number;
      fieldSize?: number;
      fields?: number;
      parts?: number;
      headerPairs?: number;
    };
  }

  const multipart: FastifyPluginAsync<MultipartOptions>;
  export default multipart;
}
