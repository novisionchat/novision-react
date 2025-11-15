// --- DOSYA: src/lib/groupManagement.js (GÜNCELLENMİŞ HALİ) ---

import { db } from './firebase';
import { ref, update, set, remove, push, get } from "firebase/database";

/**
 * Grup fotoğrafını günceller.
 */
export async function updateGroupAvatar(groupId, newAvatarUrl) {
    if (!groupId || !newAvatarUrl) {
        throw new Error("Grup ID'si veya yeni fotoğraf URL'i eksik.");
    }
    const updates = {};
    updates[`/groups/${groupId}/meta/avatar`] = newAvatarUrl;
    await update(ref(db), updates);
}

/**
 * Yeni ses kanalı oluşturur.
 * @param {string} groupId - Kanalın oluşturulacağı grup ID'si.
 * @param {string} channelName - Yeni ses kanalının adı.
 */
export async function createVoiceChannel(groupId, channelName) {
    if (!groupId || !channelName.trim()) {
        throw new Error("Grup ID'si veya kanal adı eksik.");
    }
    const newChannelRef = push(ref(db, `/groups/${groupId}/voiceChannels`));
    await set(newChannelRef, { 
        meta: { 
            name: channelName.trim(), 
            createdAt: Date.now() 
        },
        members: {} // Başlangıçta boş üye listesi
    });
}


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
        const otherAdmins = Object.keys(members).filter(key => members[key] === 'admin' || members[key] === 'creator');
        if (otherAdmins.length <= 1 && Object.keys(members).length > 1) {
            throw new Error("Ayrılmak için önce başka bir üyeyi yönetici olarak atamalısınız.");
        }
    }
    const updates = {};
    updates[`/groups/${groupId}/meta/members/${userId}`] = null;
    updates[`/users/${userId}/groups/${userId}`] = null;
    await update(ref(db), updates);
}

export async function removeMemberFromGroup(groupId, memberId) {
    const updates = {};
    updates[`/groups/${groupId}/meta/members/${memberId}`] = null;
    updates[`/users/${memberId}/groups/${groupId}`] = null;
    await update(ref(db), updates);
}