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
    // 记录请求体（POST/PUT/PATCH 请求）
    preHandler: async (req: any) => {
      const rid: any = (req as any).id || (req as any).requestContext?.id || undefined;
      const raw: any = (req as any).raw || req;
      const method = raw.method || (req as any).method;
      if (['POST', 'PUT', 'PATCH'].includes(method?.toUpperCase())) {
        const body = (req as any).body;
        if (body) {
          const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
          (req as any).log.info(
            {
              rid,
              method,
              url: raw.url || (req as any).url,
              body: bodyStr,
            },
            'request body',
          );
        }
      }
    },
    onResponse: async (req: any, reply: any) => {
      const rid: any = (req as any).id || (req as any).requestContext?.id || undefined;
      (reply as any).log.info({ rid, statusCode: (reply as any).statusCode }, 'response');
    },
    setErrorHandler: (app: any) => {
      app.setErrorHandler((error: any, _req: any, reply: any) => {
        const status = (error as any)?.statusCode || 500;
        (app.log as any).error({ err: error, status }, 'unhandled');
        const isDev = process.env.NODE_ENV !== 'production';
        const payload: any = {
          error: (error && (error.message || String(error))) || 'Unknown error',
          name: (error && error.name) || undefined,
          code: (error && (error.code || error.statusCode)) || undefined,
          status,
          details: (error && (error.details || error.errors)) || undefined,
          cause: (error && error.cause) || undefined,
          stack: isDev ? error?.stack : undefined,
        };
        reply.code(status).send(payload);
      });
    },
  };
}
