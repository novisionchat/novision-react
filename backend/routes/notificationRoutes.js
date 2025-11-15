const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const admin = require('firebase-admin');

// --- BAŞLANGIÇ: Ortam Değişkeni Kontrolü ---
// Render'daki ortam değişkenlerinden sitenizin ana URL'sini alıyoruz.
const APP_BASE_URL = process.env.APP_BASE_URL;
if (!APP_BASE_URL) {
    console.error("KRİTİK HATA: APP_BASE_URL ortam değişkeni ayarlanmamış! Bildirimlerin URL'leri geçersiz olacak.");
}
// --- BİTİŞ: Ortam Değişkeni Kontrolü ---


// --- BAŞLANGIÇ: Firebase Admin SDK Kurulumu ---
try {
    if (admin.apps.length === 0) {
        // Render için olan kodunuzu aktif bırakın
        const serviceAccountPath = '/etc/secrets/service-account.json';
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccountPath),
            databaseURL: process.env.DATABASE_URL
        });
        console.log("Firebase Admin SDK başarıyla başlatıldı.");
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

        // Adım 1 & 2: Player ID'leri toplama (Bu kısımlar doğru, değiştirilmedi)
        const db = admin.database();
        let recipientIds = [];
        if (chatType === 'dm') {
            const otherUserId = chatId.replace(sender.uid, '').replace('_', '');
            recipientIds.push(otherUserId);
        } else if (chatType === 'group') {
            const membersSnapshot = await db.ref(`groups/${chatId}/members`).once('value');
            if (membersSnapshot.exists()) {
                recipientIds = Object.keys(membersSnapshot.val()).filter(id => id !== sender.uid);
            }
        }
        if (recipientIds.length === 0) return res.json({ success: true, message: 'Alıcı bulunamadı.' });

        let allPlayerIds = [];
        for (const recipientId of recipientIds) {
            const playerIdsSnapshot = await db.ref(`users/${recipientId}/playerIds`).once('value');
            if (playerIdsSnapshot.exists()) {
                allPlayerIds.push(...Object.keys(playerIdsSnapshot.val()));
            }
        }
        if (allPlayerIds.length === 0) return res.json({ success: true, message: 'Player ID bulunamadı.' });
        

        // --- DEĞİŞEN BÖLÜM BURASI ---
        // Adım 3: OneSignal bildirimini doğru URL ile hazırla
        
        // Ön yüzden gelen göreceli yolu al (örn: "/chats/123" veya tanımsızsa "/")
        const relativeUrl = message.click_action || '/';

        // Göreceli yolu, ortam değişkenindeki ana URL ile birleştirerek tam URL oluştur.
        // new URL() kullanımı, "https://site.com/" + "/path" gibi durumlarda çift // oluşmasını engeller.
        const fullWebUrl = new URL(relativeUrl, APP_BASE_URL).href;

        const notification = {
            app_id: process.env.ONESIGNAL_APP_ID,
            include_player_ids: allPlayerIds,
            headings: { "en": message.title },
            contents: { "en": message.body },
            web_url: fullWebUrl // DÜZELTİLMİŞ VE TAM URL
        };
        // --- GÜNCELLEME SONU ---


        // Adım 4: OneSignal API'sine istek gönder (Bu kısım doğru, değiştirilmedi)
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
        res.json({ success: true, message: "Bildirim başarıyla iletildi.", oneSignalResponse: responseData });

    } catch (error) {
        console.error('OneSignal bildirim tetikleme hatası:', error);
        res.status(500).json({ error: 'Bildirim gönderilemedi', details: error.message });
    }
});

module.exports = router;