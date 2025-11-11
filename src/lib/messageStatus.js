// src/lib/messageStatus.js
import { db } from './firebase.js';
import { ref, update, get } from "firebase/database";

export async function markMessagesAsRead(chatId, chatType, currentUserId) {
    if (!chatId || !currentUserId) return;

    let messagesRef;
    if (chatType === 'dm') {
        messagesRef = ref(db, `dms/${chatId}/messages`);
    } else {
        // Grup mantığı daha sonra eklenecek
        return;
    }

    try {
        const snapshot = await get(messagesRef);
        if (!snapshot.exists()) return;

        const updates = {};
        snapshot.forEach(messageSnap => {
            const message = messageSnap.val();
            if (message.sender !== currentUserId && message.status !== 'read') {
                // Firebase'de birden çok yolu aynı anda güncellemek için tam yolu kullanıyoruz
                updates[`dms/${chatId}/messages/${messageSnap.key}/status`] = 'read';
            }
        });

        if (Object.keys(updates).length > 0) {
            // Veritabanının kökünden `update` çağrısı yaparak tüm değişiklikleri tek seferde uygula
            await update(ref(db), updates);
        }
    } catch (error) {
        console.error("Mesajlar okundu olarak işaretlenemedi:", error);
    }
}