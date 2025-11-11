// src/lib/groups.js
import { db } from './firebase';
import { ref as dbRef, push, update } from "firebase/database";

export async function createGroup(groupName, memberUids, creator) {
    if (!groupName) throw new Error("Grup adı boş olamaz.");
    if (!creator) throw new Error("Grup oluşturucu bilgisi eksik.");

    const allMemberUids = [...new Set([...memberUids, creator.uid])];

    if (allMemberUids.length < 2) {
        throw new Error("Bir grup en az 2 kişiden oluşmalıdır.");
    }

    try {
        const newGroupRef = push(dbRef(db, 'groups'));
        const groupId = newGroupRef.key;

        // YENİ: Rol tabanlı üye listesi oluştur
        const membersWithRoles = allMemberUids.reduce((acc, uid) => {
            acc[uid] = (uid === creator.uid) ? 'creator' : 'member';
            return acc;
        }, {});

        const groupData = {
            meta: {
                id: groupId,
                name: groupName,
                creator: creator.uid,
                createdAt: Date.now(),
                avatar: '/assets/group-icon.png',
                members: membersWithRoles // Güncellenmiş üye listesi
            },
            channels: {
                'general': {
                    meta: {
                        name: 'genel',
                        createdAt: Date.now()
                    }
                }
            }
        };

        const updates = {};
        updates[`/groups/${groupId}`] = groupData;
        allMemberUids.forEach(uid => {
            updates[`/users/${uid}/groups/${groupId}`] = true;
        });

        await update(dbRef(db), updates);
        return groupData;

    } catch (error) {
        console.error("Grup oluşturma hatası:", error);
        throw error;
    }
}