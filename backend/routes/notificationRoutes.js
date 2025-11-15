const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// --- BAŞLANGIÇ: Firebase Admin SDK Kurulumu ---
try {
    // Render'daki ortam değişkeninden Base64 ile şifrelenmiş anahtarı alıyoruz.
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        const serviceAccount_b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
        const serviceAccountJson = Buffer.from(serviceAccount_b64, 'base64').toString('ascii');
        const serviceAccount = JSON.parse(serviceAccountJson);

        // .env dosyanızda DATABASE_URL olduğundan emin olun
        // Örn: DATABASE_URL="https://novisionpro-aefde-default-rtdb.firebaseio.com"
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.DATABASE_URL 
        });
        console.log("Firebase Admin SDK başarıyla başlatıldı.");
    } else {
        console.error("FIREBASE_SERVICE_ACCOUNT_BASE64 ortam değişkeni bulunamadı! Lütfen Render panelinden ekleyin.");
    }
} catch (error) {
    console.error("Firebase Admin SDK başlatılırken hata oluştu:", error);
}
// --- BİTİŞ: Firebase Admin SDK Kurulumu ---


router.post('/trigger', async (req, res) => {
    try {
        const { chatId, chatType, sender, message, groupName } = req.body;
        
        if (!chatId || !chatType || !sender || !message) {
            return res.status(400).json({ error: 'Eksik parametreler.' });
        }
        
        const db = admin.database();
        let recipientIds = [];

        // 1. Adım: Bildirim gönderilecek alıcıların ID'lerini belirle
        if (chatType === 'dm') {
            const otherUserId = chatId.replace(sender.uid, '').replace('_', '');
            recipientIds.push(otherUserId);
        } else if (chatType === 'group') {
            const membersSnapshot = await db.ref(`groups/${chatId}/members`).once('value');
            if (membersSnapshot.exists()) {
                // Gönderen kişi hariç tüm üyeleri al
                recipientIds = Object.keys(membersSnapshot.val()).filter(id => id !== sender.uid);
            }
        }

        if (recipientIds.length === 0) {
            return res.json({ success: true, message: 'Bildirim gönderilecek kimse bulunamadı.' });
        }

        // 2. Adım: Bildirim içeriğini oluştur
        const notificationPayload = {
            notification: {
                title: message.title,
                body: message.body,
                icon: message.icon || '/assets/icon.png'
            },
            webpush: {
                fcm_options: {
                    // Tıklandığında açılacak link
                    link: message.click_action || '/'
                }
            }
        };

        let sentCount = 0;

        // 3. Adım: Her alıcı için kontrolleri yap ve bildirimi gönder
        for (const recipientId of recipientIds) {
            // Kontrol A: Kullanıcı çevrimdışı mı? Sadece çevrimdışı olanlara gönder.
            const presenceRef = db.ref(`users/${recipientId}/presence`);
            const presenceSnap = await presenceRef.once('value');
            if (presenceSnap.exists() && presenceSnap.val().status === 'online') {
                console.log(`Kullanıcı (${recipientId}) çevrimiçi, bildirim gönderilmiyor.`);
                continue; // Çevrimiçiyse bu kullanıcıyı atla
            }

            // Kontrol B: Kullanıcı bu sohbet için bildirimleri kapatmış mı?
            const settingsPath = chatType === 'dm'
                ? `users/${recipientId}/conversations/${chatId}/notificationsEnabled`
                : `users/${recipientId}/groups/${chatId}/notificationsEnabled`;
            
            const settingsSnap = await db.ref(settingsPath).once('value');
            // Eğer `notificationsEnabled` değeri `false` ise, bildirim gönderme.
            // Eğer hiç ayarlanmamışsa (null), varsayılan olarak açık (true) kabul edilir.
            if (settingsSnap.exists() && settingsSnap.val() === false) {
                console.log(`Kullanıcı (${recipientId}) bu sohbet için bildirimleri kapattı.`);
                continue; // Bildirimleri kapalıysa bu kullanıcıyı atla
            }

            // 4. Adım: Kullanıcının FCM token'larını al ve bildirimi gönder
            const tokensSnapshot = await db.ref(`users/${recipientId}/fcmTokens`).once('value');
            if (tokensSnapshot.exists()) {
                const tokens = Object.keys(tokensSnapshot.val());
                if (tokens.length > 0) {
                    const response = await admin.messaging().sendToDevice(tokens, notificationPayload);
                    sentCount += response.successCount;
                    
                    // Geçersiz token'ları temizleme (opsiyonel ama önerilir)
                    response.results.forEach((result, index) => {
                        const error = result.error;
                        if (error) {
                            console.error('Token hatası:', tokens[index], error);
                            if (error.code === 'messaging/registration-token-not-registered') {
                                db.ref(`users/${recipientId}/fcmTokens/${tokens[index]}`).remove();
                            }
                        }
                    });
                }
            }
        }
        
        res.json({ 
            success: true, 
            sent: sentCount,
            checked: recipientIds.length
        });

    } catch (error) {
        console.error('Bildirim tetikleme hatası:', error);
        res.status(500).json({ error: 'Bildirim gönderilemedi' });
    }
});

module.exports = router;