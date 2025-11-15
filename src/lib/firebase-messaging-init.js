// src/lib/firebase-messaging-init.js

import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { db, app } from './firebase'; // `app` objesini firebase.js'den import ediyoruz
import { ref, set } from "firebase/database";

export const requestNotificationPermission = async (userId, showToast) => {
    if (!userId) return;

    try {
        const messaging = getMessaging(app);

        // ÖNEMLİ: Firebase Console -> Proje Ayarları -> Cloud Messaging -> Web Push Sertifikaları'ndan
        // aldığınız VAPID Anahtar Çiftini buraya yapıştırın.
        const vapidKey = "BIUpCUxoNieh6ES1l1CitiyAbl9lxniE6Nre5CB9Eu5EhguWUkERPg7m7qC7Y9ws972l8V7bxt8jtJntZFw3RRA"; 
        
        // Kullanıcıdan bildirim izni iste
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            console.log("Bildirim izni alındı.");
            // Cihaza özel FCM token'ını al
            const currentToken = await getToken(messaging, { vapidKey: vapidKey });

            if (currentToken) {
                console.log('Alınan FCM Token:', currentToken);
                // Token'ı kullanıcının veritabanı kaydına ekle
                const tokenRef = ref(db, `users/${userId}/fcmTokens/${currentToken}`);
                await set(tokenRef, true);
            } else {
                console.log('FCM Token alınamadı. Tarayıcı veya ayarlar desteklemiyor olabilir.');
            }
        } else {
            console.log("Bildirim izni verilmedi.");
        }

        // Uygulama ön plandayken (açıkken) gelen mesajları dinle
        onMessage(messaging, (payload) => {
            console.log('Ön plan mesajı alındı: ', payload);
            // Mesaj geldiğinde bir toast bildirimi göster
            if (showToast && payload.notification) {
                showToast(payload.notification.body, { title: payload.notification.title });
            }
        });

    } catch (error) {
        console.error('FCM başlatılırken veya token alınırken bir hata oluştu:', error);
    }
};