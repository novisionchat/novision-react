// --- DOSYA: src/lib/onesignal-init.js (NİHAİ VE ÇALIŞAN SÜRÜM) ---

import { getDatabase, ref, set } from "firebase/database";

// Bu fonksiyonda değişiklik yok, doğru çalışıyor.
const savePlayerIdToDatabase = (userId, playerId) => {
  if (!userId || !playerId) return;
  const db = getDatabase();
  const playerIdRef = ref(db, `users/${userId}/playerIds/${playerId}`);
  set(playerIdRef, true)
    .then(() => console.log('✅ BAŞARIYLA YAZILDI! Player ID veritabanına eklendi:', playerId))
    .catch((error) => console.error('❌ HATA YAKALANDI! Firebase\'e yazma işlemi BAŞARISIZ OLDU:', error));
};

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

    // Dinleyiciyi güncellenmiş ve daha sağlam bir mantıkla kuruyoruz.
    OneSignal.User.PushSubscription.addEventListener('change', function(change) {
        console.log("Abonelik durumu değişikliği algılandı.");
        
        // --- DEĞİŞEN KRİTİK SATIR ---
        // Artık isSubscribed'a güvenmiyoruz, doğrudan Player ID'nin varlığını kontrol ediyoruz.
        const newPlayerId = change.current.id;

        if (newPlayerId) {
            console.log("✅ Geçerli bir Player ID alındı:", newPlayerId);
            savePlayerIdToDatabase(userId, newPlayerId);
        } else {
            console.warn("⚠️ Player ID alınamadı, kaydetme yapılmayacak.");
        }
    });

    // Mevcut durumu kontrol ederken de aynı sağlam mantığı kullanıyoruz.
    const currentPlayerId = OneSignal.User.PushSubscription.id;
    if (currentPlayerId) {
        console.log("Kullanıcı zaten abone. Mevcut Player ID:", currentPlayerId);
        savePlayerIdToDatabase(userId, currentPlayerId);
    } else {
        console.log("Kullanıcı abone değil, izin isteniyor...");
        OneSignal.Slidedown.promptPush();
    }
  });
};

export const cleanupOneSignal = () => {};