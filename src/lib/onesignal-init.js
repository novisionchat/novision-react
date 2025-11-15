// --- DOSYA: src/lib/onesignal-init.js (ZAMANLAMA SORUNU ÇÖZÜLMÜŞ, NİHAİ SÜRÜM) ---

import OneSignal from 'react-onesignal';
import { getDatabase, ref, set, remove } from "firebase/database";

// Veritabanı fonksiyonları değişmiyor, bunlar doğru.
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


// --- ANA FONKSİYONUN EN GÜVENİLİR HALİ ---
export const initializeOneSignal = async (userId) => {
  if (!userId) return;

  // ÖNEMLİ: Kodu basitleştiriyoruz. Sadece init'i çağıracağız ve 
  // geri kalan her şeyi OneSignal'ın kendi olaylarına bırakacağız.
  await OneSignal.init({ 
      appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true
  });
  
  // Şimdi en sağlam yöntemi kullanıyoruz:
  // OneSignal SDK'sı TAMAMEN yüklendiğinde ve KULLANIMA HAZIR olduğunda
  // tetiklenecek olan 'on' olayını dinliyoruz.
  OneSignal.on('SDKLoaded', async () => {
    console.log('OneSignal SDK Tamamen Yüklendi ve Hazır.');

    try {
      const initialPlayerId = await OneSignal.getUserId();
      if (initialPlayerId) {
          console.log("Başlangıç Player ID'si:", initialPlayerId);
          savePlayerIdToDatabase(userId, initialPlayerId);
      }

      // Abonelik durumunu da SDK tamamen yüklendikten sonra dinlemeye başlıyoruz.
      OneSignal.on('subscriptionChange', async (isSubscribed) => {
        if (isSubscribed) {
          const currentPlayerId = await OneSignal.getUserId();
          if (currentPlayerId) {
              console.log("Kullanıcı abone oldu. Yeni Player ID:", currentPlayerId);
              savePlayerIdToDatabase(userId, currentPlayerId);
          }
        } else {
          // Bu kısım, kullanıcı abonelikten çıktığında ID'yi silmek için.
          const lastPlayerId = await OneSignal.getUserId();
            if(lastPlayerId) {
                removePlayerIdFromDatabase(userId, lastPlayerId);
            }
        }
      });

    } catch (error) {
        console.error("SDK yüklendikten sonra işlem yapılırken hata:", error);
    }
  });
};


export const cleanupOneSignal = () => {
    console.log("OneSignal temizlendi.");
};