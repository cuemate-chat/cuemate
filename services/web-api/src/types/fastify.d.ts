import '@fastify/jwt';
import 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    jwt: import('@fastify/jwt').JWT;
    db: any;
  }
}
