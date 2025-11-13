// src/App.jsx
import React, { useState, useEffect } from 'react';
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import AuthPage from './components/AuthPage';
import MainPage from './components/MainPage';
import ToastContainer from './components/ToastContainer';

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
            width: '100%', // <-- YENİ EKLENEN SATIR
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