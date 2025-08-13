import { http } from './http';

export function listModels(params: any) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
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

export function selectUserModel(model_id: string) {
  return http.post('/models/select', { model_id });
}
