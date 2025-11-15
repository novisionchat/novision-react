// src/lib/messageStatus.js
import { db } from './firebase.js';
import { ref, update, get, onChildAdded, query, startAt, set, remove } from "firebase/database";

export async function markMessagesAsRead(chatId, chatType, currentUserId) {
    if (!chatId || !currentUserId) return;

    // --- GÜNCELLEME: Okunmamış mesaj sayacını sıfırla ---
    let userConversationRef;
    if (chatType === 'dm') {
        userConversationRef = ref(db, `users/${currentUserId}/conversations/${chatId}/unreadCount`);
    } else { // group
        userConversationRef = ref(db, `users/${currentUserId}/groups/${chatId}/unreadCount`);
    }
    // Değeri silerek hem sayacı sıfırlamış hem de veritabanından gereksiz veri kaldırmış oluruz.
    await remove(userConversationRef);
    // --- GÜNCELLEME SONU ---

    // Bu kısım DM'ler için çalışmaya devam ediyor.
    let messagesRef;
    if (chatType === 'dm') {
        messagesRef = ref(db, `dms/${chatId}/messages`);
    } else {
        return; // Grup mesajları için şimdilik bir değişiklik yok.
    }

    try {
        const snapshot = await get(messagesRef);
        if (!snapshot.exists()) return;

        const updates = {};
        snapshot.forEach(messageSnap => {
            const message = messageSnap.val();
            // Sadece karşı tarafın gönderdiği ve henüz 'read' olmayan mesajları güncelle
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

// --- YENİ EKLENEN FONKSİYON ---
// Sohbet açıkken gelen yeni mesajları anlık olarak dinler ve okundu olarak işaretler.
export function listenForAndMarkNewMessagesAsRead(chatId, chatType, currentUserId) {
    if (!chatId || !currentUserId) return () => {}; // Temizleme fonksiyonu döndür

    let messagesRef;
    if (chatType === 'dm') {
        messagesRef = ref(db, `dms/${chatId}/messages`);
    } else {
        // Grup sohbetleri için bu özellik daha sonra eklenebilir. Şimdilik pas geçiyoruz.
        return () => {};
    }
    
    // Sadece şu andan itibaren eklenecek yeni mesajları dinle
    const messagesQuery = query(messagesRef, startAt(Date.now(), "timestamp"));

    // onChildAdded, belirtilen yola yeni bir eleman eklendiğinde tetiklenir.
    const unsubscribe = onChildAdded(messagesQuery, (snapshot) => {
        const message = snapshot.val();
        const messageId = snapshot.key;

        // Eğer pencere odaktaysa, mesaj başkası tarafından gönderilmişse ve henüz okunmamışsa
        if (document.hasFocus() && message.sender !== currentUserId && message.status !== 'read') {
            const messageStatusRef = ref(db, `dms/${chatId}/messages/${messageId}/status`);
            set(messageStatusRef, 'read').catch(error => console.error("Yeni mesaj okundu olarak işaretlenemedi:", error));
        }
    });

    // Bu dinleyiciyi component kaldırıldığında durdurmak için unsubscribe fonksiyonunu döndür.
    return unsubscribe;
}