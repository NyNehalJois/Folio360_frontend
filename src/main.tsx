import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@/App';
import '@/design/tokens.css';
import { API_CONFIG } from '@/services/config';
import { initMockAdapter } from '@/services/mock/mockAdapter';

if (API_CONFIG.useMocks) {
  initMockAdapter();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
