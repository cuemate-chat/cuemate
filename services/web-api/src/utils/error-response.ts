export function buildErrorPayload(error: any, fallbackStatus?: number) {
  const status = (error && (error.statusCode || error.code)) || fallbackStatus || 500;
  const isDev = process.env.NODE_ENV !== 'production';
  return {
    error: (error && (error.message || String(error))) || 'Unknown error',
    name: error?.name,
    code: error?.code || error?.statusCode,
    status: Number(status) || 500,
    details: (error && (error.details || error.errors)) || undefined,
    cause: error?.cause,
    stack: isDev ? error?.stack : undefined,
  };
}

export function buildSimpleError(message: string, status: number, name?: string) {
  return {
    error: message,
    name: name || undefined,
    code: status,
    status,
  };
}

export function buildPrefixedError(prefix: string, error: any, status?: number) {
  const msg = (error && (error.message || String(error))) || '未知错误';
  const payload: any = { error: `${prefix}：${msg}` };
  if (status) payload.status = status;
  return payload;
}
