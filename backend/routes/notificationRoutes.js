const express = require('express');
const router = express.Router();
const fetch = require('node-fetch'); // package.json dosyanızda zaten vardı
const admin = require('firebase-admin'); // Veritabanından Player ID okumak için hâlâ gerekli

// --- BAŞLANGIÇ: Firebase Admin SDK Kurulumu (Veritabanı için) ---
// Not: Bu kısım sadece veritabanından kullanıcı bilgilerini okumak için
// kullanılıyor, artık bildirim göndermek için DEĞİL.
try {
    if (admin.apps.length === 0) {
        // Render'a deploy ederken bu satırları tekrar eski haline getirmeyi unutmayın!
        // Lokal Test için:
        const serviceAccount = require('../service-account.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.DATABASE_URL
        });
        
        // Render için (eski kodunuz):
        /*
        const serviceAccountPath = '/etc/secrets/service-account.json';
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccountPath), 
            databaseURL: process.env.DATABASE_URL
        });
        */
        console.log("Firebase Admin SDK (Veritabanı Erişimi İçin) başarıyla başlatıldı.");
    }
} catch (error) {
    console.error("Firebase Admin SDK (Veritabanı Erişimi İçin) başlatılırken hata oluştu:", error);
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

        // Adım 1: Alıcıları Belirle (Bu kısım aynı kalıyor)
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

        let allPlayerIds = [];

        // Adım 2: Her alıcı için Player ID'lerini topla
        for (const recipientId of recipientIds) {
            // ÖNEMLİ: Veritabanınızda artık 'fcmTokens' yerine 'playerIds' tutmalısınız!
            const playerIdsSnapshot = await db.ref(`users/${recipientId}/playerIds`).once('value');
            if (playerIdsSnapshot.exists()) {
                const playerIds = Object.keys(playerIdsSnapshot.val());
                allPlayerIds.push(...playerIds);
            }
        }

        if (allPlayerIds.length === 0) {
            return res.json({ success: true, message: 'Bildirim gönderilecek aktif cihaz (Player ID) bulunamadı.' });
        }
        
        // Adım 3: OneSignal API'sine gönderilecek bildirimi hazırla
        const notification = {
            app_id: process.env.ONESIGNAL_APP_ID,
            include_player_ids: allPlayerIds,
            headings: { "en": message.title },
            contents: { "en": message.body },
            web_url: message.click_action || '/' // Bildirime tıklandığında açılacak URL
        };

        // Adım 4: OneSignal API'sine POST isteği gönder
        const response = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Basic ${process.env.ONESIGNAL_API_KEY}`
            },
            body: JSON.stringify(notification)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OneSignal API Hatası:', errorData);
            throw new Error('OneSignal API\'den hata yanıtı alındı.');
        }

        const responseData = await response.json();
        console.log("OneSignal Yanıtı:", responseData);

        res.json({ 
            success: true, 
            message: "Bildirim başarıyla OneSignal'a iletildi.",
            oneSignalResponse: responseData
        });

    } catch (error) {
        console.error('OneSignal bildirim tetikleme hatası:', error);
        res.status(500).json({ error: 'Bildirim gönderilemedi', details: error.message });
    }
});

module.exports = router;