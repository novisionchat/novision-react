// --- DOSYA: src/lib/onesignal-init.js (KÜTÜPHANESİZ, EN TEMİZ VE NİHAİ SÜRÜM) ---

import { getDatabase, ref, set, remove } from "firebase/database";

// Veritabanı fonksiyonları aynı kalıyor.
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

// --- ANA FONKSİYONUN EN BASİT VE EN GÜVENİLİR HALİ ---
export const initializeOneSignal = (userId) => {
  if (!userId) return;

  // Global `window.OneSignal` nesnesinin var olmasını sağlıyoruz.
  window.OneSignal = window.OneSignal || [];
  
  // `push` metodu, SDK'nın tam olarak yüklenmesini bekler ve sonra içindeki fonksiyonu çalıştırır.
  // Bu, tüm zamanlama sorunlarını ortadan kaldırır.
  window.OneSignal.push(function() {
    window.OneSignal.init({
      appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
    });

    console.log("OneSignal SDK başarıyla başlatıldı.");

    // SDK tamamen hazır olduğunda, işlemleri yapmaya başlıyoruz.
    window.OneSignal.on('subscriptionChange', async function(isSubscribed) {
      if (isSubscribed) {
        const playerId = await window.OneSignal.getUserId();
        if (playerId) {
            console.log("Kullanıcı abone oldu. Player ID:", playerId);
            savePlayerIdToDatabase(userId, playerId);
        }
      } else {
          const playerId = await window.OneSignal.getUserId();
           if(playerId) {
               console.log("Kullanıcı abonelikten çıktı.");
               removePlayerIdFromDatabase(userId, playerId);
           }
      }
    });

    // Sayfa yüklendiğinde mevcut durumu kontrol et
    async function checkSubscription() {
        const isSubscribed = await window.OneSignal.isPushNotificationsEnabled();
        if (isSubscribed) {
            const playerId = await window.OneSignal.getUserId();
             if (playerId) {
                console.log("Kullanıcı zaten aboneymiş. Player ID:", playerId);
                savePlayerIdToDatabase(userId, playerId);
             }
        }
    }
    checkSubscription();
  });
};

export const cleanupOneSignal = () => {
    // Bu fonksiyon şimdilik boş kalabilir.
};