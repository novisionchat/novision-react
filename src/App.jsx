// src/App.jsx
import React, { useState, useEffect } from 'react';
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import AuthPage from './components/AuthPage';
import MainPage from './components/MainPage';
import ToastContainer from './components/ToastContainer'; // YENİ: ToastContainer'ı import et

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
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
      {/* YENİ: ToastContainer tüm sayfanın üzerinde görünecek şekilde buraya eklendi */}
      <ToastContainer />
    </>
  );
}

export default App;