import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

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
      // 自动移除
      setTimeout(() => {
        setList((prev) => prev.filter((m) => m.id !== id));
      }, 2500);
    };
    window.addEventListener(EVENT_NAME, handler as EventListener);
    return () => window.removeEventListener(EVENT_NAME, handler as EventListener);
  }, []);

  return createPortal(
    <div className="msg-wrap">
      {list.map((m) => (
        <div key={m.id} className={`msg-item msg-${m.type}`}>
          <span className="msg-text">{m.text}</span>
        </div>
      ))}
    </div>,
    document.body,
  );
};
