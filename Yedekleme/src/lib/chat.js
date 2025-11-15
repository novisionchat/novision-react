// --- DOSYA: src/lib/chat.js (GÜNCELLENMİŞ HALİ) ---
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
    runTransaction // Sayaçları güvenli bir şekilde artırmak için 'runTransaction' gereklidir
} from "firebase/database";

/**
 * İki kullanıcı ID'sinden tutarlı bir DM (Direct Message) sohbet ID'si oluşturur.
 * ID'leri her zaman aynı sırada birleştirir (küçük olan önce).
 */
export function getOrCreateDmId(uid1, uid2) {
    if (!uid1 || !uid2) return null;
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

/**
 * Bir sohbeti (DM veya Grup) kullanıcının sol panelindeki listesinden kaldırır/gizler.
 */
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

/**
 * Bir sohbete yeni bir mesaj gönderir ve ilgili kullanıcıların okunmamış sayaçlarını günceller.
 */
export async function sendMessage(chatId, chatType, sender, payload, replyTo = null, channelId = 'general') {
    // Boş mesajların gönderilmesini engelle
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

    // Gönderilecek yeni mesaj objesini oluştur
    const newMessage = {
        sender: sender.uid,
        senderName: sender.displayName,
        timestamp: serverTimestamp(),
        status: 'sent', // Başlangıç durumu
        ...payload
    };

    // --- BAŞLANGIÇ: GÜNCELLENEN BÖLÜM ---
    // Mesaj bir yanıtsa, yanıt bilgilerini doğru bir şekilde ekle
    if (replyTo) {
        // Yanıtlanan içeriğin türüne göre bir önizleme metni oluştur
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
            text: replyPreviewText, // Oluşturulan önizleme metnini kullan
        };
    }
    // --- BİTİŞ: GÜNCELLENEN BÖLÜM ---

    // 1. Yeni mesajı veritabanına kaydet
    await push(messagesRef, newMessage);

    // 2. Okunmamış mesaj sayaçlarını ve son mesaj zaman damgasını güncelle
    const updates = {};
    const lastMessageTimestamp = serverTimestamp();

    if (chatType === 'dm') {
        // DM'lerde, alıcının kim olduğunu bul
        const otherUserId = chatId.replace(sender.uid, '').replace('_', '');
        
        // Gönderenin sohbet listesindeki son mesaj zamanını güncelle
        updates[`/users/${sender.uid}/conversations/${chatId}/lastMessageTimestamp`] = lastMessageTimestamp;
        
        // Alıcının sohbet listesindeki son mesaj zamanını güncelle
        updates[`/users/${otherUserId}/conversations/${chatId}/lastMessageTimestamp`] = lastMessageTimestamp;
        
        // Alıcının okunmamış mesaj sayacını 1 artır.
        // runTransaction, birden çok mesaj aynı anda geldiğinde bile sayacın doğru artmasını sağlar.
        const recipientUnreadRef = ref(db, `/users/${otherUserId}/conversations/${chatId}/unreadCount`);
        runTransaction(recipientUnreadRef, (currentCount) => {
            return (currentCount || 0) + 1;
        });

    } else if (chatType === 'group') {
        // Gruplarda, tüm üyelerin listesini al
        const membersRef = ref(db, `groups/${chatId}/members`);
        const snapshot = await get(membersRef);
        
        if (snapshot.exists()) {
            const members = snapshot.val();
            Object.keys(members).forEach(memberId => {
                // Her üyenin grup listesindeki son mesaj zamanını güncelle
                updates[`/users/${memberId}/groups/${chatId}/lastMessageTimestamp`] = lastMessageTimestamp;
                
                // Mesajı gönderen kişi HARİÇ, diğer tüm üyelerin okunmamış sayacını 1 artır
                if (memberId !== sender.uid) {
                    const memberUnreadRef = ref(db, `/users/${memberId}/groups/${chatId}/unreadCount`);
                    runTransaction(memberUnreadRef, (currentCount) => {
                        return (currentCount || 0) + 1;
                    });
                }
            });
        }
    }
    
    // Toplanan zaman damgası güncellemelerini tek seferde veritabanına yaz
    if (Object.keys(updates).length > 0) {
        await update(ref(db), updates);
    }
}

/**
 * Belirli bir sohbetin mesajlarını dinler ve değişiklik olduğunda callback fonksiyonunu tetikler.
 */
export function listenForMessages(chatId, chatType, callback, channelId = 'general') {
    let messagesRef;
    const finalChannelId = channelId || 'general';

    if (chatType === 'dm') {
        messagesRef = ref(db, `dms/${chatId}/messages`);
    } else if (chatType === 'group') {
        messagesRef = ref(db, `groups/${chatId}/channels/${finalChannelId}/messages`);
    } else {
        callback([]);
        return () => {}; // Dinleyiciyi kapatmak için boş fonksiyon döndür
    }

    // Son 100 mesajı zaman damgasına göre sıralayarak sorgula
    const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(100));
    const avatarCache = {}; // Avatar URL'lerini tekrar tekrar çekmemek için önbellek

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

        // Mesajlardaki tüm benzersiz gönderici ID'lerini topla
        const senderIds = [...new Set(messages.map(msg => msg.sender))];
        
        // Önbellekte olmayan göndericilerin avatar bilgilerini çek
        const newAvatarPromises = senderIds
            .filter(id => id && !avatarCache[id])
            .map(id => get(ref(db, `userSearchIndex/${id}`)));
            
        const newAvatarSnapshots = await Promise.all(newAvatarPromises);
        
        newAvatarSnapshots.forEach(snap => {
            if(snap.exists()) {
                avatarCache[snap.key] = snap.val().avatar;
            }
        });

        // Her mesaja göndericisinin avatar URL'sini ekle
        const messagesWithAvatars = messages.map(msg => ({
            ...msg,
            senderAvatar: avatarCache[msg.sender] || '/assets/icon.png' // Avatar bulunamazsa varsayılanı kullan
        }));
        
        callback(messagesWithAvatars);
    });
}

/**
 * Belirli bir mesajı veritabanından siler.
 */
export async function deleteMessage(chatId, chatType, messageId, channelId = 'general') {
    let messageRef;
    if (chatType === 'dm') {
        messageRef = ref(db, `dms/${chatId}/messages/${messageId}`);
    } else if (chatType === 'group') {
        messageRef = ref(db, `groups/${chatId}/channels/${channelId || 'general'}/messages/${messageId}`);
    } else { return; }
    
    await remove(messageRef);
}

/**
 * Bir mesaja tepki ekler veya mevcut tepkiyi kaldırır.
 */
export function toggleReaction(chatId, chatType, messageId, emoji, userId, channelId = 'general') {
    let reactionRef;
    if (chatType === 'dm') {
        reactionRef = ref(db, `dms/${chatId}/messages/${messageId}/reactions/${emoji}/${userId}`);
    } else if (chatType === 'group') {
        reactionRef = ref(db, `groups/${chatId}/channels/${channelId || 'general'}/messages/${messageId}/reactions/${emoji}/${userId}`);
    } else { return; }
    
    // runTransaction ile mevcut tepki durumunu güvenli bir şekilde değiştir
    return runTransaction(reactionRef, (currentData) => {
        // Eğer tepki varsa (true), onu kaldır (null). Yoksa (null), ekle (true).
        return currentData ? null : true;
    });
}