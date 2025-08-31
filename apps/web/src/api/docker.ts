import { http } from './http';

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  ports: string[];
  created: string;
  size: string;
  state: 'running' | 'stopped' | 'exited' | 'created' | 'paused';
}

export interface ContainerStats {
  cpu: string;
  memory: string;
  networkIO: string;
  diskIO: string;
}

export interface DockerImage {
  repository: string;
  tag: string;
  id: string;
  createdAt: string;
  size: string;
}

export interface DockerInfo {
  serverVersion: string;
  clientVersion: string;
  timestamp: string;
}

// 获取容器列表
export async function getContainers(): Promise<DockerContainer[]> {
  return await http.get<DockerContainer[]>('/docker/containers');
}

// 启动容器
export async function startContainer(id: string): Promise<{ success: boolean; message: string }> {
  const res = await http.post(`/docker/containers/${id}/start`);
  return res as { success: boolean; message: string };
}

// 停止容器
export async function stopContainer(id: string): Promise<{ success: boolean; message: string }> {
  const res = await http.post(`/docker/containers/${id}/stop`);
  return res as { success: boolean; message: string };
}

// 重启容器
export async function restartContainer(id: string): Promise<{ success: boolean; message: string }> {
  const res = await http.post(`/docker/containers/${id}/restart`);
  return res as { success: boolean; message: string };
}

// 获取容器日志
export async function getContainerLogs(id: string, tail?: string, since?: string): Promise<string> {
  const qs = new URLSearchParams();
  if (tail) qs.set('tail', tail);
  if (since) qs.set('since', since);

  return await http.get<string>(`/docker/containers/${id}/logs?${qs.toString()}`);
}

// 获取容器统计信息
export async function getContainerStats(id: string): Promise<ContainerStats> {
  return await http.get<ContainerStats>(`/docker/containers/${id}/stats`);
}

// 删除容器
export async function deleteContainer(id: string): Promise<{ success: boolean; message: string }> {
  const res = await http.delete(`/docker/containers/${id}`);
  return res as { success: boolean; message: string };
}

// 获取镜像列表
export async function getImages(): Promise<DockerImage[]> {
  return await http.get<DockerImage[]>('/docker/images');
}

// 获取 Docker 系统信息
export async function getDockerInfo(): Promise<DockerInfo> {
  return await http.get<DockerInfo>('/docker/info');
}
