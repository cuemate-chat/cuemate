import type { FastifyInstance } from 'fastify';
import { request } from 'http';
import { buildPrefixedError } from '../utils/error-response.js';

interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  ports: string[];
  created: string;
  size: string;
  state: 'running' | 'stopped' | 'exited' | 'created' | 'paused';
}

// 使用 HTTP 请求访问 Docker Socket
async function makeDockerRequest(
  path: string,
  method: string = 'GET',
  body?: string,
  rawResponse: boolean = false,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      socketPath: '/var/run/docker.sock',
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = request(options, (res: any) => {
      let data = '';
      res.on('data', (chunk: Buffer) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          if (rawResponse) {
            resolve(data);
          } else {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          }
        } catch (error: any) {
          reject(error);
        }
      });
    });

    req.on('error', (error: any) => {
      reject(error);
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

// 使用 Docker Socket API 获取容器列表
async function getContainersFromSocket(): Promise<DockerContainer[]> {
  try {
    const containers = (await makeDockerRequest('/containers/json?all=true&size=true')) as any[];
    return containers.map((container: any) => ({
      id: container.Id.substring(0, 12),
      name: container.Names[0]?.replace('/', '') || '',
      image: container.Image,
      status: container.Status,
      ports:
        container.Ports?.map(
          (port: any) => `${port.IP}:${port.PublicPort}->${port.PrivatePort}/${port.Type}`,
        ) || [],
      created: new Date(container.Created * 1000).toISOString(),
      size: (() => {
        // 格式化字节大小为人类可读格式
        const formatBytes = (bytes: number): string => {
          if (bytes === 0) return '0B';
          const k = 1024;
          const sizes = ['B', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return `${Math.round(bytes / Math.pow(k, i))}${sizes[i]}`;
        };

        // 使用 SizeRootFs（完整文件系统大小）作为容器大小
        // SizeRootFs = 镜像大小 + 读写层大小
        if (container.SizeRootFs && container.SizeRootFs > 0) {
          return formatBytes(container.SizeRootFs);
        }
        // 如果没有 SizeRootFs，尝试使用 SizeFs
        if (container.SizeFs && container.SizeFs > 0) {
          return formatBytes(container.SizeFs);
        }
        // 最后尝试使用 SizeRw（仅读写层大小）
        if (container.SizeRw && container.SizeRw > 0) {
          return formatBytes(container.SizeRw);
        }
        return '0B';
      })(),
      state:
        container.State === 'running'
          ? 'running'
          : container.State === 'exited'
            ? 'exited'
            : container.State === 'created'
              ? 'created'
              : container.State === 'paused'
                ? 'paused'
                : 'stopped',
    }));
  } catch (error) {
    throw new Error(`Failed to fetch containers: ${error}`);
  }
}

export function registerDockerRoutes(app: FastifyInstance) {
  // 获取容器列表
  app.get('/docker/containers', async (req, reply) => {
    try {
      (req as any).log.info('获取 Docker 容器列表');

      // 使用 Docker Socket API 获取真实容器数据
      const containers = await getContainersFromSocket();

      (req as any).log.info({ count: containers.length }, '成功获取容器列表');
      return containers;
    } catch (error: any) {
      (req as any).log.error({ err: error }, '获取容器列表失败');
      return reply.code(500).send(buildPrefixedError('获取容器列表失败', error, 500));
    }
  });

  // 启动容器
  app.post('/docker/containers/:id/start', async (req, reply) => {
    try {
      const { id } = (req as any).params;
      await makeDockerRequest(`/containers/${id}/start`, 'POST');

      return { success: true, message: '容器启动成功' };
    } catch (error: any) {
      (req as any).log.error({ err: error }, '启动容器失败');
      return reply.code(500).send(buildPrefixedError('启动容器失败', error, 500));
    }
  });

  // 停止容器
  app.post('/docker/containers/:id/stop', async (req, reply) => {
    try {
      const { id } = (req as any).params;
      await makeDockerRequest(`/containers/${id}/stop`, 'POST');

      return { success: true, message: '容器停止成功' };
    } catch (error: any) {
      (req as any).log.error({ err: error }, '停止容器失败');
      return reply.code(500).send(buildPrefixedError('停止容器失败', error, 500));
    }
  });

  // 重启容器
  app.post('/docker/containers/:id/restart', async (req, reply) => {
    try {
      const { id } = (req as any).params;
      await makeDockerRequest(`/containers/${id}/restart`, 'POST');

      return { success: true, message: '容器重启成功' };
    } catch (error: any) {
      (req as any).log.error({ err: error }, '重启容器失败');
      return reply.code(500).send(buildPrefixedError('重启容器失败', error, 500));
    }
  });

  // 获取容器日志
  app.get('/docker/containers/:id/logs', async (req, reply) => {
    try {
      const { id } = (req as any).params;
      const { tail = '100', since } = (req as any).query || {};

      let path = `/containers/${id}/logs?stdout=1&stderr=1`;
      if (tail) path += `&tail=${tail}`;
      if (since) path += `&since=${since}`;

      // 获取原始日志
      const rawLogs = await makeDockerRequest(path, 'GET', undefined, true);

      // 处理 Docker 日志流格式
      // Docker 日志流格式：每个日志行前面有 8 字节的头部
      // 前 4 字节是时间戳，后 4 字节是流类型标识符
      // 流类型：1=stdout, 2=stderr
      const processedLogs = rawLogs
        .split('\n')
        .map((line: string) => {
          // 如果行长度小于 8，说明不是标准 Docker 日志格式，直接返回
          if (line.length < 8) return line;

          // 检查前 8 个字符是否都是可打印字符
          const header = line.substring(0, 8);
          const isPrintable = /^[\x20-\x7E]+$/.test(header);

          if (isPrintable) {
            // 这是普通文本，直接返回
            return line;
          } else {
            // 这是 Docker 日志流格式，去掉前 8 字节头部
            return line.substring(8);
          }
        })
        .filter((line: string) => line.trim() !== '') // 过滤空行
        .join('\n');

      reply.header('Content-Type', 'text/plain');
      return processedLogs;
    } catch (error: any) {
      (req as any).log.error({ err: error }, '获取容器日志失败');
      return reply.code(500).send(buildPrefixedError('获取容器日志失败', error, 500));
    }
  });

  // 获取容器统计信息
  app.get('/docker/containers/:id/stats', async (req, reply) => {
    try {
      const { id } = (req as any).params;
      const stats = (await makeDockerRequest(`/containers/${id}/stats?stream=false`)) as any;

      return {
        cpu: `${(stats.cpu_stats.cpu_usage.total_usage / stats.cpu_stats.system_cpu_usage) * 100}%`,
        memory: `${Math.round(stats.memory_stats.usage / 1024 / 1024)}MB / ${Math.round(stats.memory_stats.limit / 1024 / 1024)}MB`,
        networkIO: `${Math.round(stats.networks.eth0.rx_bytes / 1024)}KB / ${Math.round(stats.networks.eth0.tx_bytes / 1024)}KB`,
        diskIO: `${Math.round(stats.blkio_stats.io_service_bytes_recursive[0]?.value / 1024 / 1024)}MB / ${Math.round(stats.blkio_stats.io_service_bytes_recursive[1]?.value / 1024 / 1024)}MB`,
      };
    } catch (error: any) {
      (req as any).log.error({ err: error }, '获取容器统计信息失败');
      return reply.code(500).send(buildPrefixedError('获取容器统计信息失败', error, 500));
    }
  });

  // 删除容器
  app.delete('/docker/containers/:id', async (req, reply) => {
    try {
      const { id } = (req as any).params;
      await makeDockerRequest(`/containers/${id}?force=1`, 'DELETE');

      return { success: true, message: '容器删除成功' };
    } catch (error: any) {
      (req as any).log.error({ err: error }, '删除容器失败');
      return reply.code(500).send(buildPrefixedError('删除容器失败', error, 500));
    }
  });

  // 获取镜像列表
  app.get('/docker/images', async (req, reply) => {
    try {
      const images = (await makeDockerRequest('/images/json')) as any[];

      return images.map((image: any) => ({
        repository: image.RepoTags[0]?.split(':')[0] || '<none>',
        tag: image.RepoTags[0]?.split(':')[1] || '<none>',
        id: image.Id.substring(7, 19),
        createdAt: new Date(image.Created * 1000).toISOString(),
        size: `${Math.round(image.Size / 1024 / 1024)}MB`,
      }));
    } catch (error: any) {
      (req as any).log.error({ err: error }, '获取镜像列表失败');
      return reply.code(500).send(buildPrefixedError('获取镜像列表失败', error, 500));
    }
  });

  // 获取 Docker 系统信息
  app.get('/docker/info', async (req, reply) => {
    try {
      const info = (await makeDockerRequest('/info')) as any;

      return {
        serverVersion: info.ServerVersion,
        clientVersion: info.ServerVersion, // Docker API 没有单独的客户端版本
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      (req as any).log.error({ err: error }, '获取 Docker 信息失败');
      return reply.code(500).send(buildPrefixedError('获取 Docker 信息失败', error, 500));
    }
  });
}
