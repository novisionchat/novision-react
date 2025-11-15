// --- DOSYA: src/lib/onesignal-init.js (DOĞRU v16 SÖZDİZİMİ İLE NİHAİ SÜRÜM) ---

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

// --- ANA FONKSİYONUN EN SAĞLAM VE EN DOĞRU HALİ ---
export const initializeOneSignal = (userId) => {
  if (!userId) return;

  // Global OneSignal kuyruğunu hazırlıyoruz.
  window.OneSignal = window.OneSignal || [];
  const OneSignal = window.OneSignal;

  // Tek bir `push` komutu ile tüm işlemleri kuyruğa alıyoruz.
  OneSignal.push(function() {
    // Adım 1: SDK'yı başlat.
    OneSignal.init({
      appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
    }).then(function() {
        console.log("OneSignal SDK başarıyla başlatıldı ve hazır.");
        
        // Adım 2: SDK hazır olduğunda, mevcut durumu kontrol et.
        const isSubscribed = OneSignal.User.PushSubscription.isSubscribed;
        if (isSubscribed) {
            const playerId = OneSignal.User.PushSubscription.id;
            if (playerId) {
                console.log("Kullanıcı zaten abone. Player ID:", playerId);
                savePlayerIdToDatabase(userId, playerId);
            }
        } else {
            // Kullanıcı abone değilse, bildirim izni isteme penceresini tetikle.
            // Bu, kullanıcı daha önce "Engelle" demediyse çalışır.
            OneSignal.Slidedown.promptPush();
        }

        // Adım 3: Kullanıcı gelecekte abonelik durumunu değiştirirse dinle.
        // YENİ VE DOĞRU YÖNTEM:
        OneSignal.User.PushSubscription.addEventListener('change', function(change) {
            console.log("Abonelik durumu değişti:", change);
            if (change.current.isSubscribed) {
                const playerId = change.current.id;
                if (playerId) {
                    console.log("Kullanıcı yeni abone oldu. Player ID:", playerId);
                    savePlayerIdToDatabase(userId, playerId);
                }
            }
        });
    });
  });
};

export const cleanupOneSignal = () => {
  // Bu fonksiyon şimdilik boş kalabilir.
};