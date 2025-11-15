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

        const db = admin.database();
        let recipientIds = [];

        // Adım 1: Alıcıları Belirle
        if (chatType === 'dm') {
            const otherUserId = chatId.replace(sender.uid, '').replace('_', '');
            recipientIds.push(otherUserId);
        } else if (chatType === 'group') {
            // DÜZELTİLDİ: Veritabanı yapınıza uygun olarak 'meta' katmanı eklendi.
            const membersSnapshot = await db.ref(`groups/${chatId}/meta/members`).once('value');
            if (membersSnapshot.exists()) {
                recipientIds = Object.keys(membersSnapshot.val()).filter(id => id !== sender.uid);
            }
        }

        if (recipientIds.length === 0) {
            return res.json({ success: true, message: 'Bildirim gönderilecek alıcı bulunamadı.' });
        }

        let allPlayerIds = [];

        // Adım 2: Her alıcı için çevrimiçi durumunu kontrol et ve Player ID'leri topla
        for (const recipientId of recipientIds) {
            // YENİ: Kullanıcının çevrimiçi durumunu kontrol et
            const presenceSnapshot = await db.ref(`users/${recipientId}/presence/status`).once('value');
            
            // Sadece kullanıcı 'online' DEĞİLSE bildirim gönderilecekler listesine ekle
            if (presenceSnapshot.val() !== 'online') {
                const playerIdsSnapshot = await db.ref(`users/${recipientId}/playerIds`).once('value');
                if (playerIdsSnapshot.exists()) {
                    allPlayerIds.push(...Object.keys(playerIdsSnapshot.val()));
                }
            } else {
                 // Kullanıcı zaten çevrimiçi olduğu için bu alıcıyı atlıyoruz.
                console.log(`Kullanıcı ${recipientId} çevrimiçi, bu yüzden bildirim gönderilmeyecek.`);
            }
        }

        if (allPlayerIds.length === 0) {
            return res.json({ success: true, message: 'Bildirim gönderilecek çevrimdışı kullanıcı veya cihaz bulunamadı.' });
        }
        
        // Adım 3: OneSignal bildirimini doğru URL ve etiket ile hazırla
        const relativeUrl = message.click_action || '/';
        const fullWebUrl = new URL(relativeUrl, APP_BASE_URL).href;

        const notification = {
            app_id: process.env.ONESIGNAL_APP_ID,
            include_player_ids: allPlayerIds,
            headings: { "en": message.title },
            contents: { "en": message.body },
            web_url: fullWebUrl,
            // YENİ: Aynı sohbetten gelen bildirimlerin birbirini güncellemesi için etiket ekle
            web_push_data: {
                tag: chatId
            }
        };

        // Adım 4: OneSignal API'sine istek gönder
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