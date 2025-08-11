import { http, storage } from './http';

export async function signin(account: string, password: string) {
  const data = await http.post('/auth/signin', { account, password });
  storage.setToken((data as any).token);
  if ((data as any).user) {
    storage.setUser((data as any).user);
  }
  return data;
}

export async function fetchMe() {
  const data = await http.get('/auth/me');
  if ((data as any).user) storage.setUser((data as any).user);
  return data;
}
