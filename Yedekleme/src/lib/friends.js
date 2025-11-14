// src/lib/friends.js (GÜNCELLENMİŞ)
import { db } from './firebase.js';
import { ref, get, set, onValue, remove } from "firebase/database"; // remove eklendi

// Kişi ekleme (değişiklik yok)
export async function saveContact(currentUser, targetTag) {
    const [username, tag] = targetTag.split('#');
    if (!username || !tag || !/^\d{4}$/.test(tag)) {
        throw new Error("Geçersiz format. 'kullaniciadi#1234' şeklinde girin.");
    }
    if (!currentUser?.uid) {
        throw new Error("Geçerli kullanıcı bulunamadı.");
    }
    const searchIndexRef = ref(db, 'userSearchIndex');
    const snapshot = await get(searchIndexRef);
    if (!snapshot.exists()) {
        throw new Error("Kullanıcı veritabanı bulunamadı.");
    }
    const allUsers = snapshot.val();
    let targetUid = null;
    for (const uid in allUsers) {
        const user = allUsers[uid];
        if (user.username.toLowerCase() === username.toLowerCase() && String(user.tag) === tag) {
            targetUid = uid;
            break;
        }
    }
    if (!targetUid) {
        throw new Error("Bu kullanıcı adı ve etikete sahip kimse bulunamadı.");
    }
    if (targetUid === currentUser.uid) {
        throw new Error("Kendinizi kişi olarak ekleyemezsiniz.");
    }
    const contactRef = ref(db, `users/${currentUser.uid}/contacts/${targetUid}`);
    await set(contactRef, true);
    return { username, tag };
}

// Kişi listesini dinleme (değişiklik yok)
export function listenForContacts(userId, callback) {
    const contactsRef = ref(db, `users/${userId}/contacts`);
    return onValue(contactsRef, async (snapshot) => {
        if (!snapshot.exists()) {
            callback([]);
            return;
        }
        const contactUids = Object.keys(snapshot.val());
        const contactPromises = contactUids.map(uid => get(ref(db, `userSearchIndex/${uid}`)));
        const contactSnapshots = await Promise.all(contactPromises);
        const contacts = contactSnapshots
            .map((snap, index) => snap.exists() ? { uid: contactUids[index], ...snap.val() } : null)
            .filter(Boolean);
        callback(contacts);
    });
}

// YENİ EKLENDİ: Kişi silme fonksiyonu
export async function removeContact(userId, contactId) {
    const contactRef = ref(db, `users/${userId}/contacts/${contactId}`);
    try {
        await remove(contactRef);
        console.log(`Kişi (${contactId}) silindi.`);
    } catch (error) {
        console.error("Kişi silinirken hata oluştu:", error);
        throw new Error("Kişi silinemedi.");
    }
}