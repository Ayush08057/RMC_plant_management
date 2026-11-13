import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Strict Mobile Viewport Zoom Lock (Prevents pinch-to-zoom and double-tap zoom on mobile devices)
if (typeof window !== 'undefined') {
  // Prevent pinch zoom gestures
  document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('gesturechange', (e) => {
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('gestureend', (e) => {
    e.preventDefault();
  }, { passive: false });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
