import '../../App.css';
import { FloatingControlBar } from '../../components/FloatingControlBar';

function ControlBarApp() {
  return (
    <div>
      <div className="app-container">
        <FloatingControlBar 
          onShowCloseButton={() => {}}
          onHideCloseButton={() => {}}
        />
      </div>
    </div>
  );
}

export default ControlBarApp;
