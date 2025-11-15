// --- GÜNCELLENEN DOSYA: src/lib/onesignal-init.js (Test Kodu Eklendi) ---

import OneSignal from 'react-onesignal';
import { getDatabase, ref, set, remove } from "firebase/database";

const savePlayerIdToDatabase = (userId, playerId) => {
  if (!userId || !playerId) return;
  const db = getDatabase();
  const playerIdRef = ref(db, `users/${userId}/playerIds/${playerId}`);
  set(playerIdRef, true)
    .then(() => console.log('OneSignal Player ID başarıyla kaydedildi:', playerId))
    .catch((error) => console.error('OneSignal Player ID kaydedilirken hata oluştu:', error));
};

const removePlayerIdFromDatabase = (userId, playerId) => {
    if (!userId || !playerId) return;
    const db = getDatabase();
    const playerIdRef = ref(db, `users/${userId}/playerIds/${playerId}`);
    remove(playerIdRef)
      .then(() => console.log('Eski OneSignal Player ID silindi:', playerId))
      .catch((error) => console.error('Eski Player ID silinirken hata oluştu:', error));
};

export const initializeOneSignal = async (userId) => {
  if (!userId || OneSignal.isInitialized()) return;

  try {
    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;

    // --- EN ÖNEMLİ TEST KODU BURADA ---
    console.log("OneSignal'ı başlatmaya çalışıyorum. Kullanılacak App ID:", appId);
    if (!appId) {
        console.error("KRİTİK HATA: VITE_ONESIGNAL_APP_ID bulunamadı! Lütfen Netlify ayarlarınızı kontrol edin.");
        return; // App ID yoksa devam etme
    }
    // --- TEST KODU BİTİŞ ---

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