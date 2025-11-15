// --- DOSYA: src/lib/onesignal-init.js (KESİN VE NİHAİ MANTIKSAL AKIŞ) ---

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

  window.OneSignal = window.OneSignal || [];
  const OneSignal = window.OneSignal;

  OneSignal.push(async function() {
    // Adım 1: SDK'yı başlat.
    await OneSignal.init({
      appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
    });
    
    console.log("OneSignal SDK başarıyla başlatıldı.");

    // Adım 2: ÖNCE dinleyiciyi kur. Bu, hiçbir değişikliği kaçırmamamızı garanti eder.
    OneSignal.User.PushSubscription.addEventListener('change', function(change) {
        console.log("Abonelik durumu değişti:", change);
        // Sadece yeni abonelik durumunda ID'yi alıp kaydediyoruz.
        if (change.current.isSubscribed) {
            const playerId = change.current.id;
            if (playerId) {
                console.log("Değişiklik yakalandı! Yeni Player ID:", playerId);
                savePlayerIdToDatabase(userId, playerId);
            }
        }
    });

    // Adım 3: Dinleyici hazır olduğuna göre, ŞİMDİ mevcut durumu kontrol et.
    const isSubscribed = OneSignal.User.PushSubscription.isSubscribed;
    if (isSubscribed) {
        // Kullanıcı zaten aboneymiş, ID'sini alıp kaydedelim.
        const playerId = OneSignal.User.PushSubscription.id;
        if (playerId) {
            console.log("Kullanıcı zaten abone. Player ID:", playerId);
            savePlayerIdToDatabase(userId, playerId);
        }
    } else {
        // Kullanıcı abone değilse, izin penceresini göster.
        // Kullanıcı "İzin Ver"e tıkladığında, yukarıdaki 'change' dinleyicisi bunu yakalayacak.
        console.log("Kullanıcı abone değil, izin isteniyor...");
        OneSignal.Slidedown.promptPush();
    }
  });
};

export const cleanupOneSignal = () => {
  // Bu fonksiyon şimdilik boş kalabilir.
};