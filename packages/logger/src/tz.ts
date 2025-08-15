let currentTimeZone: string | undefined = process.env.CUEMATE_LOG_TZ || process.env.TZ || 'Asia/Shanghai';

export function getLoggerTimeZone(): string | undefined {
  return currentTimeZone;
}

export function setLoggerTimeZone(tz?: string): void {
  if (typeof tz === 'string' && tz.trim().length > 0) {
    currentTimeZone = tz.trim();
  }
}
