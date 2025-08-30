import { useEffect, useState } from 'react';
import '../../App.css';
import { FloatingCloseButton } from '../../components/FloatingCloseButton';

function CloseButtonApp() {
  const [showCloseButton, setShowCloseButton] = useState(false);

  // 监听来自 control-bar 窗口的事件
  useEffect(() => {
    const setupListener = async () => {
      const { listen } = await import('@tauri-apps/api/event');
      
      const unlisten = await listen('toggle_close_button', (event: any) => {
        setShowCloseButton(event.payload.show);
      });

      return unlisten;
    };

    let unlisten: (() => void) | undefined;
    setupListener().then((unlistenFn) => {
      unlisten = unlistenFn;
    });

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  return (
    <div>
      <div className="app-container-close">
        <FloatingCloseButton showCloseButton={showCloseButton} />
      </div>
    </div>
  );
}

export default CloseButtonApp;
