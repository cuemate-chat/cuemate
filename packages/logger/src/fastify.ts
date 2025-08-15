export function fastifyLoggingHooks() {
  return {
    onRequest: async (req: any) => {
      const rid: any = (req as any).id || (req as any).requestContext?.id || undefined;
      const raw: any = (req as any).raw || req;
      (req as any).log.info(
        {
          rid,
          method: raw.method,
          url: raw.url,
          ip: (req as any).ip,
          ua: raw.headers?.['user-agent'],
        },
        'request',
      );
    },
    onResponse: async (req: any, reply: any) => {
      const rid: any = (req as any).id || (req as any).requestContext?.id || undefined;
      (reply as any).log.info({ rid, statusCode: (reply as any).statusCode }, 'response');
    },
    setErrorHandler: (app: any) => {
      app.setErrorHandler((error: any, _req: any, reply: any) => {
        const status = (error as any)?.statusCode || 500;
        (app.log as any).error({ err: error, status }, 'unhandled');
        reply.code(status).send({ error: 'Internal Server Error' });
      });
    },
  };
}
