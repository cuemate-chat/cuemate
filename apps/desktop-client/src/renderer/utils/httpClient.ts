/**
 * 全局 HTTP 客户端
 * 自动打印所有 HTTP 请求的入参和出参
 */

import { createLogger } from '../../utils/rendererLogger.js';

const log = createLogger('HttpClient');

export interface HttpRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | FormData;
  timeout?: number;
}

export interface HttpResponse<T = any> {
  ok: boolean;
  status: number;
  statusText: string;
  data: T;
  headers: Headers;
}

/**
 * 全局 HTTP 请求方法，自动打印入参出参
 */
export async function httpRequest<T = any>(
  url: string,
  options: HttpRequestOptions = {}
): Promise<HttpResponse<T>> {
  const { method = 'GET', headers = {}, body, timeout = 30000 } = options;

  // 打印请求入参
  log.debug('request', `${method} ${url}`, {
    url,
    method,
    headers: JSON.stringify(headers),
    body: body ? (typeof body === 'string' ? body.substring(0, 500) : '[FormData]') : undefined,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    // 读取响应体
    const contentType = response.headers.get('content-type') || '';
    let data: T;
    let responseText = '';

    if (contentType.includes('application/json')) {
      responseText = await response.text();
      try {
        data = JSON.parse(responseText);
      } catch {
        data = responseText as unknown as T;
      }
    } else {
      responseText = await response.text();
      data = responseText as unknown as T;
    }

    // 打印响应出参
    if (response.ok) {
      log.debug('response', `${method} ${url} - ${response.status}`, {
        status: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
        responseBody: responseText.substring(0, 500),
      });
    } else {
      log.error('response', `${method} ${url} - ${response.status}`, {
        status: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
        responseBody: responseText.substring(0, 1000),
      });
    }

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data,
      headers: response.headers,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      log.error('request', `${method} ${url} - 请求超时`, {
        timeout: `${timeout}ms`,
      });
      throw new Error(`请求超时: ${url}`);
    }

    log.error('request', `${method} ${url} - 请求失败`, undefined, error);
    throw error;
  }
}

/**
 * GET 请求
 */
export async function httpGet<T = any>(
  url: string,
  headers?: Record<string, string>
): Promise<HttpResponse<T>> {
  return httpRequest<T>(url, { method: 'GET', headers });
}

/**
 * POST 请求
 */
export async function httpPost<T = any>(
  url: string,
  body: any,
  headers?: Record<string, string>
): Promise<HttpResponse<T>> {
  const defaultHeaders = { 'Content-Type': 'application/json', ...headers };
  return httpRequest<T>(url, {
    method: 'POST',
    headers: defaultHeaders,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

/**
 * PUT 请求
 */
export async function httpPut<T = any>(
  url: string,
  body: any,
  headers?: Record<string, string>
): Promise<HttpResponse<T>> {
  const defaultHeaders = { 'Content-Type': 'application/json', ...headers };
  return httpRequest<T>(url, {
    method: 'PUT',
    headers: defaultHeaders,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

/**
 * DELETE 请求
 */
export async function httpDelete<T = any>(
  url: string,
  headers?: Record<string, string>
): Promise<HttpResponse<T>> {
  return httpRequest<T>(url, { method: 'DELETE', headers });
}
