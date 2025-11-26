import { useCallback, useRef, useState } from 'react';

interface UseLoadingOptions {
  delay?: number; // 延迟显示时间（毫秒），默认 300ms
  minDuration?: number; // 最小显示时长（毫秒），默认 800ms
}

export function useLoading(options: UseLoadingOptions = {}) {
  const { delay = 300, minDuration = 800 } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [showLoading, setShowLoading] = useState(false);

  const startTimeRef = useRef<number>(0);
  const delayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isShowingRef = useRef(false);
  const isCancelledRef = useRef(false);

  // 开始 loading
  const start = useCallback(() => {
    setIsLoading(true);
    startTimeRef.current = Date.now();
    isShowingRef.current = false;
    isCancelledRef.current = false;

    // 延迟后才显示 loading（如果操作在 delay 时间内完成，就不会显示）
    delayTimerRef.current = setTimeout(() => {
      delayTimerRef.current = null;

      // 检查是否已经被取消
      if (isCancelledRef.current) {
        return;
      }

      setShowLoading(true);
      isShowingRef.current = true;
    }, delay);
  }, [delay]);

  // 结束 loading
  const end = useCallback(async () => {
    setIsLoading(false);
    isCancelledRef.current = true;

    // 如果延迟计时器还在运行（说明操作很快完成，还没到显示 loading 的时候）
    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
      setShowLoading(false);
      isShowingRef.current = false;
      return;
    }

    // 如果 loading 已经显示了，确保至少显示 minDuration 时长
    if (isShowingRef.current) {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, minDuration - elapsed);

      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }

      setShowLoading(false);
      isShowingRef.current = false;
    }
  }, [minDuration]);

  // 包装异步函数，自动处理 loading 状态
  const withLoading = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      onError?: (error: any) => void,
    ): Promise<T | undefined> => {
      start();
      try {
        const result = await asyncFn();
        return result;
      } catch (error) {
        if (onError) {
          onError(error);
        }
        // 未提供 onError 时，HTTP 层已处理错误提示
        return undefined;
      } finally {
        await end();
      }
    },
    [start, end],
  );

  return {
    loading: showLoading, // 用于渲染判断的状态
    isLoading, // 实际操作状态（可选使用）
    showLoading, // 同 loading，为了语义清晰
    start,
    end,
    withLoading,
  };
}
