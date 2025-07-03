import React from 'react';
import { createRoot } from 'react-dom/client';
import DisplayOverlayApp from './components/DisplayOverlay';
import './index.css';

// Initialize the React app
const overlayRootElement = document.getElementById("overlay-root");
if (!overlayRootElement) {
  throw new Error("Overlay root element not found");
}

const reactRoot = createRoot(overlayRootElement);
reactRoot.render(
  <React.StrictMode>
    <DisplayOverlayApp />
  </React.StrictMode>
);

// Prevent context menu and text selection
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

document.addEventListener('selectstart', (e) => {
  e.preventDefault();
}); 