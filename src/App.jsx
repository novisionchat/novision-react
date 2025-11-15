// --- GÜNCELLENEN DOSYA: src/App.jsx ---

import React, { useState, useEffect } from 'react';
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import AuthPage from './components/AuthPage';
import MainPage from './components/MainPage';
import ToastContainer from './components/ToastContainer';
import { useToast } from './context/ToastContext';
// SİLİNDİ: import { requestNotificationPermission } from './lib/firebase-messaging-init';
// YENİ: OneSignal fonksiyonlarını import ediyoruz
import { initializeOneSignal, cleanupOneSignal } from './lib/onesignal-init';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      
      // --- MANTIĞI TAMAMEN DEĞİŞTİRİLEN BÖLÜM ---
      if (user) {
        // Kullanıcı giriş yapmışsa, OneSignal'ı başlat ve Player ID'yi al/kaydet
        initializeOneSignal(user.uid);
      } else {
        // Kullanıcı çıkış yapmışsa, OneSignal ile ilgili temizlik yap
        cleanupOneSignal();
      }
      // --- BİTİŞ ---
      
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [showToast]); // showToast burada kalabilir, bir zararı yok

  if (isLoading) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            width: '100%',
            gap: '20px'
        }}>
            <img src="/assets/icon.png" alt="Loading" style={{width: '80px', height: '80px'}} />
            <p>Yükleniyor...</p>
        </div>
    );
  }

  return (
    <>
      {currentUser ? <MainPage /> : <AuthPage />}
      <ToastContainer />
    </>
  );
}

export default App;