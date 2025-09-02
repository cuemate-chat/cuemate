import React from 'react';
import { FloatingCloseButton } from '../../components/FloatingCloseButton.js';
import '../../App.css';

export const CloseButtonApp: React.FC = () => {
  return (
    <div className="app-container-close">
      <FloatingCloseButton showCloseButton={true} />
    </div>
  );
};