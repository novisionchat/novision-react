// --- DOSYA: src/lib/conversations.js ---

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

    let dmListFromDb = {};

    const unsubDms = onValue(userConversationsRef, (snapshot) => {
        dmListFromDb = snapshot.exists() ? snapshot.val() : {};
        if (Object.keys(userCache).length > 0) {
            processDms();
        }
    });

    const unsubUserCache = onValue(userSearchIndexRef, (snapshot) => {
        if (snapshot.exists()) {
            userCache = snapshot.val();
            processDms();
        }
    });
    
    function processDms() {
        if (!dmListFromDb || !userCache) return;

        const currentDmIds = new Set(Object.keys(dmListFromDb));
        const existingDmIds = new Set(dmConversations.keys());

        // Silinmiş DM'leri ve dinleyicileri temizle
        for (const dmId of existingDmIds) {
            if (!currentDmIds.has(dmId)) {
                if (lastMessageListeners[dmId]) {
                    lastMessageListeners[dmId]();
                    delete lastMessageListeners[dmId];
                }
                if (presenceListeners[dmId]) {
                    presenceListeners[dmId]();
                    delete presenceListeners[dmId];
                }
                dmConversations.delete(dmId);
            }
        }

        Object.keys(dmListFromDb).forEach(dmId => {
            const otherUserId = dmId.replace(userId, '').replace('_', '');
            const otherUserData = userCache[otherUserId];

            if (otherUserData) {
                // GÜNCELLEME: Mevcut sohbet bilgisini al veya yeni oluştur
                const conversationData = dmListFromDb[dmId];
                const existingConvo = dmConversations.get(dmId) || {};

                dmConversations.set(dmId, {
                    ...existingConvo, // Varsa eski bilgileri koru (lastMessage gibi)
                    id: dmId, 
                    type: 'dm', 
                    otherUserId: otherUserId,
                    name: `${otherUserData.username}#${otherUserData.tag}`,
                    avatar: otherUserData.avatar,
                    timestamp: conversationData.lastMessageTimestamp,
                    lastMessage: existingConvo.lastMessage || "Yükleniyor...",
                    presence: existingConvo.presence || { state: 'offline' },
                    // --- KRİTİK DÜZELTME BURADA ---
                    // unreadCount bilgisini veritabanından gelen veriden alıp ekliyoruz.
                    unreadCount: conversationData.unreadCount || 0,
                });

                if (!lastMessageListeners[dmId]) listenForLastMessage(dmId, 'dm');
                if (!presenceListeners[dmId]) listenForPresence(dmId, otherUserId);
            }
        });
        combineAndRender();
    }

    const unsubGroups = onValue(userGroupsRef, (snapshot) => {
        if (!snapshot.exists()) {
            Object.values(groupDataListeners).forEach(unsub => unsub());
            groupDataListeners = {};
            groupConversations.clear();
            combineAndRender();
            return;
        }
        
        const groupListFromDb = snapshot.val();
        const currentGroupIds = new Set(Object.keys(groupListFromDb));
        const existingGroupIds = new Set(groupConversations.keys());

        for (const groupId of existingGroupIds) {
            if (!currentGroupIds.has(groupId)) {
                if (groupDataListeners[groupId]) {
                    groupDataListeners[groupId]();
                    delete groupDataListeners[groupId];
                }
                 if (lastMessageListeners[groupId]) {
                    lastMessageListeners[groupId]();
                    delete lastMessageListeners[groupId];
                }
                groupConversations.delete(groupId);
            }
        }

        for (const groupId of currentGroupIds) {
            // GÜNCELLEME: Grup verisini ve unreadCount'ı al
            const groupDataFromUser = groupListFromDb[groupId];

            if (!groupConversations.has(groupId)) {
                const groupRef = ref(db, `groups/${groupId}`);
                groupDataListeners[groupId] = onValue(groupRef, (groupSnap) => {
                    if (groupSnap.exists()) {
                        const groupMeta = groupSnap.val().meta;
                        groupConversations.set(groupId, {
                            id: groupId, 
                            type: 'group', 
                            name: groupMeta.name,
                            avatar: groupMeta.avatar || '/assets/group-icon.png',
                            timestamp: groupDataFromUser.lastMessageTimestamp || groupMeta.createdAt,
                            lastMessage: "Gruba hoş geldin!",
                            // --- KRİTİK DÜZELTME BURADA ---
                            // unreadCount bilgisini veritabanından gelen veriden alıp ekliyoruz.
                            unreadCount: groupDataFromUser.unreadCount || 0,
                        });
                        if (!lastMessageListeners[groupId]) listenForLastMessage(groupId, 'group');
                        combineAndRender();
                    } else {
                        groupConversations.delete(groupId);
                        combineAndRender();
                    }
                });
            } else {
                 // Zaten var olan grup için sadece unreadCount'u güncelle
                 const existingGroup = groupConversations.get(groupId);
                 if (existingGroup) {
                    existingGroup.unreadCount = groupDataFromUser.unreadCount || 0;
                    existingGroup.timestamp = groupDataFromUser.lastMessageTimestamp || existingGroup.timestamp;
                 }
            }
        }
        combineAndRender();
    });

    return () => {
        unsubDms();
        unsubUserCache();
        unsubGroups();
        Object.values(presenceListeners).forEach(unsub => unsub && unsub());
        Object.values(lastMessageListeners).forEach(unsub => unsub && unsub());
        Object.values(groupDataListeners).forEach(unsub => unsub && unsub());
    };
}