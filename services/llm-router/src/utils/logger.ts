import { createLogger, createModuleLogger as baseCreateModuleLogger } from '@cuemate/logger';

export const logger: any = createLogger({
  service: 'llm-router',
});

// 封装 createModuleLogger，自动传入 logger
export function createModuleLogger(module: string) {
  return baseCreateModuleLogger(logger, module);
}

export type { ModuleLogger, LogData } from '@cuemate/logger';
