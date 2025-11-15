// --- DOSYA: src/lib/onesignal-init.js (DOĞRU VE NİHAİ SÜRÜM) ---

import OneSignal from 'react-onesignal';
import { getDatabase, ref, set, remove } from "firebase/database";

// Bu fonksiyon, alınan Player ID'sini veritabanına yazar.
const savePlayerIdToDatabase = (userId, playerId) => {
  if (!userId || !playerId) return;
  const db = getDatabase();
  const playerIdRef = ref(db, `users/${userId}/playerIds/${playerId}`);
  
  set(playerIdRef, true)
    .then(() => console.log('OneSignal Player ID başarıyla kaydedildi:', playerId))
    .catch((error) => console.error('OneSignal Player ID kaydedilirken hata oluştu:', error));
};

// Bu fonksiyon, eski veya geçersiz Player ID'yi veritabanından siler.
const removePlayerIdFromDatabase = (userId, playerId) => {
    if (!userId || !playerId) return;
    const db = getDatabase();
    const playerIdRef = ref(db, `users/${userId}/playerIds/${playerId}`);
    
    remove(playerIdRef)
      .then(() => console.log('Eski OneSignal Player ID silindi:', playerId))
      .catch((error) => console.error('Eski Player ID silinirken hata oluştu:', error));
};

// Bu ana fonksiyonu App.jsx'ten çağıracağız.
export const initializeOneSignal = async (userId) => {
  if (!userId) return;
  
  // ÖNEMLİ: Kütüphane kendi içinde tekrar başlatmayı engeller.
  // Bu yüzden 'isInitialized' kontrolünü kaldırdık.
  
  try {
    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;

    // Konsolda App ID'yi kontrol etmeye devam ediyoruz, bu faydalı bir test.
    console.log("OneSignal'ı başlatmaya çalışıyorum. Kullanılacak App ID:", appId);
    if (!appId) {
        console.error("KRİTİK HATA: VITE_ONESIGNAL_APP_ID bulunamadı! Lütfen Netlify ayarlarınızı kontrol edin.");
        return;
    }

    await OneSignal.init({
      appId: appId,
      allowLocalhostAsSecureOrigin: true
    });

    const initialPlayerId = await OneSignal.getUserId();
    if (initialPlayerId) {
        console.log("OneSignal başlangıç Player ID'si:", initialPlayerId);
        savePlayerIdToDatabase(userId, initialPlayerId);
    }
    
    OneSignal.on('subscriptionChange', async (isSubscribed) => {
        const currentPlayerId = await OneSignal.getUserId();
        if (isSubscribed && currentPlayerId) {
            console.log("Kullanıcı bildirimlere abone oldu. Yeni Player ID:", currentPlayerId);
            savePlayerIdToDatabase(userId, currentPlayerId);
        } else if (!isSubscribed && initialPlayerId) {
            console.log("Kullanıcı abonelikten çıktı.");
            removePlayerIdFromDatabase(userId, initialPlayerId);
        }
    });

  } catch (error) {
    console.error("OneSignal başlatılırken hata oluştu:", error);
  }
};

export const cleanupOneSignal = () => {
    console.log("OneSignal temizlendi.");
};