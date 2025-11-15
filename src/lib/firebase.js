// src/lib/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase, ref, onValue } from "firebase/database"; // ref ve onValue import edildi

// Orijinal projenizdeki yapılandırma bilgileri
const firebaseConfig = {
  apiKey: "AIzaSyCHssHsg9yNrCNscn3P95ylkfJ-pRCSen4",
  authDomain: "novisionpro-aefde.firebaseapp.com",
  databaseURL: "https://novisionpro-aefde-default-rtdb.firebaseio.com",
  projectId: "novisionpro-aefde",
  storageBucket: "novisionpro-aefde.appspot.com",
  messagingSenderId: "784550739054",
  appId: "1:784550739054:web:23cc2c8776586f9c877a7f"
};

// Firebase uygulamasını başlat
const app = initializeApp(firebaseConfig);

// Diğer modüllerin kullanabilmesi için kimlik doğrulama ve veritabanı servislerini export et
export const auth = getAuth(app);
export const db = getDatabase(app);
export { app }; // <-- YENİ EKLENDİ: Messaging servisi için 'app' objesini export ediyoruz

// --- HATA AYIKLAMA LOGLARI ---
console.log("Firebase SDK başarıyla başlatıldı.");

// Veritabanı bağlantısını test etmek için basit bir okuma işlemi
try {
  const testRef = ref(db, '.info/connected');
  onValue(testRef, (snapshot) => {
    console.log("[FIREBASE DEBUG] Veritabanı bağlantı durumu:", snapshot.val() ? "BAĞLI" : "BAĞLANTI KESİK");
  }, (error) => {
    console.error("[FIREBASE DEBUG] Veritabanı bağlantı testi hatası:", error);
  });
} catch (e) {
  console.error("[FIREBASE DEBUG] Firebase bağlantı testi başlatılamadı:", e);
}