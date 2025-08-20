// 简单的logger实现
export const logger = {
  error: (message: string, error?: any) => {
    console.error(message, error);
  },
  warn: (message: string, data?: any) => {
    console.warn(message, data);
  },
  info: (message: string, data?: any) => {
    console.info(message, data);
  },
  debug: (message: string, data?: any) => {
    console.debug(message, data);
  },
};
