import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './presentation/App';
import './index.css';

// Load debug utilities in development
if (import.meta.env.DEV) {
  import('./data/storage/debugUtils');
}

console.log('=== TrustVault App Loading ===');

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError: unknown) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

console.log('Looking for root element...');
const rootElement = document.getElementById('root');
console.log('Root element found:', !!rootElement);

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

console.log('Creating React root and rendering App...');
try {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('React app rendered successfully');
} catch (error) {
  console.error('Failed to render React app:', error);
  throw error;
}
