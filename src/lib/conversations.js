// src/lib/conversations.js
import { db } from './firebase.js';
import { ref, onValue, query, orderByChild, limitToLast } from "firebase/database";
import { listenToUserPresence } from './presence.js';

function formatMessagePreview(message) {
    if (!message) return 'Sohbeti başlat...';
    if (message.type === 'gif') return '🎞️ GIF';
    if (message.type === 'media' && message.mediaType === 'image') return '🖼️ Fotoğraf';
    if (message.text) {
        return message.text.length > 30 ? `${message.text.substring(0, 30)}...` : message.text;
    }
    return 'Bir mesaj gönderildi';
}

export function listenForConversations(userId, callback) {
    const userSearchIndexRef = ref(db, 'userSearchIndex');
    const userConversationsRef = ref(db, `users/${userId}/conversations`);
    const userGroupsRef = ref(db, `users/${userId}/groups`);

    let userCache = {};
    let dmConversations = new Map();
    let groupConversations = new Map();
    
    let presenceListeners = {};
    let lastMessageListeners = {};
    let groupDataListeners = {};

    const combineAndRender = () => {
        const allConversations = [...dmConversations.values(), ...groupConversations.values()];
        allConversations.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        callback(allConversations);
    };

    // --- YARDIMCI DİNLEYİCİ FONKSİYONLARI (Değişiklik yok) ---
    function listenForLastMessage(convoId, type) {
        const path = type === 'dm' ? `dms/${convoId}/messages` : `groups/${convoId}/channels/general/messages`;
        const messagesRef = ref(db, path);
        const lastMessageQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(1));
        
        lastMessageListeners[convoId] = onValue(lastMessageQuery, (msgSnap) => {
            const convoMap = type === 'dm' ? dmConversations : groupConversations;
            const convo = convoMap.get(convoId);
            if (convo) {
                if (msgSnap.exists()) {
                    let lastMsg;
                    msgSnap.forEach(child => { lastMsg = child.val(); });
                    convo.lastMessage = formatMessagePreview(lastMsg);
                    convo.timestamp = lastMsg.timestamp;
                }
                combineAndRender();
            }
        });
    }

    function listenForPresence(convoId, otherUserId) {
        presenceListeners[convoId] = listenToUserPresence(otherUserId, (presenceInfo) => {
            const convo = dmConversations.get(convoId);
            if (convo) {
                convo.presence = presenceInfo.presence;
                combineAndRender();
            }
        });
    }

    // --- ANA VERİ İŞLEME MANTIĞI ---

    let dmListFromDb = {}; // DM listesini geçici olarak burada tut

    // 1. ADIM: Önce kullanıcının DM listesini dinle ve sakla
    const unsubDms = onValue(userConversationsRef, (snapshot) => {
        dmListFromDb = snapshot.exists() ? snapshot.val() : {};
        // Kullanıcı önbelleği zaten doluysa, DM'leri hemen işle
        if (Object.keys(userCache).length > 0) {
            processDms();
        }
    });

    // 2. ADIM: Kullanıcı bilgilerini (cache) dinle
    const unsubUserCache = onValue(userSearchIndexRef, (snapshot) => {
        if (snapshot.exists()) {
            userCache = snapshot.val();
            // Kullanıcı önbelleği yüklendiğinde, saklanan DM listesini işle
            processDms();
        }
    });
    
    // DM'leri işleyen ana fonksiyon
    function processDms() {
        if (!dmListFromDb || !userCache) return; // Gerekli veriler olmadan çalışma

        // Önceki dinleyicileri temizle (kullanıcı silinmişse vb.)
        dmConversations.clear();

        Object.keys(dmListFromDb).forEach(dmId => {
            const otherUserId = dmId.replace(userId, '').replace('_', '');
            const otherUserData = userCache[otherUserId];

            // SADECE EŞLEŞEN KULLANICI BİLGİSİ VARSA LİSTEYE EKLE
            if (otherUserData) {
                dmConversations.set(dmId, {
                    id: dmId, type: 'dm', otherUserId: otherUserId,
                    name: `${otherUserData.username}#${otherUserData.tag}`,
                    avatar: otherUserData.avatar,
                    timestamp: dmListFromDb[dmId].lastMessageTimestamp,
                    lastMessage: "Yükleniyor...",
                    presence: { state: 'offline' },
                });

                if (!lastMessageListeners[dmId]) listenForLastMessage(dmId, 'dm');
                if (!presenceListeners[dmId]) listenForPresence(dmId, otherUserId);
            }
        });
        combineAndRender();
    }


    // 3. ADIM: Grupları dinle (Bu kısım zaten çalışıyor, değişiklik yok)
    const unsubGroups = onValue(userGroupsRef, (snapshot) => {
        if (!snapshot.exists()) {
            Object.values(groupDataListeners).forEach(unsub => unsub());
            groupDataListeners = {};
            groupConversations.clear();
            combineAndRender();
            return;
        }
        
        const groupIds = snapshot.val();
        const currentGroupIds = new Set(Object.keys(groupIds));
        const existingGroupIds = new Set(Object.keys(groupDataListeners));

        for (const groupId of existingGroupIds) {
            if (!currentGroupIds.has(groupId)) {
                groupDataListeners[groupId]();
                delete groupDataListeners[groupId];
                groupConversations.delete(groupId);
            }
        }

        for (const groupId of currentGroupIds) {
            if (!existingGroupIds.has(groupId)) {
                const groupRef = ref(db, `groups/${groupId}`);
                groupDataListeners[groupId] = onValue(groupRef, (groupSnap) => {
                    if (groupSnap.exists()) {
                        const group = groupSnap.val();
                        groupConversations.set(groupId, {
                            id: groupId, type: 'group', name: group.meta.name,
                            avatar: group.meta.avatar || '/assets/group-icon.png',
                            timestamp: group.meta.lastMessageTimestamp || group.meta.createdAt,
                            lastMessage: "Gruba hoş geldin!",
                        });
                        if (!lastMessageListeners[groupId]) listenForLastMessage(groupId, 'group');
                        combineAndRender();
                    } else {
                        groupConversations.delete(groupId);
                        combineAndRender();
                    }
                });
            }
        }
        combineAndRender();
    });

    // Temizleme fonksiyonu
    return () => {
        unsubDms();
        unsubUserCache();
        unsubGroups();
        Object.values(presenceListeners).forEach(unsub => unsub && unsub());
        Object.values(lastMessageListeners).forEach(unsub => unsub && unsub());
        Object.values(groupDataListeners).forEach(unsub => unsub && unsub());
    };
}