const express = require('express');
const router = express.Router();

async function sendPushNotification(fcmToken, notification) {
    const API_KEY = process.env.FCM_SERVER_KEY;
    
    if (!API_KEY) {
        console.error('FCM_SERVER_KEY tanımlanmamış');
        return false;
    }

    try {
        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `key=${API_KEY}`
            },
            body: JSON.stringify({
                to: fcmToken,
                notification: {
                    title: notification.title,
                    body: notification.body,
                    icon: notification.icon || '/assets/icon.png',
                    click_action: notification.click_action || '/'
                },
                data: notification.data || {},
                priority: 'high'
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('FCM gönderme hatası:', errorData);
            return false;
        }

        return true;
    } catch (error) {
        console.error('FCM istek hatası:', error);
        return false;
    }
}

router.post('/send', async (req, res) => {
    try {
        const { tokens, notification } = req.body;
        
        if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
            return res.status(400).json({ error: 'Geçersiz FCM token listesi' });
        }
        
        if (!notification || !notification.title || !notification.body) {
            return res.status(400).json({ error: 'Geçersiz bildirim içeriği' });
        }

        const results = await Promise.all(
            tokens.map(token => sendPushNotification(token, notification))
        );

        const successCount = results.filter(r => r === true).length;
        
        res.json({ 
            success: true, 
            sent: successCount, 
            total: tokens.length 
        });
    } catch (error) {
        console.error('Bildirim gönderme hatası:', error);
        res.status(500).json({ error: 'Bildirim gönderilemedi' });
    }
});

module.exports = router;
