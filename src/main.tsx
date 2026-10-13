import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker with auto-update & offline readiness
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('CoolHome AC: New update available, applying immediately...');
    updateSW(true);
  },
  onOfflineReady() {
    console.log('CoolHome AC: App is ready for offline standalone usage');
  },
  onRegisterError(error) {
    console.warn('PWA registration warning:', error);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
