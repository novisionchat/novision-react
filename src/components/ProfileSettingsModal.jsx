// src/components/ProfileSettingsModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../lib/firebase';
import { ref, get } from 'firebase/database';
import { uploadToCloudinary } from '../lib/cloudinary';
import { updateUserProfile, changeUserPassword, changeUserEmail } from '../lib/profile';
import styles from './ProfileSettingsModal.module.css';
import { IoClose, IoArrowBack } from 'react-icons/io5';

function ProfileSettingsModal({ isOpen, onClose }) {
  // --- STATE'LER ---
  const [view, setView] = useState('main'); // 'main', 'changeEmail', 'changePassword'
  const [userData, setUserData] = useState({ username: '', status: '', email: '' });
  const [initialUserData, setInitialUserData] = useState({});
  const [newAvatarFile, setNewAvatarFile] = useState(null);
  const [previewAvatar, setPreviewAvatar] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);
  const currentUser = auth.currentUser;

  // Form state'leri
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [formError, setFormError] = useState('');

  // --- EFFECT'LER ---
  useEffect(() => {
    if (isOpen && currentUser) {
      setIsLoading(true);
      const userRef = ref(db, `users/${currentUser.uid}`);
      get(userRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            const dbData = snapshot.val();
            const data = {
                username: dbData.username || '',
                status: dbData.status || '',
                email: dbData.email || currentUser.email,
                avatar: dbData.avatar || ''
            };
            setUserData(data);
            setInitialUserData(data); 
            setPreviewAvatar(data.avatar);
            setNewEmail(data.email);
          }
        })
        .catch(error => console.error("Kullanıcı verisi alınamadı:", error))
        .finally(() => setIsLoading(false));
    } else if (!isOpen) {
      resetAllState();
    }
  }, [isOpen, currentUser]);
  
  // --- FONKSİYONLAR ---
  const resetAllState = () => {
    setView('main');
    setNewAvatarFile(null);
    setPreviewAvatar('');
    setIsSaving(false);
    setFormError('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  // --- DEĞİŞİKLİK BURADA ---
  // GIF önizlemesini desteklemek için FileReader kullanıldı.
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewAvatarFile(file); // Yüklenecek dosyayı state'te tutmaya devam et

      const reader = new FileReader();
      reader.onload = () => {
        // reader.result, dosyanın base64 formatındaki Data URL'ini içerir.
        // Bu format, animasyonlu GIF'lerin <img /> etiketinde çalışmasını sağlar.
        setPreviewAvatar(reader.result);
      };
      reader.readAsDataURL(file); // Okuma işlemini başlat
    }
  };
  // --- DEĞİŞİKLİK SONU ---

  const handleProfileUpdate = async () => {
    setIsSaving(true);
    try {
        const updatesPayload = {};
        if (userData.username !== initialUserData.username) updatesPayload.username = userData.username;
        if (userData.status !== initialUserData.status) updatesPayload.status = userData.status;

        if (newAvatarFile) {
            const cloudinaryResponse = await uploadToCloudinary(newAvatarFile, { folder: 'avatars' });
            updatesPayload.avatarUrl = cloudinaryResponse.url;
        }
      
        if (Object.keys(updatesPayload).length > 0) {
            await updateUserProfile(currentUser.uid, updatesPayload);
        }
      
        alert("Profil başarıyla güncellendi!");
        onClose();
    } catch (error) {
        console.error("Profil güncelleme hatası:", error);
        alert(`Profil güncellenirken bir hata oluştu: ${error.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!newEmail || !currentPassword) {
      setFormError("Lütfen tüm alanları doldurun.");
      return;
    }
    setIsSaving(true);
    try {
      await changeUserEmail(currentPassword, newEmail);
      alert("E-posta adresiniz başarıyla güncellendi!");
      setView('main'); 
      setInitialUserData(prev => ({...prev, email: newEmail})); 
      onClose();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSaving(false);
      setCurrentPassword('');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (newPassword !== confirmPassword) {
      setFormError("Yeni şifreler eşleşmiyor.");
      return;
    }
    if (!currentPassword || !newPassword) {
        setFormError("Lütfen tüm alanları doldurun.");
        return;
    }
    setIsSaving(true);
    try {
      await changeUserPassword(currentPassword, newPassword);
      alert("Şifreniz başarıyla değiştirildi!");
      setView('main');
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSaving(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  // --- RENDER FONKSİYONLARI ---
  const renderMainView = () => (
    <>
      <div className={styles.avatarSection}>
        <img src={previewAvatar || '/assets/icon.png'} alt="Avatar Önizleme" className={styles.avatarPreview} />
        <input type="file" accept="image/*,image/gif" ref={fileInputRef} onChange={handleAvatarChange} style={{ display: 'none' }} />
        <button className={styles.secondaryBtn} onClick={() => fileInputRef.current.click()} disabled={isSaving}>Fotoğraf Değiştir</button>
      </div>
      <div className={styles.inputSection}>
        <label htmlFor="username">Kullanıcı Adı</label>
        <input id="username" type="text" value={userData.username} onChange={(e) => setUserData({ ...userData, username: e.target.value })} disabled={isSaving} />
        <label htmlFor="status">Durum Mesajı</label>
        <input id="status" type="text" placeholder="Bir durum mesajı belirle..." value={userData.status || ''} onChange={(e) => setUserData({ ...userData, status: e.target.value })} disabled={isSaving} />
        <label htmlFor="email">E-posta</label>
        <input id="email" type="email" value={userData.email} readOnly />
      </div>
      <div className={styles.formActions}>
        <button className={styles.secondaryBtn} onClick={() => setView('changeEmail')} disabled={isSaving}>E-postayı Değiştir</button>
        <button className={styles.secondaryBtn} onClick={() => setView('changePassword')} disabled={isSaving}>Şifreyi Değiştir</button>
        <button className={styles.primaryBtn} onClick={handleProfileUpdate} disabled={isSaving}>
            {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
        </button>
      </div>
    </>
  );

  const renderChangeEmailView = () => (
    <form onSubmit={handleEmailSubmit}>
      <div className={styles.subHeader}>
        <button type="button" className={styles.backBtn} onClick={() => setView('main')} disabled={isSaving}><IoArrowBack size={24} /></button>
        <h3>E-postayı Değiştir</h3>
      </div>
      <div className={styles.inputSection}>
        <label htmlFor="newEmail">Yeni E-posta Adresi</label>
        <input id="newEmail" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required disabled={isSaving} />
        <label htmlFor="currentPasswordEmail">Mevcut Şifreniz</label>
        <input id="currentPasswordEmail" type="password" placeholder="Onay için şifrenizi girin" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required disabled={isSaving} />
      </div>
      {formError && <p className={styles.errorMessage}>{formError}</p>}
      <div className={styles.formActions}>
        <button type="submit" className={styles.primaryBtn} disabled={isSaving}>
            {isSaving ? 'Güncelleniyor...' : 'E-postayı Güncelle'}
        </button>
      </div>
    </form>
  );

  const renderChangePasswordView = () => (
    <form onSubmit={handlePasswordSubmit}>
        <div className={styles.subHeader}>
            <button type="button" className={styles.backBtn} onClick={() => setView('main')} disabled={isSaving}><IoArrowBack size={24} /></button>
            <h3>Şifreyi Değiştir</h3>
        </div>
        <div className={styles.inputSection}>
            <label htmlFor="currentPassword">Mevcut Şifre</label>
            <input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required disabled={isSaving} />
            <label htmlFor="newPassword">Yeni Şifre</label>
            <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required disabled={isSaving} />
            <label htmlFor="confirmPassword">Yeni Şifre (Tekrar)</label>
            <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={isSaving} />
        </div>
        {formError && <p className={styles.errorMessage}>{formError}</p>}
        <div className={styles.formActions}>
            <button type="submit" className={styles.primaryBtn} disabled={isSaving}>
                {isSaving ? 'Kaydediliyor...' : 'Şifreyi Değiştir'}
            </button>
        </div>
    </form>
  );

  // --- ANA RENDER ---
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalCloseBtn} onClick={onClose} disabled={isSaving}><IoClose size={28} /></button>
        
        {isLoading ? (
          <div className={styles.loader}>Yükleniyor...</div>
        ) : (
          <div className={styles.settingsContent}>
            {view === 'main' && renderMainView()}
            {view === 'changeEmail' && renderChangeEmailView()}
            {view === 'changePassword' && renderChangePasswordView()}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfileSettingsModal;