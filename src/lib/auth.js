// src/lib/auth.js

import { auth, db } from './firebase'; // Az önce oluşturduğumuz dosyadan import ediyoruz
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { ref, set } from "firebase/database";

// Yeni kullanıcı kaydı
export async function registerUser(username, email, password) {
  if (!username || !email || !password) {
    throw new Error('Tüm alanlar doldurulmalıdır.');
  }
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    await updateProfile(user, { displayName: username });
    
    const userTag = Math.floor(1000 + Math.random() * 9000);
    const defaultAvatar = '/assets/icon.png'; // public klasöründeki yola göre güncelledik

    // Realtime Database'e kullanıcı bilgilerini kaydet
    await set(ref(db, 'users/' + user.uid), {
      uid: user.uid,
      username: username,
      email: email,
      tag: userTag,
      avatar: defaultAvatar,
    });
    
    // Arama için public indeksi oluştur
    await set(ref(db, 'userSearchIndex/' + user.uid), {
      username: username,
      tag: userTag,
      avatar: defaultAvatar,
    });

    // Başarılı olursa kullanıcı nesnesini döndür
    return user;

  } catch (error) {
    // Hata olursa, hatayı yakalayıp tekrar fırlatıyoruz ki bileşen bunu yakalayabilsin
    console.error("Kayıt Hatası:", error);
    throw error;
  }
}

// Kullanıcı girişi
export async function loginUser(email, password) {
  if (!email || !password) {
    throw new Error('E-posta ve şifre alanları boş bırakılamaz.');
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Giriş Hatası:", error);
    throw error;
  }
}

// Kullanıcı çıkışı (şimdiden ekleyelim)
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Çıkış Hatası:", error);
    throw error;
  }
}