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

  // Prevent double-tap zooming on buttons, cards, and canvas
  let lastTouchEndTime = 0;
  document.addEventListener('touchend', (e) => {
    const currentTime = Date.now();
    if (currentTime - lastTouchEndTime <= 300) {
      // Allow normal clicking on input, select, textarea, button, a
      const targetTag = (e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '');
      if (targetTag !== 'input' && targetTag !== 'textarea' && targetTag !== 'select') {
        e.preventDefault();
      }
    }
    lastTouchEndTime = currentTime;
  }, { passive: false });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
