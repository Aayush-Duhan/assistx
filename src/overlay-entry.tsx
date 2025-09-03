import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { DisplayOverlayApp } from './components/DisplayOverlay';
import './index.css';

const overlayRootElement = document.getElementById("overlay-root");
if (!overlayRootElement) {
  throw new Error("Overlay root element not found");
}

const root = createRoot(overlayRootElement);
root.render(
  <StrictMode>
    <DisplayOverlayApp />
  </StrictMode>
);