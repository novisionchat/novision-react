const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// --- BAŞLANGIÇ: Firebase Admin SDK Kurulumu ---
try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        const serviceAccount_b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
        const serviceAccountJson = Buffer.from(serviceAccount_b64, 'base64').toString('ascii');
        const serviceAccount = JSON.parse(serviceAccountJson);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.DATABASE_URL
        });
        console.log("Firebase Admin SDK başarıyla başlatıldı.");
    } else {
        console.error("FIREBASE_SERVICE_ACCOUNT_BASE64 ortam değişkeni bulunamadı!");
    }
} catch (error) {
    console.error("Firebase Admin SDK başlatılırken hata oluştu:", error);
}
// --- BİTİŞ: Firebase Admin SDK Kurulumu ---


router.post('/trigger', async (req, res) => {
    try {
        const { chatId, chatType, sender, message } = req.body;
        
        if (!chatId || !chatType || !sender || !message) {
            return res.status(400).json({ error: 'Eksik parametreler.' });
        }
        
        const db = admin.database();
        let recipientIds = [];

        // 1. Adım: Alıcıları Belirle
        if (chatType === 'dm') {
            const otherUserId = chatId.replace(sender.uid, '').replace('_', '');
            recipientIds.push(otherUserId);
        } else if (chatType === 'group') {
            const membersSnapshot = await db.ref(`groups/${chatId}/members`).once('value');
            if (membersSnapshot.exists()) {
                recipientIds = Object.keys(membersSnapshot.val()).filter(id => id !== sender.uid);
            }
        }

        if (recipientIds.length === 0) {
            return res.json({ success: true, message: 'Bildirim gönderilecek kimse bulunamadı.' });
        }

        const notificationPayload = {
            notification: {
                title: message.title,
                body: message.body,
                icon: message.icon || '/assets/icon.png'
            },
            webpush: {
                fcm_options: {
                    link: message.click_action || '/'
                }
            }
        };

        let sentCount = 0;

        // 2. Adım: Her alıcı için kontrolleri yap ve bildirimi gönder
        for (const recipientId of recipientIds) {
            const presenceRef = db.ref(`users/${recipientId}/presence`);
            const presenceSnap = await presenceRef.once('value');
            if (presenceSnap.exists() && presenceSnap.val().status === 'online') {
                console.log(`Kullanıcı (${recipientId}) çevrimiçi, bildirim gönderilmiyor.`);
                continue;
            }

            const settingsPath = chatType === 'dm'
                ? `users/${recipientId}/conversations/${chatId}/notificationsEnabled`
                : `users/${recipientId}/groups/${chatId}/notificationsEnabled`;
            
            const settingsSnap = await db.ref(settingsPath).once('value');
            if (settingsSnap.exists() && settingsSnap.val() === false) {
                console.log(`Kullanıcı (${recipientId}) bu sohbet için bildirimleri kapattı.`);
                continue;
            }

            // 3. Adım: Kullanıcının FCM token'larını al
            const tokensSnapshot = await db.ref(`users/${recipientId}/fcmTokens`).once('value');
            if (tokensSnapshot.exists()) {
                const tokens = Object.keys(tokensSnapshot.val());
                if (tokens.length > 0) {
                    
                    // --- BAŞLANGIÇ: HATA DÜZELTMESİ ---
                    // 'sendToDevice' yerine 'sendMulticast' kullanıyoruz.
                    // 'sendMulticast' bir obje bekler ve bu objenin içinde 'tokens' anahtarı olmalıdır.
                    const response = await admin.messaging().sendMulticast({
                        tokens: tokens, // Token dizisi burada
                        notification: notificationPayload.notification,
                        webpush: notificationPayload.webpush,
                    });
                    // --- BİTİŞ: HATA DÜZELTMESİ ---

                    sentCount += response.successCount;
                    
                    if (response.failureCount > 0) {
                        const failedTokens = [];
                        response.responses.forEach((resp, idx) => {
                            if (!resp.success) {
                                failedTokens.push(tokens[idx]);
                            }
                        });
                        console.log('Hatalı token listesi:', failedTokens);
                        // Burada isterseniz hatalı token'ları veritabanından silebilirsiniz.
                    }
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