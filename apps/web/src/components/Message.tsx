import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon 
} from '@heroicons/react/24/outline';

type MessageType = 'success' | 'error' | 'warning' | 'info';

export interface AppMessage {
  id: number;
  type: MessageType;
  text: string;
}

const EVENT_NAME = 'cuemate-message';

function dispatch(type: MessageType, text: string) {
  const event = new CustomEvent(EVENT_NAME, { detail: { type, text } });
  window.dispatchEvent(event);
}

export const message = {
  success: (text: string) => dispatch('success', text),
  error: (text: string) => dispatch('error', text),
  warning: (text: string) => dispatch('warning', text),
  info: (text: string) => dispatch('info', text),
};

export const MessageContainer: React.FC = () => {
  const [list, setList] = useState<AppMessage[]>([]);

  useEffect(() => {
    let idSeq = 1;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { type: MessageType; text: string };
      const id = idSeq++;
      const item: AppMessage = { id, type: detail.type, text: detail.text };
      setList((prev) => [...prev, item]);
      
      // 根据消息类型设置不同的显示时长
      const getDuration = (type: MessageType): number => {
        switch (type) {
          case 'success': return 3000;  // 成功消息显示 3 秒
          case 'info': return 3000;     // 信息消息显示 3 秒
          case 'warning': return 6000;  // 警告消息显示 6 秒
          case 'error': return 10000;   // 错误消息显示 10 秒
          default: return 3000;
        }
      };
      
      // 自动移除
      setTimeout(() => {
        const messageElement = document.querySelector(`[data-message-id="${id}"]`) as HTMLElement;
        if (messageElement) {
          messageElement.style.animation = 'slideOut 0.3s ease-in forwards';
          setTimeout(() => {
            setList((prev) => prev.filter((m) => m.id !== id));
          }, 300);
        } else {
          setList((prev) => prev.filter((m) => m.id !== id));
        }
      }, getDuration(detail.type));
    };
    window.addEventListener(EVENT_NAME, handler as EventListener);
    return () => window.removeEventListener(EVENT_NAME, handler as EventListener);
  }, []);

  return createPortal(
    <div className="msg-wrap">
      {list.map((m) => (
        <div 
          key={m.id} 
          data-message-id={m.id}
          className={`msg-item msg-${m.type} animate-slide-in`}
          style={{
            animation: 'slideIn 0.3s ease-out forwards'
          }}
        >
          <div className="flex items-center justify-center gap-2">
            {m.type === 'success' && <CheckCircleIcon className="w-4 h-4 text-green-600" />}
            {m.type === 'error' && <XCircleIcon className="w-4 h-4 text-red-600" />}
            {m.type === 'warning' && <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600" />}
            {m.type === 'info' && <InformationCircleIcon className="w-4 h-4 text-blue-600" />}
            <span className="msg-text">{m.text}</span>
          </div>
        </div>
      ))}
    </div>,
    document.body,
  );
};
