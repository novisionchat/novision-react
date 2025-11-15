const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// --- BAŞLANGIÇ: Firebase Admin SDK Kurulumu (Secret File Yöntemi) ---
// Bu blok, Base64 yerine Render'ın "Secret File" özelliğini kullanarak
// kimlik doğrulama anahtarını güvenli bir şekilde okur.
try {
    // Uygulamanın birden fazla kez başlatılmasını önleyen kontrol
    if (admin.apps.length === 0) {
        
        // Render, "Secret File" olarak yüklenen dosyayı bu standart yolda oluşturur.
        const serviceAccountPath = '/etc/secrets/service-account.json';

        admin.initializeApp({
            // Base64'ü çözmek yerine, doğrudan dosyanın yolunu veriyoruz.
            credential: admin.credential.cert(serviceAccountPath), 
            databaseURL: process.env.DATABASE_URL
        });
        console.log("Firebase Admin SDK başarıyla ve Secret File ile başlatıldı.");

    }
} catch (error) {
    console.error("Firebase Admin SDK (Secret File) başlatılırken hata oluştu:", error);
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

        // Adım 1: Alıcıları Belirle
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

        // Adım 2: Her alıcı için kontrolleri yap
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

            // Adım 3: Kullanıcının token'larını al ve bildirimi gönd