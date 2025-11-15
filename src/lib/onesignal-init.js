// --- DOSYA: src/lib/onesignal-init.js (NİHAİ, DOĞRU KUYRUK MANTIĞIYLA) ---

import { getDatabase, ref, set, remove } from "firebase/database";

// Veritabanı fonksiyonları doğru, olduğu gibi kalıyor.
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

// --- ANA FONKSİYONUN EN SAĞLAM VE EN BASİT HALİ ---
export const initializeOneSignal = (userId) => {
  if (!userId) return;

  window.OneSignal = window.OneSignal || [];
  const OneSignal = window.OneSignal;

  // KOMUT 1: SDK'yı başlat.
  OneSignal.push(function() {
    OneSignal.init({
      appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
    });
    console.log("OneSignal init komutu kuyruğa eklendi.");
  });

  // KOMUT 2: SDK başlatıldıktan sonra çalışacak olan olay dinleyicilerini ekle.
  // Bu komut, init bittikten sonra çalışacağı için zamanlama hatası asla olmaz.
  OneSignal.push(async function() {
    console.log("Olay dinleyicileri kuyruğa eklendi.");

    // Mevcut durumu kontrol et
    const isSubscribed = await OneSignal.isPushNotificationsEnabled();
    if (isSubscribed) {
        const playerId = await OneSignal.getUserId();
         if (playerId) {
            console.log("Kullanıcı zaten abone. Player ID:", playerId);
            savePlayerIdToDatabase(userId, playerId);
         }
    }

    // Abonelik durumu gelecekte değişirse dinle
    OneSignal.on('subscriptionChange', async function(isSubscribedNow) {
      if (isSubscribedNow) {
        const playerId = await OneSignal.getUserId();
        if (playerId) {
            console.log("Kullanıcı yeni abone oldu. Player ID:", playerId);
            savePlayerIdToDatabase(userId, playerId);
        }
      } else {
          const playerId = await OneSignal.getUserId();
           if(playerId) {
               console.log("Kullanıcı abonelikten çıktı.");
               removePlayerIdFromDatabase(userId, playerId);
           }
      }
    });
  });
};

export const cleanupOneSignal = () => {
    // Bu fonksiyon şimdilik boş kalabilir.
};