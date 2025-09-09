import React from 'react';

interface WindowFooterProps {
  children?: React.ReactNode;
  className?: string;
}

export function WindowFooter({ children, className }: WindowFooterProps) {
  return (
    <div className={`ai-window-footer${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}


