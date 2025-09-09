import { WindowBody } from './WindowBody';
import { WindowFooter } from './WindowFooter';
import { WindowHeader } from './WindowHeader';
import './index.css';

export function AIQuestionHistoryApp() {
  const handleClose = async () => {
    try {
      (window as any).electronHistoryAPI?.closeSelf?.();
    } catch {}
  };

  return (
    <div className="ai-question-app">
      <div className="ai-question-window">
        <WindowHeader onClose={handleClose} />
        <WindowBody messages={[]} isLoading={false} />
        <WindowFooter>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>共 0 条</span>
        </WindowFooter>
      </div>
    </div>
  );
}


