import { http } from './http';

export function listModels(params: any) {
  const src = params || {};
  const clean: Record<string, string> = {};
  Object.keys(src).forEach((k) => {
    const v = src[k];
    if (v !== undefined && v !== null && v !== '') {
      clean[k] = String(v);
    }
  });
  const qs = Object.keys(clean).length ? '?' + new URLSearchParams(clean).toString() : '';
  return http.get('/models' + qs);
}

export function getModel(id: string) {
  return http.get(`/models/${id}`);
}

export function upsertModel(payload: any) {
  return http.post('/models', payload);
}

export function deleteModel(id: string) {
  return http.delete(`/models/${id}`);
}

export function selectUserModel(modelId: string) {
  return http.post('/models/select', { modelId });
}

export function testModelConnectivity(id: string) {
  return http.post(`/models/${id}/test`, {});
}

export function testModelConfig(config: {
  provider: string;
  modelName: string;
  credentials: Record<string, any>;
  params?: any[];
}) {
  return http.post('/models/test-config', config);
}
