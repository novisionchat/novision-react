// src/lib/groupManagement.js

import { db } from './firebase';
import { ref, update, set, remove, push, get } from "firebase/database";

export async function updateGroupAvatar(groupId, newAvatarUrl) {
    if (!groupId || !newAvatarUrl) {
        throw new Error("Grup ID'si veya yeni fotoğraf URL'i eksik.");
    }
    const updates = {};
    updates[`/groups/${groupId}/meta/avatar`] = newAvatarUrl;
    await update(ref(db), updates);
}

export async function createVoiceChannel(groupId, channelName) {
    if (!groupId || !channelName.trim()) {
        throw new Error("Grup ID'si veya kanal adı eksik.");
    }
    const newChannelRef = push(ref(db, `/groups/${groupId}/voiceChannels`));
    await set(newChannelRef, { 
        meta: { name: channelName.trim(), createdAt: Date.now() },
        members: {}
    });
}

export async function updateGroupInfo(groupId, newName) {
    const updates = {};
    if (newName) updates[`/groups/${groupId}/meta/name`] = newName;
    if (Object.keys(updates).length > 0) await update(ref(db), updates);
}

export async function setMemberRole(groupId, memberId, newRole) {
    if (newRole !== 'admin' && newRole !== 'member') throw new Error("Geçersiz rol.");
    // NOT: `meta/members` yolu `members` olarak değiştirildi, grup yapınızla eşleşmesi için.
    await set(ref(db, `/groups/${groupId}/members/${memberId}`), newRole);
}

export async function addMembersToGroup(groupId, memberUids) {
    const updates = {};
    memberUids.forEach(uid => {
        // NOT: `meta/members` yolu `members` olarak değiştirildi.
        updates[`/groups/${groupId}/members/${uid}`] = 'member';
        updates[`/users/${uid}/groups/${groupId}`] = { lastMessageTimestamp: Date.now() }; // `true` yerine obje
    });
    await update(ref(db), updates);
}

export async function createChannel(groupId, channelName) {
    const newChannelRef = push(ref(db, `/groups/${groupId}/channels`));
    await set(newChannelRef, { meta: { name: channelName, createdAt: Date.now() } });
}

export async function deleteChannel(groupId, channelId) {
    if (channelId === 'general') throw new Error("'genel' kanalı silinemez.");
    await remove(ref(db, `/groups/${groupId}/channels/${channelId}`));
}

export async function leaveGroup(groupId, userId) {
    const groupRef = ref(db, `groups/${groupId}`);
    const snapshot = await get(groupRef);
    if (!snapshot.exists()) throw new Error("Grup bulunamadı.");
    const members = snapshot.val().members; // `meta/members` -> `members`
    if (members[userId] === 'creator') {
        const otherAdmins = Object.keys(members).filter(key => members[key] === 'admin' || members[key] === 'creator');
        if (otherAdmins.length <= 1 && Object.keys(members).length > 1) {
            throw new Error("Ayrılmak için önce başka bir üyeyi yönetici olarak atamalısınız.");
        }
    }
    const updates = {};
    updates[`/groups/${groupId}/members/${userId}`] = null;
    updates[`/users/${userId}/groups/${groupId}`] = null; // `userId` yerine `groupId` olmalıydı
    await update(ref(db), updates);
}

export async function removeMemberFromGroup(groupId, memberId) {
    const updates = {};
    updates[`/groups/${groupId}/members/${memberId}`] = null; // `meta/members` -> `members`
    updates[`/users/${memberId}/groups/${groupId}`] = null;
    await update(ref(db), updates);
}

// --- YENİ EKLENEN FONKSİYON ---
/**
 * Bir kullanıcının belirli bir grup için bildirim ayarını değiştirir.
 * @param {string} userId Kullanıcının ID'si
 * @param {string} groupId Grubun ID'si
 * @param {boolean} isEnabled Bildirimler açık mı (true) kapalı mı (false)
 */
export async function setGroupNotificationPreference(userId, groupId, isEnabled) {
    if (!userId || !groupId) {
        throw new Error("Kullanıcı veya Grup ID'si eksik.");
    }
    const path = `users/${userId}/groups/${groupId}/notificationsEnabled`;
    const prefRef = ref(db, path);
    await set(prefRef, isEnabled);
}