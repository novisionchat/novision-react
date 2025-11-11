// src/lib/groupManagement.js
import { db } from './firebase';
import { ref, update, set, remove, push, get } from "firebase/database";

/**
 * Grup fotoğrafını günceller.
 * @param {string} groupId - Güncellenecek grubun ID'si.
 * @param {string} newAvatarUrl - Cloudinary'den alınan yeni fotoğraf URL'i.
 */
export async function updateGroupAvatar(groupId, newAvatarUrl) {
    if (!groupId || !newAvatarUrl) {
        throw new Error("Grup ID'si veya yeni fotoğraf URL'i eksik.");
    }
    const updates = {};
    updates[`/groups/${groupId}/meta/avatar`] = newAvatarUrl;
    await update(ref(db), updates);
}

// ---- DİĞER FONKSİYONLAR ----
// Bu fonksiyonlar önceki halleriyle aynı kalacak, tamlık için eklenmiştir.

export async function updateGroupInfo(groupId, newName) {
    const updates = {};
    if (newName) updates[`/groups/${groupId}/meta/name`] = newName;
    if (Object.keys(updates).length > 0) await update(ref(db), updates);
}

export async function setMemberRole(groupId, memberId, newRole) {
    if (newRole !== 'admin' && newRole !== 'member') throw new Error("Geçersiz rol.");
    await set(ref(db, `/groups/${groupId}/meta/members/${memberId}`), newRole);
}

export async function addMembersToGroup(groupId, memberUids) {
    const updates = {};
    memberUids.forEach(uid => {
        updates[`/groups/${groupId}/meta/members/${uid}`] = 'member';
        updates[`/users/${uid}/groups/${groupId}`] = true;
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
    const members = snapshot.val().meta.members;
    if (members[userId] === 'creator') {
        const otherAdmins = Object.values(members).filter(role => role === 'admin' || role === 'creator');
        if (otherAdmins.length <= 1) throw new Error("Ayrılmak için başka bir yönetici atayın.");
    }
    const updates = {};
    updates[`/groups/${groupId}/meta/members/${userId}`] = null;
    updates[`/users/${userId}/groups/${groupId}`] = null;
    await update(ref(db), updates);
}

export async function removeMemberFromGroup(groupId, memberId) {
    const updates = {};
    updates[`/groups/${groupId}/meta/members/${memberId}`] = null;
    updates[`/users/${memberId}/groups/${groupId}`] = null;
    await update(ref(db), updates);
}