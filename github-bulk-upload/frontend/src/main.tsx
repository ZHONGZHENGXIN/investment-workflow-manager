import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { register, showUpdateAvailableNotification } from './utils/serviceWorker';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// 在生产环境中注册 Service Worker
if (import.meta.env.PROD) {
  register({
    onSuccess: (registration) => {
      console.log('Service Worker registered successfully:', registration);
    },
    onUpdate: (registration) => {
      console.log('Service Worker updated:', registration);
      showUpdateAvailableNotification(registration);
    },
  });
}