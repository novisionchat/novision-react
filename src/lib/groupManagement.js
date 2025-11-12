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

/**
 * Grup aramasını başlatır ve Firebase'de aktif olarak işaretler.
 * @param {string} groupId 
 * @param {string} groupName 
 * @param {{uid: string, displayName: string}} user - Aramayı başlatan kullanıcı
 * @returns {object} Grup araması verisi
 */
export async function startGroupCall(groupId, groupName, user) {
    const callData = {
        callId: groupId,
        channelName: groupId,
        groupId,
        groupName,
        status: 'active',
        timestamp: Date.now(),
        type: 'group',
        participants: {
            [user.uid]: { 
                name: user.displayName, 
                isVideo: true, 
                isAudio: true 
            }
        }
    };
    await set(ref(db, `groups/${groupId}/activeCall`), callData);
    return callData;
}

/**
 * Kullanıcıyı aktif aramaya ekler/günceller.
 * @param {string} groupId 
 * @param {string} userId 
 * @param {string} userName 
 * @param {boolean} isVideo 
 * @param {boolean} isAudio 
 */
export async function updateGroupCallParticipant(groupId, userId, userName, isVideo, isAudio) {
    const participantRef = ref(db, `groups/${groupId}/activeCall/participants/${userId}`);
    await set(participantRef, { 
        name: userName, 
        isVideo, 
        isAudio 
    });
}

/**
 * Kullanıcıyı aktif aramadan çıkarır ve gerekirse aramayı sonlandırır.
 * @param {string} groupId 
 * @param {string} userId 
 */
export async function removeGroupCallParticipant(groupId, userId) {
    const callRef = ref(db, `groups/${groupId}/activeCall`);
    const snapshot = await get(callRef);
    if (!snapshot.exists()) return;

    const callData = snapshot.val();
    const updates = {};
    updates[`groups/${groupId}/activeCall/participants/${userId}`] = null;
    
    const remainingParticipants = callData.participants ? Object.keys(callData.participants).filter(uid => uid !== userId) : [];
    
    if (remainingParticipants.length === 0) {
        updates[`groups/${groupId}/activeCall`] = null;
    }

    await update(ref(db), updates);
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