import { http, request } from './http';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export async function fetchLogServices(): Promise<{ services: string[]; levels: LogLevel[] }> {
  return await request<{ services: string[]; levels: LogLevel[] }>('/logs/services');
}

export async function fetchLogs(params: {
  level?: LogLevel;
  service?: string;
  date?: string; // yyyy-mm-dd
  page?: number;
  pageSize?: number;
}) {
  const qs = new URLSearchParams();
  if (params.level) qs.set('level', params.level);
  if (params.service) qs.set('service', params.service);
  if (params.date) qs.set('date', params.date);
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  return await http.get<{
    total: number;
    items: Array<{ level: LogLevel; service: string; date: string; size: number; mtimeMs: number }>;
  }>('/logs' + (qs.toString() ? `?${qs.toString()}` : ''));
}

export async function fetchLogContent(params: {
  level: LogLevel;
  service: string;
  date: string; // yyyy-mm-dd
  tail?: number;
}) {
  const qs = new URLSearchParams();
  qs.set('level', params.level);
  qs.set('service', params.service);
  qs.set('date', params.date);
  if (params.tail) qs.set('tail', String(params.tail));
  return await http.get<{ level: LogLevel; service: string; date: string; lines: string[] }>('/logs/content?' + qs.toString());
}

export async function clearLogContent(params: {
  level: LogLevel;
  service: string;
  date: string; // yyyy-mm-dd
}) {
  const qs = new URLSearchParams();
  qs.set('level', params.level);
  qs.set('service', params.service);
  qs.set('date', params.date);
  const res = await http.post('/logs/clear?' + qs.toString());
  return res as { success: boolean };
}
