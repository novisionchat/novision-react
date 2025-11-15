// --- DOSYA: src/lib/onesignal-init.js (YAZIM HATASI DÜZELTİLMİŞ NİHAİ SÜRÜM) ---

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
  if (!userId) return;

  try {
    // --- DÜZELTME BURADA: ONESIONAL -> ONESIGNAL ---
    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID; 

    console.log("OneSignal'ı başlatmaya çalışıyorum. Kullanılacak App ID:", appId);
    if (!appId) {
        console.error("KRİTİK HATA: VITE_ONESIGNAL_APP_ID bulunamadı! Lütfen Netlify ayarlarınızı kontrol edin.");
        return;
    }

    // `react-onesignal` kütüphanesinin .init() fonksiyonunu çağırıyoruz.
    await OneSignal.init({ 
        appId: appId,
        allowLocalhostAsSecureOrigin: true
    });
    
    // Şimdi, tam özellikli global `window.OneSignal` nesnesini kullanıyoruz.
    window.OneSignal.push(async function() {
      console.log("Global OneSignal SDK hazır ve çalışıyor.");

      const initialPlayerId = await window.OneSignal.getUserId();
      if (initialPlayerId) {
          console.log("Global OneSignal Player ID'si:", initialPlayerId);
          savePlayerIdToDatabase(userId, initialPlayerId);
      }

      window.OneSignal.on('subscriptionChange', async function(isSubscribed) {
        if (isSubscribed) {
          const currentPlayerId = await window.OneSignal.getUserId();
          if (currentPlayerId) {
              console.log("Kullanıcı abone oldu. Yeni Player ID:", currentPlayerId);
              savePlayerIdToDatabase(userId, currentPlayerId);
          }
        } else {
          // Bu kısım, kullanıcı abonelikten çıktığında ID'yi silmek için.
          const lastPlayerId = await window.OneSignal.getUserId();
            if(lastPlayerId) {
                removePlayerIdFromDatabase(userId, lastPlayerId);
            }
        }
      });
    });

  } catch (error) {
    console.error("OneSignal başlatılırken hata oluştu:", error);
  }
};

export const cleanupOneSignal = () => {
    console.log("OneSignal temizlendi.");
};