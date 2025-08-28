import '@fastify/jwt';
import 'fastify';
import type { OperationLogger } from '../utils/operation-logger.js';

declare module 'fastify' {
  interface FastifyInstance {
    jwt: import('@fastify/jwt').JWT;
    db: any;
    operationLogger: OperationLogger;
  }
  interface FastifyRequest {
    jwtVerify(): Promise<{ uid: string; email?: string }>;
  }
}
