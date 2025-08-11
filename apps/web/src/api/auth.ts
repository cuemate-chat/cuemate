import { http, storage } from './http';

export async function signin(account: string, password: string) {
  const data = await http.post('/auth/signin', { account, password });
  storage.setToken((data as any).token);
  return data;
}
