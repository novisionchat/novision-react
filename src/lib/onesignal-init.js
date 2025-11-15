// --- DOSYA: src/lib/onesignal-init.js (EN GÜVENİLİR VE NİHAİ SÜRÜM) ---

import OneSignal from 'react-onesignal'; // Bunu SADECE .init() ile betiği yüklemek için kullanıyoruz
import { getDatabase, ref, set, remove } from "firebase/database";

// Veritabanı fonksiyonlarımız aynı kalıyor, bunlar doğru.
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

// --- ANA FONKSİYONUN TAMAMEN YENİDEN YAZILMIŞ HALİ ---
export const initializeOneSignal = async (userId) => {
  if (!userId) return;

  // ÖNEMLİ DEĞİŞİKLİK: 'react-onesignal' kütüphanesi tarafından oluşturulan
  // global `window.OneSignal` nesnesinin hazır olmasını bekliyoruz.
  await OneSignal.init({ 
      appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true
  });
  
  // Şimdi, kütüphanenin kısıtlı nesnesi yerine, tam özellikli global nesneyi kullanıyoruz.
  window.OneSignal.push(async function() {
    console.log("Global OneSignal SDK hazır ve çalışıyor.");

    const initialPlayerId = await window.OneSignal.getUserId();
    if (initialPlayerId) {
        console.log("Global OneSignal Player ID'si:", initialPlayerId);
        savePlayerIdToDatabase(userId, initialPlayerId);
    }

    // Abonelik değişikliklerini de global nesne üzerinden dinliyoruz.
    window.OneSignal.on('subscriptionChange', async function(isSubscribed) {
      if (isSubscribed) {
        const currentPlayerId = await window.OneSignal.getUserId();
        if (currentPlayerId) {
            console.log("Kullanıcı abone oldu. Yeni Player ID:", currentPlayerId);
            savePlayerIdToDatabase(userId, currentPlayerId);
        }
      } else {
        const lastPlayerId = await window.OneSignal.getUserId();
        if(lastPlayerId) {
            console.log("Kullanıcı abonelikten çıktı.");
            removePlayerIdFromDatabase(userId, lastPlayerId);
        }
      }
    });
  });
};


export const cleanupOneSignal = () => {
    console.log("OneSignal temizlendi.");
};