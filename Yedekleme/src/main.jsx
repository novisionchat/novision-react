// --- DOSYA: src/main.jsx (GÜNCELLENMİŞ HALİ) ---

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ChatProvider } from './context/ChatContext';
import { ToastProvider } from './context/ToastContext';
import { CallProvider } from './context/CallContext';
import { VoiceChannelProvider } from './context/VoiceChannelContext'; // YENİ
import ErrorBoundary from './components/ErrorBoundary';

import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <ChatProvider>
          <CallProvider>
            <VoiceChannelProvider> {/* YENİ */}
              <App />
            </VoiceChannelProvider> {/* YENİ */}
          </CallProvider>
        </ChatProvider>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);