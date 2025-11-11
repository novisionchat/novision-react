// src/lib/typing.js
import { db } from './firebase.js';
import { ref, set, onValue, remove, serverTimestamp } from "firebase/database";

const typingTimeouts = new Map();

function getTypingRef(chatId, chatType, userId) {
    const type = chatType === 'dm' ? 'dm' : 'group';
    const path = `typing/${type}/${chatId}/${userId}`;
    return ref(db, path);
}

export function setTypingStatus(chatId, chatType, userId, userName, isTyping) {
    if (!chatId || !userId) return;

    const typingRef = getTypingRef(chatId, chatType, userId);
    const timeoutKey = `${chatType}-${chatId}-${userId}`;

    if (typingTimeouts.has(timeoutKey)) {
        clearTimeout(typingTimeouts.get(timeoutKey));
    }

    if (isTyping) {
        set(typingRef, {
            userName: userName,
            timestamp: serverTimestamp()
        });
        const newTimeout = setTimeout(() => remove(typingRef), 3000);
        typingTimeouts.set(timeoutKey, newTimeout);
    } else {
        remove(typingRef);
    }
}

export function listenToTyping(chatId, chatType, currentUserId, callback) {
    const type = chatType === 'dm' ? 'dm' : 'group';
    const listenPath = `typing/${type}/${chatId}`;
    const typingRef = ref(db, listenPath);

    return onValue(typingRef, (snapshot) => {
        const typingUsers = [];
        if (snapshot.exists()) {
            const typingData = snapshot.val();
            // snapshot.forEach yerine Object.keys kullanmak daha güvenilirdir.
            for (const userId in typingData) {
                // Gelen verinin ID'si, dinleyen kullanıcının ID'sinden farklıysa listeye ekle.
                if (userId !== currentUserId) {
                    typingUsers.push(typingData[userId].userName);
                }
            }
        }
        // Sonucu her zaman (boş bile olsa) callback ile bildir.
        callback(typingUsers);
    }, (error) => {
        console.error("[TYPING] Dinleme hatası:", error);
    });
}