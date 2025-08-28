@cuemate/logger

- 基于 pino 的统一日志库
- 生产环境输出到 `/opt/cuemate/logs/<level>/<yyyy-mm-dd>/<level>.log`
- 开发环境默认彩色控制台输出，可通过设置 `NODE_ENV=production` 强制写文件

使用示例:

```ts
import { createLogger, fastifyLoggingHooks } from '@cuemate/logger';

const logger = createLogger({ service: 'web-api' });

// Fastify
const app = Fastify({ logger });
const hooks = fastifyLoggingHooks();
app.addHook('onRequest', hooks.onRequest as any);
app.addHook('onResponse', hooks.onResponse as any);
hooks.setErrorHandler(app as any);
```

环境变量：
- CUEMATE_LOG_DIR: 自定义日志根目录（默认 `/opt/cuemate/logs`）
- LOG_LEVEL: 设置日志级别（默认 `info`）


