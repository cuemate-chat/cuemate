import '../../App.css';
import { FloatingControlBar } from '../../components/FloatingControlBar';

function ControlBarApp() {
  const showCloseButton = async () => {
    try {
      const { emit } = await import('@tauri-apps/api/event');
      await emit('toggle_close_button', { show: true });
    } catch (error) {
      console.error('发送显示关闭按钮事件失败:', error);
    }
  };

  const hideCloseButton = async () => {
    try {
      const { emit } = await import('@tauri-apps/api/event');
      await emit('toggle_close_button', { show: false });
    } catch (error) {
      console.error('发送隐藏关闭按钮事件失败:', error);
    }
  };

  return (
    <div>
      <div className="app-container">
        <FloatingControlBar 
          onShowCloseButton={showCloseButton}
          onHideCloseButton={hideCloseButton}
        />
      </div>
    </div>
  );
}

export default ControlBarApp;
