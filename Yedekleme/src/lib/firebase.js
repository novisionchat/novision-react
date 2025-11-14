// src/lib/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

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

// --- YENİ HATA AYIKLAMA LOGLARI ---
console.log("Firebase SDK başarıyla başlatıldı.");
console.log("Firebase App:", app);
console.log("Firebase Auth:", auth);
console.log("Firebase Database:", db);

// Veritabanı bağlantısını test etmek için basit bir okuma işlemi
// Bu, Firebase kurallarınızın en üst seviyesinde okuma izni gerektirebilir.
// Eğer '.read': 'auth != null' ise, oturum açmış kullanıcılar için çalışır.
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