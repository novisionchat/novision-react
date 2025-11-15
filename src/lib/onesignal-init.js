// --- DOSYA: src/lib/onesignal-init.js (HATA AYIKLAMA SÜRÜMÜ) ---

import { getDatabase, ref, set } from "firebase/database";

// Fonksiyonu daha detaylı loglama yapacak şekilde güncelliyoruz
const savePlayerIdToDatabase = (userId, playerId) => {
  console.log("--- savePlayerIdToDatabase fonksiyonu tetiklendi ---");

  if (!userId || !playerId) {
    console.error("HATA: userId veya playerId EKSİK! Yazma işlemi yapılamadı.", { userId, playerId });
    return;
  }

  console.log(`Firebase'e yazma hazırlığı yapılıyor...`);
  console.log(` -> Hedef Yol: users/${userId}/playerIds/${playerId}`);
  console.log(` -> Gönderilen Değer: true`);

  const db = getDatabase();
  const playerIdRef = ref(db, `users/${userId}/playerIds/${playerId}`);

  set(playerIdRef, true)
    .then(() => {
      // Bu mesajı görüyorsanız, işlem BAŞARILI olmuştur.
      console.log(`✅ BAŞARIYLA YAZILDI! Player ID (${playerId}) veritabanına eklendi.`);
    })
    .catch((error) => {
      // Bu mesajı görüyorsanız, Firebase yazma iznini REDDETMİŞTİR veya başka bir hata vardır.
      console.error("❌ HATA YAKALANDI! Firebase'e yazma işlemi BAŞARISIZ OLDU.");
      console.error(" -> Alınan Hata Kodu:", error.code);
      console.error(" -> Hata Mesajı:", error.message);
      console.error(" -> Tüm Hata Objesi:", error);
    });
};


// Bu fonksiyonda değişiklik yok, olduğu gibi kalıyor
export const initializeOneSignal = (userId) => {
  if (!userId) return;

  window.OneSignal = window.OneSignal || [];
  const OneSignal = window.OneSignal;

  OneSignal.push(async function() {
    await OneSignal.init({
      appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
    });
    
    console.log("OneSignal SDK başarıyla başlatıldı.");

    OneSignal.User.PushSubscription.addEventListener('change', function(change) {
        console.log("Abonelik durumu değişti:", change);
        if (change.current.isSubscribed) {
            const playerId = change.current.id;
            if (playerId) {
                console.log("Değişiklik yakalandı! Yeni Player ID:", playerId);
                savePlayerIdToDatabase(userId, playerId);
            }
        }
    });

    const isSubscribed = OneSignal.User.PushSubscription.isSubscribed;
    if (isSubscribed) {
        const playerId = OneSignal.User.PushSubscription.id;
        if (playerId) {
            console.log("Kullanıcı zaten abone. Player ID:", playerId);
            savePlayerIdToDatabase(userId, playerId);
        }
    } else {
        console.log("Kullanıcı abone değil, izin isteniyor...");
        OneSignal.Slidedown.promptPush();
    }
  });
};

export const cleanupOneSignal = () => {};