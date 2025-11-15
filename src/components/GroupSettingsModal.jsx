// src/components/GroupSettingsModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import styles from './GroupSettingsModal.module.css';
import { db } from '../lib/firebase';
import { ref, onValue, get } from 'firebase/database';
import { IoClose, IoTrash } from 'react-icons/io5';
import { FaBell, FaBellSlash } from 'react-icons/fa'; // YENİ: İkonlar eklendi
import * as groupMgmt from '../lib/groupManagement';
import { uploadToCloudinary } from '../lib/cloudinary';

// Üye listesindeki her bir eleman için ayrı bileşen (Tam Hali)
const MemberItem = ({ member, role, isCreator, groupId }) => {
    const handlePromote = () => groupMgmt.setMemberRole(groupId, member.uid, 'admin').catch(alert);
    const handleDemote = () => groupMgmt.setMemberRole(groupId, member.uid, 'member').catch(alert);
    const handleRemove = () => {
        if (confirm(`${member.username} kişisini gruptan çıkarmak istediğinizden emin misiniz?`)) {
            groupMgmt.removeMemberFromGroup(groupId, member.uid).catch(alert);
        }
    };

    return (
        <li className={styles.memberItem}>
            <img src={member.avatar || '/assets/icon.png'} alt={member.username} />
            <div className={styles.memberInfo}>
                <span className={styles.memberName}>{member.username}#{member.tag}</span>
                <span className={styles.memberRole}>{role}</span>
            </div>
            {isCreator && role !== 'creator' && (
                <div className={styles.memberActions}>
                    {role === 'member' 
                        ? <button onClick={handlePromote} className={styles.actionButton}>Yönetici Yap</button>
                        : <button onClick={handleDemote} className={styles.actionButton}>Görevi Al</button>
                    }
                    <button onClick={handleRemove} className={`${styles.actionButton} ${styles.dangerButton}`}>
                        <IoTrash />
                    </button>
                </div>
            )}
        </li>
    );
};


