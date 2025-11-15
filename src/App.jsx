// src/App.jsx
import React, { useState, useEffect } from 'react';
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import AuthPage from './components/AuthPage';
import MainPage from './components/MainPage';
import ToastContainer from './components/ToastContainer';
import { useToast } from './context/ToastContext'; // YENİ İMPORT
import { requestNotificationPermission } from './lib/firebase-messaging-init'; // YENİ İMPORT

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast(); // YENİ EKLENDİ

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      
      // YENİ EKLENEN BÖLÜM: Kullanıcı giriş yaptığında bildirim izni iste
      if (user) {
        // Kullanıcı ID'sini ve toast fonksiyonunu gönderiyoruz
        requestNotificationPermission(user.uid, showToast);
      }
      
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [showToast]); // Bağımlılıklara showToast eklendi

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