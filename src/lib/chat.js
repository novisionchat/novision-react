// src/lib/chat.js
import { db } from './firebase.js';
import { 
    ref, 
    set, 
    remove, 
    push, 
    onValue, 
    serverTimestamp, 
    query, 
    limitToLast, 
    orderByChild,
    get,
    update,
    runTransaction
} from "firebase/database";

export function getOrCreateDmId(uid1, uid2) {
    if (!uid1 || !uid2) return null;
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

export async function hideConversation(userId, conversationId, conversationType) {
    let conversationRef;
    if (conversationType === 'group') {
        conversationRef = ref(db, `users/${userId}/groups/${conversationId}`);
    } else { // 'dm'
        conversationRef = ref(db, `users/${userId}/conversations/${conversationId}`);
    }
    try {
        await remove(conversationRef);
        console.log(`Sohbet (${conversationId}) kullanıcının listesinden gizlendi.`);
    } catch (error) {
        console.error("Sohbet gizlenirken hata oluştu:", error);
        throw new Error("Sohbet gizlenemedi.");
    }
}

export async function sendMessage(chatId, chatType, sender, payload, replyTo = null, channelId = 'general') {
    if (!payload.text && !payload.gifUrl && !payload.mediaUrl) return;

    let messagesRef;
    if (chatType === 'dm') {
        messagesRef = ref(db, `dms/${chatId}/messages`);
    } else if (chatType === 'group') {
        const finalChannelId = channelId || 'general';
        messagesRef = ref(db, `groups/${chatId}/channels/${finalChannelId}/messages`);
    } else {
        throw new Error("Bilinmeyen sohbet türü");
    }

    const newMessage = {
        sender: sender.uid,
        senderName: sender.displayName,
        timestamp: serverTimestamp(),
        status: 'sent',
        ...payload
    };

    if (replyTo) {
        let replyPreviewText = 'Bir mesaja yanıt veriliyor...';
        if (replyTo.text) {
            replyPreviewText = replyTo.text;
        } else if (replyTo.type === 'media') {
            switch (replyTo.mediaType) {
                case 'image': replyPreviewText = '🖼️ Resim'; break;
                case 'video': replyPreviewText = '🎬 Video'; break;
                case 'audio': replyPreviewText = '🎤 Sesli Mesaj'; break;
                default: replyPreviewText = '📎 Dosya'; break;
            }
        } else if (replyTo.type === 'gif') {
            replyPreviewText = '🎞️ GIF';
        }
        newMessage.replyTo = {
            messageId: replyTo.id,
            senderName: replyTo.senderName,
            text: replyPreviewText,
        };
    }

    // 1. Yeni mesajı veritabanına kaydet
    await push(messagesRef, newMessage);

    // --- BAŞLANGIÇ: BİLDİRİM TETİKLEME BÖLÜMÜ ---
    // 2. Bildirim göndermesi için backend'i tetikle (fire-and-forget, yani cevabını bekleme)
    // .env dosyanıza VITE_API_URL eklediğinizden emin olun
    // Örn: VITE_API_URL=https://projeniz.onrender.com
    fetch(`${import.meta.env.VITE_API_URL}/api/notifications/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chatId: chatId,
            chatType: chatType,
            sender: {
                uid: sender.uid,
                displayName: sender.displayName
            },
            message: {
                title: chatType === 'dm' ? sender.displayName : `Yeni Mesaj`, // Grup adı daha sonra alınabilir
                body: payload.text || (payload.gifUrl ? `${sender.displayName} bir GIF gönderdi.` : `${sender.displayName} bir medya dosyası gönderdi.`),
                click_action: `/` // TODO: Uygulama içi yönlendirme linki
            }
        })
    }).catch(err => console.error("Bildirim tetikleme API hatası:", err));
    // --- BİTİŞ: BİLDİRİM TETİKLEME BÖLÜMÜ ---

    // 3. Okunmamış mesaj sayaçlarını ve son mesaj zaman damgasını güncelle
    const updates = {};
    const lastMessageTimestamp = serverTimestamp();

    if (chatType === 'dm') {
        const otherUserId = chatId.replace(sender.uid, '').replace('_', '');
        updates[`/users/${sender.uid}/conversations/${chatId}/lastMessageTimestamp`] = lastMessageTimestamp;
        updates[`/users/${otherUserId}/conversations/${chatId}/lastMessageTimestamp`] = lastMessageTimestamp;
        const recipientUnreadRef = ref(db, `/users/${otherUserId}/conversations/${chatId}/unreadCount`);
        runTransaction(recipientUnreadRef, (currentCount) => (currentCount || 0) + 1);
    } else if (chatType === 'group') {
        const membersRef = ref(db, `groups/${chatId}/members`);
        const snapshot = await get(membersRef);
        if (snapshot.exists()) {
            const members = snapshot.val();
            Object.keys(members).forEach(memberId => {
                updates[`/users/${memberId}/groups/${chatId}/lastMessageTimestamp`] = lastMessageTimestamp;
                if (memberId !== sender.uid) {
                    const memberUnreadRef = ref(db, `/users/${memberId}/groups/${chatId}/unreadCount`);
                    runTransaction(memberUnreadRef, (currentCount) => (currentCount || 0) + 1);
                }
            });
        }
    }
    
    if (Object.keys(updates).length > 0) {
        await update(ref(db), updates);
    }
}


export function listenForMessages(chatId, chatType, callback, channelId = 'general') {
    let messagesRef;
    const finalChannelId = channelId || 'general';

    if (chatType === 'dm') {
        messagesRef = ref(db, `dms/${chatId}/messages`);
    } else if (chatType === 'group') {
        messagesRef = ref(db, `groups/${chatId}/channels/${finalChannelId}/messages`);
    } else {
        callback([]);
        return () => {};
    }

    const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(100));
    const avatarCache = {};

    return onValue(messagesQuery, async (snapshot) => {
        if (!snapshot.exists()) {
            callback([]);
            return;
        }
        
        const messages = [];
        snapshot.forEach(childSnapshot => {
            messages.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });

        const senderIds = [...new Set(messages.map(msg => msg.sender))];
        const newAvatarPromises = senderIds
            .filter(id => id && !avatarCache[id])
            .map(id => get(ref(db, `userSearchIndex/${id}`)));
            
        const newAvatarSnapshots = await Promise.all(newAvatarPromises);
        
        newAvatarSnapshots.forEach(snap => {
            if(snap.exists()) {
                avatarCache[snap.key] = snap.val().avatar;
            }
        });

        const messagesWithAvatars = messages.map(msg => ({
            ...msg,
            senderAvatar: avatarCache[msg.sender] || '/assets/icon.png'
        }));
        
        callback(messagesWithAvatars);
    });
}

export async function deleteMessage(chatId, chatType, messageId, channelId = 'general') {
    let messageRef;
    if (chatType === 'dm') {
        messageRef = ref(db, `dms/${chatId}/messages/${messageId}`);
    } else if (chatType === 'group') {
        messageRef = ref(db, `groups/${chatId}/channels/${channelId || 'general'}/messages/${messageId}`);
    } else { return; }
    await remove(messageRef);
}

export function toggleReaction(chatId, chatType, messageId, emoji, userId, channelId = 'general') {
    let reactionRef;
    if (chatType === 'dm') {
        reactionRef = ref(db, `dms/${chatId}/messages/${messageId}/reactions/${emoji}/${userId}`);
    } else if (chatType === 'group') {
        reactionRef = ref(db, `groups/${chatId}/channels/${channelId || 'general'}/messages/${messageId}/reactions/${emoji}/${userId}`);
    } else { return; }
    return runTransaction(reactionRef, (currentData) => currentData ? null : true);
}