// Ana Modal Bileşeni (Tam Hali)
function GroupSettingsModal({ isOpen, onClose, group, currentUser }) {
    const [groupData, setGroupData] = useState(null);
    const [membersInfo, setMembersInfo] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Avatar yönetimi
    const [previewAvatar, setPreviewAvatar] = useState('');
    const [newAvatarFile, setNewAvatarFile] = useState(null);
    const fileInputRef = useRef(null);

    // Üye ekleme yönetimi
    const [newMemberTag, setNewMemberTag] = useState("");
    const [searchedUser, setSearchedUser] = useState(null);

    // YENİ STATE: Bildirim ayarlarını tutmak için
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    // Yetki kontrolü
    const currentUserRole = groupData?.meta.members[currentUser.uid];
    const canManage = currentUserRole === 'creator' || currentUserRole === 'admin';
    
    useEffect(() => {
        if (!isOpen || !group?.id) {
            setGroupData(null); 
            setNewAvatarFile(null); 
            setIsLoading(true);
            setSearchedUser(null); 
            setNewMemberTag("");
            return;
        }
        
        setIsLoading(true);
        const groupRef = ref(db, `groups/${group.id}`);
        const unsubscribe = onValue(groupRef, async (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                setGroupData(data);
                
                if (!newAvatarFile) {
                    setPreviewAvatar(data.meta.avatar);
                }

                // YENİ EKLENEN BÖLÜM: Kullanıcının bu grup için bildirim ayarını çek
                const userGroupSettingsRef = ref(db, `users/${currentUser.uid}/groups/${group.id}/notificationsEnabled`);
                get(userGroupSettingsRef).then(snap => {
                    // Eğer veritabanında ayar hiç yapılmamışsa (null/undefined), varsayılan olarak açık (true) kabul ediyoruz.
                    // Eğer false olarak ayarlanmışsa, kapalı (false) kabul ediyoruz.
                    setNotificationsEnabled(snap.exists() ? snap.val() : true);
                });
                // --- YENİ BÖLÜM SONU ---
                
                const memberUids = Object.keys(data.meta.members);
                const memberPromises = memberUids.map(uid => get(ref(db, `userSearchIndex/${uid}`)));
                const memberSnaps = await Promise.all(memberPromises);
                const detailedMembers = memberSnaps.map(snap => snap.exists() ? { uid: snap.key, ...snap.val() } : null).filter(Boolean);
                
                setMembersInfo(detailedMembers);
                setIsLoading(false);
            } else {
                setIsLoading(false);
            }
        });
        return () => unsubscribe();
    }, [isOpen, group?.id, newAvatarFile, currentUser.uid]); // currentUser.uid bağımlılıklara eklendi
    
    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setNewAvatarFile(file);
            setPreviewAvatar(URL.createObjectURL(file));
        }
    };

    const handleSaveChanges = async () => {
        if (!newAvatarFile) return;
        setIsSaving(true);
        try {
            const result = await uploadToCloudinary(newAvatarFile, { folder: 'group_avatars' });
            await groupMgmt.updateGroupAvatar(group.id, result.url);
            setNewAvatarFile(null);
            alert("Grup fotoğrafı güncellendi!");
        } catch (error) {
            alert(`Hata: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleSearchUser = async () => {
        const [username, tag] = newMemberTag.split('#');
        if (!username || !tag) return alert("Geçersiz format. 'kullanici#1234' şeklinde girin.");
        const snapshot = await get(ref(db, 'userSearchIndex'));
        if (snapshot.exists()) {
            let foundUser = null;
            snapshot.forEach(child => {
                const user = child.val();
                if (user.username.toLowerCase() === username.toLowerCase() && String(user.tag) === tag) {
                    foundUser = { uid: child.key, ...user };
                }
            });
            if (foundUser) setSearchedUser(foundUser);
            else alert("Kullanıcı bulunamadı.");
        }
    };

    const handleAddMember = async () => {
        if (!searchedUser) return;
        if (groupData.meta.members[searchedUser.uid]) return alert("Bu kullanıcı zaten grupta.");
        try {
            await groupMgmt.addMembersToGroup(group.id, [searchedUser.uid]);
            setSearchedUser(null);
            setNewMemberTag("");
            alert(`${searchedUser.username} gruba eklendi!`);
        } catch (error) {
            alert(error.message);
        }
    };

    const handleLeaveGroup = async () => {
        if (confirm("Gruptan ayrılmak istediğinizden emin misiniz? Bu işlem geri alınamaz.")) {
            try {
                await groupMgmt.leaveGroup(group.id, currentUser.uid);
                onClose();
            } catch (error) {
                alert(error.message);
            }
        }
    };
    
    // YENİ FONKSİYON: Bildirim ayarını değiştirmek için
    const handleToggleNotifications = async () => {
        try {
            const newPreference = !notificationsEnabled;
            await groupMgmt.setGroupNotificationPreference(currentUser.uid, group.id, newPreference);
            setNotificationsEnabled(newPreference); // UI'ı anında güncelle
        } catch (error) {
            alert("Bildirim ayarı değiştirilemedi: " + error.message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>Grup Ayarları</h2>
                    <button onClick={onClose} className={styles.modalCloseBtn} disabled={isSaving}>
                        <IoClose size={28} />
                    </button>
                </div>
                
                {isLoading ? <div className={styles.loader}>Yükleniyor...</div> : groupData ? (
                    <div className={styles.modalBody}>
                        {/* Grup Bilgileri ve Fotoğraf Bölümü */}
                        <div className={styles.section}>
                            <div className={styles.groupInfoSection}>
                                <div 
                                    className={styles.avatarContainer} 
                                    onClick={() => canManage && fileInputRef.current.click()}
                                    title={canManage ? "Fotoğrafı değiştir" : ""}
                                >
                                    <img src={previewAvatar || '/assets/group-icon.png'} alt="Grup Avatarı" className={styles.groupAvatar} />
                                    {canManage && <input type="file" accept="image/*,image/gif" ref={fileInputRef} onChange={handleAvatarChange} style={{display: 'none'}} />}
                                </div>
                                <div className={styles.groupNameContainer}>
                                    <h3 className={styles.groupName}>{groupData.meta.name}</h3>
                                </div>
                            </div>
                            {newAvatarFile && (
                                <button onClick={handleSaveChanges} className={styles.primaryBtn} disabled={isSaving}>
                                    {isSaving ? 'Kaydediliyor...' : 'Fotoğrafı Kaydet'}
                                </button>
                            )}
                        </div>
                        
                        {/* Üyeler Bölümü */}
                        <div className={styles.section}>
                            <h4>ÜYELER ({membersInfo.length})</h4>
                            <ul className={styles.memberList}>
                                {membersInfo.map(member => (
                                    <MemberItem key={member.uid} member={member} role={groupData.meta.members[member.uid]} isCreator={currentUserRole === 'creator'} groupId={group.id} />
                                ))}
                            </ul>
                        </div>
                        
                        {/* Üye Ekleme Bölümü */}
                        {canManage && (
                            <div className={styles.section}>
                                <h4>ÜYE EKLE</h4>
                                <div className={styles.inputGroup}>
                                    <input type="text" className={styles.textInput} placeholder="kullanici#1234" value={newMemberTag} onChange={e => setNewMemberTag(e.target.value)} />
                                    <button onClick={handleSearchUser} className={styles.actionButton}>Bul</button>
                                </div>
                                {searchedUser && (
                                    <div className={styles.searchedUser}>
                                        <span>{searchedUser.username}#{searchedUser.tag}</span>
                                        <button onClick={handleAddMember} className={styles.actionButton}>Gruba Ekle</button>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* YENİ EKLENEN BÖLÜM: BİLDİRİM AYARLARI */}
                        <div className={styles.section}>
                            <h4>BİLDİRİMLER</h4>
                            <button 
                                onClick={handleToggleNotifications} 
                                className={styles.actionButton} 
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}
                            >
                                {notificationsEnabled ? <FaBellSlash/> : <FaBell/>}
                                {notificationsEnabled ? 'Bu Gruptan Bildirimleri Kapat' : 'Bu Gruptan Bildirimleri Aç'}
                            </button>
                        </div>
                        
                        {/* Gruptan Ayrılma Butonu */}
                        <button onClick={handleLeaveGroup} className={`${styles.primaryBtn} ${styles.dangerButton}`}>
                            Gruptan Ayrıl
                        </button>
                    </div>
                ) : (
                    <div className={styles.loader}>Grup bilgileri yüklenemedi veya artık bu grubun üyesi değilsiniz.</div>
                )}
            </div>
        </div>
    );
}

export default GroupSettingsModal;