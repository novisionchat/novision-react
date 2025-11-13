// --- DOSYA: src/main.jsx ---

import React from 'react';
import ReactDOM from 'react-dom/client'; // 'react-dom/client' olduğundan emin olun
import App from './App';
import { ChatProvider } from './context/ChatContext';
import { ToastProvider } from './context/ToastContext';
import { CallProvider } from './context/CallContext';
import ErrorBoundary from './components/ErrorBoundary';

import './index.css';

// React 18 için doğru yöntem budur.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <ChatProvider>
          <CallProvider>
            <App />
          </CallProvider>
        </ChatProvider>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);