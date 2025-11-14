// src/lib/messageStatus.js
import { db } from './firebase.js';
import { ref, update, get, onChildAdded, query, startAt, set, remove } from "firebase/database";

export async function markMessagesAsRead(chatId, chatType, currentUserId) {
    if (!chatId || !currentUserId) return;

    // --- YENİ: Okunmamış mesaj sayacını sıfırla ---
    let userConversationRef;
    if (chatType === 'dm') {
        userConversationRef = ref(db, `users/${currentUserId}/conversations/${chatId}/unreadCount`);
    } else { // group
        userConversationRef = ref(db, `users/${currentUserId}/groups/${chatId}/unreadCount`);
    }
    // Değeri silerek hem sayacı sıfırlamış hem de veritabanından gereksiz veri kaldırmış oluruz.
    await remove(userConversationRef);
    // --- BİTİŞ ---

    let messagesRef;
    if (chatType === 'dm') {
        messagesRef = ref(db, `dms/${chatId}/messages`);
    } else {
        return; // Grup mesajları için kanal bazlı okundu bilgisi daha sonra eklenebilir
    }

    try {
        const snapshot = await get(messagesRef);
        if (!snapshot.exists()) return;

        const updates = {};
        snapshot.forEach(messageSnap => {
            const message = messageSnap.val();
            if (message.sender !== currentUserId && message.status !== 'read') {
                updates[`dms/${chatId}/messages/${messageSnap.key}/status`] = 'read';
            }
        });

        if (Object.keys(updates).length > 0) {
            await update(ref(db), updates);
        }
    } catch (error) {
        console.error("Mesajlar okundu olarak işaretlenemedi:", error);
    }
}

// Bu fonksiyonda değişiklik yok, real-time okundu için çalışmaya devam ediyor
export function listenForAndMarkNewMessagesAsRead(chatId, chatType, currentUserId) {
    if (!chatId || !currentUserId) return () => {};

    let messagesRef;
    if (chatType === 'dm') {
        messagesRef = ref(db, `dms/${chatId}/messages`);
    } else {
        return () => {};
    }
    
    const messagesQuery = query(messagesRef, startAt(Date.now(), "timestamp"));

    const unsubscribe = onChildAdded(messagesQuery, (snapshot) => {
        const message = snapshot.val();
        const messageId = snapshot.key;
        if (document.hasFocus() && message.sender !== currentUserId && message.status !== 'read') {
            const messageStatusRef = ref(db, `dms/${chatId}/messages/${messageId}/status`);
            set(messageStatusRef, 'read').catch(error => console.error("Yeni mesaj okundu olarak işaretlenemedi:", error));
        }
    });

    return unsubscribe;
}