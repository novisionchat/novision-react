// src/lib/messageStatus.js
import { db } from './firebase.js';
import { 
    ref, 
    update, 
    get, 
    onChildAdded, 
    query, 
    set, 
    remove,
    limitToLast // YENİ: limitToLast import edildi
} from "firebase/database";

// Bu fonksiyonda değişiklik yok, doğru çalışıyor.
export async function markMessagesAsRead(chatId, chatType, currentUserId) {
    if (!chatId || !currentUserId) return;

    let userConversationRef;
    if (chatType === 'dm') {
        userConversationRef = ref(db, `users/${currentUserId}/conversations/${chatId}/unreadCount`);
    } else { // group
        userConversationRef = ref(db, `users/${currentUserId}/groups/${chatId}/unreadCount`);
    }
    await remove(userConversationRef);

    let messagesRef;
    if (chatType === 'dm') {
        messagesRef = ref(db, `dms/${chatId}/messages`);
    } else {
        return;
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


// --- BU FONKSİYON TAMAMEN GÜNCELLENDİ ---
// Anlık olarak yeni gelen mesajları dinler ve okundu olarak işaretler.
export function listenForAndMarkNewMessagesAsRead(chatId, chatType, currentUserId) {
    if (!chatId || !currentUserId) return () => {};

    let messagesRef;
    if (chatType === 'dm') {
        messagesRef = ref(db, `dms/${chatId}/messages`);
    } else {
        // Grup sohbetleri için şimdilik dinleyici yok.
        return () => {};
    }
    
    // --- DEĞİŞEN SATIR: Sorgu artık saat farkından etkilenmeyecek şekilde güncellendi. ---
    // Artık sadece yola eklenen son mesajı dinliyoruz.
    const messagesQuery = query(messagesRef, limitToLast(1));
    // --- ESKİ KOD (YORUM SATIRI HALİNDE): const messagesQuery = query(messagesRef, startAt(Date.now(), "timestamp")); ---

    const unsubscribe = onChildAdded(messagesQuery, (snapshot) => {
        const message = snapshot.val();
        const messageId = snapshot.key;
        
        // Bu mantık zaten doğruydu ve aynı kalıyor.
        // Sadece pencere odaktaysa, mesaj başkası tarafından gönderilmişse ve henüz okunmamışsa güncelle.
        if (document.hasFocus() && message.sender !== currentUserId && message.status !== 'read') {
            const messageStatusRef = ref(db, `dms/${chatId}/messages/${messageId}/status`);
            set(messageStatusRef, 'read').catch(error => console.error("Yeni mesaj okundu olarak işaretlenemedi:", error));
        }
    });

    return unsubscribe;
}