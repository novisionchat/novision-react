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

// --- DEĞİŞİKLİK BURADA BAŞLIYOR ---
// Fonksiyona 'conversationType' parametresini ekliyoruz.
export async function hideConversation(userId, conversationId, conversationType) {
    let conversationRef;

    // Sohbet türüne göre doğru referans yolunu belirle
    if (conversationType === 'group') {
        // Eğer bir grupsa, kullanıcının /groups/ listesinden sil
        conversationRef = ref(db, `users/${userId}/groups/${conversationId}`);
    } else {
        // Eğer bir DM ise (veya tür belirtilmemişse), /conversations/ listesinden sil
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
// --- DEĞİŞİKLİK BURADA BİTİYOR ---


export async function sendMessage(chatId, chatType, sender, payload, replyTo = null, channelId = 'general') {
    // ... dosyanın geri kalanı aynı kalacak ...
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
        newMessage.replyTo = {
            messageId: replyTo.id,
            senderName: replyTo.senderName,
            text: replyTo.text,
        };
    }

    await push(messagesRef, newMessage);

    if (chatType === 'dm') {
        const otherUserId = chatId.replace(sender.uid, '').replace('_', '');
        const updates = {};
        updates[`/users/${sender.uid}/conversations/${chatId}/lastMessageTimestamp`] = serverTimestamp();
        updates[`/users/${otherUserId}/conversations/${chatId}/lastMessageTimestamp`] = serverTimestamp();
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
            messages.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
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
    
    return runTransaction(reactionRef, (currentData) => {
        return currentData ? null : true;
    });
}