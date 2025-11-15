// --- DOSYA: src/lib/onesignal-init.js (NİHAİ, EN BASİT VE KESİN ÇÖZÜM) ---

import { getDatabase, ref, set } from "firebase/database";

// Veritabanı fonksiyonumuz doğru, olduğu gibi kalıyor.
const savePlayerIdToDatabase = (userId, playerId) => {
  if (!userId || !playerId) return;
  const db = getDatabase();
  const playerIdRef = ref(db, `users/${userId}/playerIds/${playerId}`);
  set(playerIdRef, true)
    .then(() => console.log('OneSignal Player ID başarıyla kaydedildi:', playerId))
    .catch((error) => console.error('OneSignal Player ID kaydedilirken hata oluştu:', error));
};

// --- ANA FONKSİYONUN EN SAĞLAM VE EN BASİT HALİ ---
export const initializeOneSignal = (userId) => {
  if (!userId) return;

  // Global OneSignal nesnesini ve kuyruğunu hazırlıyoruz.
  window.OneSignal = window.OneSignal || [];
  const OneSignal = window.OneSignal;

  // Tek bir `push` komutu ile her şeyi hallediyoruz.
  OneSignal.push(function() {
    // Adım 1: SDK'yı başlat.
    OneSignal.init({
      appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
    });
    console.log("OneSignal init komutu gönderildi.");

    // Adım 2: SDK'nın "Ben tamamen hazırım" demesini bekle.
    // Bu, tüm zamanlama sorunlarını çözen sihirli olaydır.
    OneSignal.on('sdkBasicallyReady', async function() {
      console.log('OneSignal SDK tamamen hazır!');

      // SDK hazır olduğuna göre, artık Player ID'yi güvenle alabiliriz.
      const playerId = await OneSignal.getUserId();
      if (playerId) {
        console.log("Mevcut Player ID bulundu:", playerId);
        savePlayerIdToDatabase(userId, playerId);
      }
    });

    // Adım 3: Kullanıcı gelecekte bildirim iznini değiştirirse diye dinleyici ekle.
    OneSignal.on('subscriptionChange', async function(isSubscribed) {
      if (isSubscribed) {
        // Kullanıcı yeni abone olduysa, Player ID'yi al ve kaydet.
        const playerId = await OneSignal.getUserId();
        if (playerId) {
          console.log("Kullanıcı yeni abone oldu. Player ID:", playerId);
          savePlayerIdToDatabase(userId, playerId);
        }
      }
    });
  });
};

export const cleanupOneSignal = () => {
  // Bu fonksiyon şimdilik boş kalabilir.
};