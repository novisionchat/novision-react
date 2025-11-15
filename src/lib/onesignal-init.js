// --- YENİ DOSYA: src/lib/onesignal-init.js ---

import OneSignal from 'react-onesignal';
import { getDatabase, ref, set, remove } from "firebase/database";

// Bu fonksiyon, alınan Player ID'sini veritabanına yazar.
// Backend'imizin beklediği gibi users -> userId -> playerIds -> playerId yapısında kaydeder.
const savePlayerIdToDatabase = (userId, playerId) => {
  if (!userId || !playerId) return;
  const db = getDatabase();
  const playerIdRef = ref(db, `users/${userId}/playerIds/${playerId}`);
  
  set(playerIdRef, true)
    .then(() => console.log('OneSignal Player ID başarıyla kaydedildi:', playerId))
    .catch((error) => console.error('OneSignal Player ID kaydedilirken hata oluştu:', error));
};

// Bu fonksiyon, eski veya geçersiz Player ID'yi veritabanından siler.
const removePlayerIdFromDatabase = (userId, playerId) => {
    if (!userId || !playerId) return;
    const db = getDatabase();
    const playerIdRef = ref(db, `users/${userId}/playerIds/${playerId}`);
    
    remove(playerIdRef)
      .then(() => console.log('Eski OneSignal Player ID silindi:', playerId))
      .catch((error) => console.error('Eski Player ID silinirken hata oluştu:', error));
};


// Bu ana fonksiyonu App.jsx'ten çağıracağız.
export const initializeOneSignal = async (userId) => {
  if (!userId) return;
  // OneSignal zaten başlatıldıysa tekrar başlatma
  if (OneSignal.isInitialized()) {
    return;
  }

  try {
    // OneSignal'ı App ID'miz ile başlatıyoruz.
    await OneSignal.init({
      // .env dosyanızda VITE_ONESIGNAL_APP_ID olarak tanımlanmalıdır.
      appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true // Lokal testler için gerekli
    });

    // Kullanıcının mevcut abonelik durumunu ve Player ID'sini al
    const initialPlayerId = await OneSignal.getUserId();
    if (initialPlayerId) {
        console.log("OneSignal başlangıç Player ID'si:", initialPlayerId);
        savePlayerIdToDatabase(userId, initialPlayerId);
    }
    
    // Abonelik durumu değiştiğinde (örneğin, kullanıcı izin verdiğinde veya iptal ettiğinde)
    // bu olay tetiklenir.
    OneSignal.on('subscriptionChange', async (isSubscribed) => {
        const currentPlayerId = await OneSignal.getUserId();
        if (isSubscribed && currentPlayerId) {
            // Kullanıcı bildirimlere yeni izin verdiyse
            console.log("Kullanıcı bildirimlere abone oldu. Yeni Player ID:", currentPlayerId);
            savePlayerIdToDatabase(userId, currentPlayerId);
        } else if (!isSubscribed && initialPlayerId) {
            // Kullanıcı bildirim iznini iptal ettiyse
            console.log("Kullanıcı abonelikten çıktı.");
            removePlayerIdFromDatabase(userId, initialPlayerId);
        }
    });

  } catch (error) {
    console.error("OneSignal başlatılırken hata oluştu:", error);
  }
};

// Kullanıcı çıkış yaptığında Player ID'yi temizlemek için
export const cleanupOneSignal = () => {
    // Bu fonksiyon, gelecekte kullanıcı çıkış yaptığında
    // OneSignal ile ilgili temizlik işlemleri için kullanılabilir.
    console.log("OneSignal temizlendi.");
};