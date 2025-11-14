// src/components/AuthPage.jsx
import React, { useState } from 'react';
import { registerUser, loginUser } from '../lib/auth';

// Yeni import
import styles from './AuthPage.module.css';

function AuthPage() {
  const [isRegisterView, setIsRegisterView] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const showRegister = (e) => { e.preventDefault(); setIsRegisterView(true); };
  const showLogin = (e) => { e.preventDefault(); setIsRegisterView(false); };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await loginUser(email, password);
    } catch (error) {
      alert('Giriş başarısız: ' + error.message);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await registerUser(username, email, password);
      alert('Kayıt başarılı! Lütfen giriş yapın.');
      setIsRegisterView(false);
    } catch (error) {
      alert('Kayıt başarısız: ' + error.message);
    }
  };

  return (
    // Değişen class'lar
    <div className={`${styles.authPage} page`}>
      <div className={styles.authContainer}>
        <img src="/assets/icon.png" alt="Novision Logo" className={styles.loginLogo} />
        <h1>Novision</h1>

        {isRegisterView ? (
          <form onSubmit={handleRegister}>
            <input type="text" placeholder="Kullanıcı Adı" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
            <input type="email" placeholder="E-posta" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="Şifre" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="submit">Kayıt Ol</button>
            <p className={styles.formSwitcher}>
              Zaten hesabın var mı? <a href="#" onClick={showLogin}>Giriş Yap</a>
            </p>
          </form>
        ) : (
          <form onSubmit={handleLogin}>
            <input type="email" placeholder="E-posta" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="Şifre" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="submit">Giriş Yap</button>
            <p className={styles.formSwitcher}>
              Hesabın yok mu? <a href="#" onClick={showRegister}>Kayıt Ol</a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default AuthPage;