import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './utils/serviceWorkerRegistration';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// In desktop / electron, ensure stale service worker caches are completely evicted so updates apply immediately
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const isDesktop = /electron/i.test(navigator.userAgent) || 
                    /MineMindDesktop/i.test(navigator.userAgent) || 
                    Boolean((window as any).IS_ELECTRON_DESKTOP) ||
                    (window.location.hostname === 'localhost' && Boolean((window as any).process?.versions?.electron));

  if (isDesktop) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
    if ('caches' in window) {
      caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
    }
  } else {
    registerServiceWorker();
  }
}

