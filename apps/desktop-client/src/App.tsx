import { useState } from 'react';
import './App.css';
import { FloatingControlBar } from './components/FloatingControlBar';

function App() {
  const [_, setShowCloseButton] = useState(false);

  return (
    <div className="app-container">
      <FloatingControlBar 
        onShowCloseButton={() => setShowCloseButton(true)}
        onHideCloseButton={() => setShowCloseButton(false)}
      />
    </div>
  );
}

export default App;