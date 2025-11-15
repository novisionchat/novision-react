// --- DOSYA: src/lib/onesignal-init.js (DAHA DETAYLI HATA AYIKLAMA SÜRÜMÜ) ---

// savePlayerIdToDatabase fonksiyonu aynı kalabilir, bir önceki mesajdaki
// detaylı versiyonu kullanıyorsanız o en iyisidir.

import { getDatabase, ref, set } from "firebase/database";

const savePlayerIdToDatabase = (userId, playerId) => {
  if (!userId || !playerId) {
    console.error("HATA: userId veya playerId EKSİK! Yazma işlemi yapılamadı.", { userId, playerId });
    return;
  }
  const db = getDatabase();
  const playerIdRef = ref(db, `users/${userId}/playerIds/${playerId}`);
  set(playerIdRef, true)
    .then(() => console.log('✅ BAŞARIYLA YAZILDI! Player ID veritabanına eklendi:', playerId))
    .catch((error) => console.error('❌ HATA YAKALANDI! Firebase\'e yazma işlemi BAŞARISIZ OLDU:', error));
};


// --- ANA DEĞİŞİKLİK BU FONKSİYONDA ---
export const initializeOneSignal = (userId) => {
  if (!userId) return;

  window.OneSignal = window.OneSignal || [];
  const OneSignal = window.OneSignal;

  OneSignal.push(async function() {
    // Adım 1: .env dosyasının doğru okunduğundan emin olalım.
    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
    if (!appId) {
        console.error("KRİTİK HATA: .env dosyasından VITE_ONESIGNAL_APP_ID okunamadı! Lütfen .env.local dosyanızı ve adlandırmayı kontrol edin.");
        return;
    }
    console.log("Kullanılacak OneSignal App ID:", appId);

    await OneSignal.init({
      appId: appId,
      allowLocalhostAsSecureOrigin: true,
    });
    
    console.log("OneSignal SDK başarıyla başlatıldı.");

    // Adım 2: Dinleyiciyi daha detaylı loglama yapacak şekilde güncelliyoruz.
    OneSignal.User.PushSubscription.addEventListener('change', function(change) {
        console.log("--- ABONELİK DURUMU DEĞİŞİKLİĞİ ALGILANDI ---");
        
        // Gelen verinin içini detaylıca inceleyelim
        console.log("Önceki Durum (previous.isSubscribed):", change.previous.isSubscribed);
        console.log("Mevcut Durum (current.isSubscribed):", change.current.isSubscribed);
        console.log("Mevcut Player ID (current.id):", change.current.id);

        // Koşulumuzu kontrol edelim
        if (change.current.isSubscribed && change.current.id) {
            console.log("✅ Koşullar sağlandı. Player ID kaydediliyor...");
            savePlayerIdToDatabase(userId, change.current.id);
        } else {
            console.warn("⚠️ Koşullar sağlanmadı. 'isSubscribed' true değil veya 'id' boş. Kaydetme yapılmayacak.");
        }
        console.log("--- DEĞİŞİKLİK İŞLEME SONU ---");
    });

    // Adım 3: Mevcut durumu kontrol etme (bu kısım aynı kalıyor)
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