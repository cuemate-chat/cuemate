/**
 * 面试控制命令通道
 * 用于 control-bar 与面试窗口之间的跨窗口通信
 */

export type InterviewCommandType = 'pause' | 'resume' | 'stop';

export interface InterviewCommand {
  type: InterviewCommandType;
  mode: 'mock-interview' | 'interview-training';
  timestamp: number;
}

const CHANNEL_NAME = 'cuemate.interview.command';

let channel: BroadcastChannel | null = null;
try {
  channel = new BroadcastChannel(CHANNEL_NAME);
} catch {}

// 同窗口监听器
const listeners = new Set<(cmd: InterviewCommand) => void>();

/**
 * 发送面试控制命令
 */
export function sendInterviewCommand(
  type: InterviewCommandType,
  mode: 'mock-interview' | 'interview-training'
): void {
  const command: InterviewCommand = {
    type,
    mode,
    timestamp: Date.now(),
  };

  console.debug(`[InterviewCommandChannel] 发送命令: ${type} for ${mode}`);

  // 广播到其他窗口
  try {
    channel?.postMessage(command);
  } catch (e) {
    console.error('[InterviewCommandChannel] 广播失败:', e);
  }

  // 通知同窗口监听器
  listeners.forEach((listener) => {
    try {
      listener(command);
    } catch {}
  });
}

/**
 * 监听面试控制命令
 * @returns 取消监听的函数
 */
export function onInterviewCommand(
  callback: (cmd: InterviewCommand) => void
): () => void {
  // 添加到同窗口监听器
  listeners.add(callback);

  // 监听跨窗口消息
  const handleMessage = (event: MessageEvent<InterviewCommand>) => {
    if (event.data && event.data.type && event.data.mode) {
      console.debug(`[InterviewCommandChannel] 收到命令: ${event.data.type} for ${event.data.mode}`);
      callback(event.data);
    }
  };

  channel?.addEventListener('message', handleMessage);

  // 返回清理函数
  return () => {
    listeners.delete(callback);
    try {
      channel?.removeEventListener('message', handleMessage);
    } catch {}
  };
}
