// src/components/CreateGroupModal.jsx
import React, { useState } from 'react';
import styles from './CreateGroupModal.module.css';
import { IoClose } from 'react-icons/io5';
import { createGroup } from '../lib/groups';
import { auth } from '../lib/firebase';

// --- CHECKBOX SORUNUNU ÇÖZEN GÜNCELLEME ---
// Bileşeni React.memo ile sarmalıyoruz.
// Bu, sadece `isSelected` gibi prop'lar değiştiğinde bileşenin yeniden render edilmesini sağlar.
const FriendSelectItem = React.memo(({ friend, onToggle, isSelected }) => {
  return (
    <li className={styles.friendItem} onClick={() => onToggle(friend.uid)}>
      <img src={friend.avatar} alt={friend.username} />
      <span className={styles.friendName}>{`${friend.username}#${friend.tag}`}</span>
      <input type="checkbox" checked={isSelected} readOnly />
    </li>
  );
});

function CreateGroupModal({ isOpen, onClose, friends }) {
  const [groupName, setGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const currentUser = auth.currentUser;

  const handleToggleFriend = (friendId) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert("Lütfen bir grup adı girin.");
      return;
    }
    if (!currentUser) {
      alert("Kullanıcı oturumu bulunamadı.");
      return;
    }
    
    setIsLoading(true);
    try {
      await createGroup(groupName, selectedFriends, currentUser);
      alert(`'${groupName}' grubu başarıyla oluşturuldu!`);
      handleClose(); // State'i sıfırlayıp kapatan fonksiyonu çağır
    } catch (error) {
      alert(`Grup oluşturulamadı: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setGroupName('');
    setSelectedFriends([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalCloseBtn} onClick={handleClose}><IoClose size={28} /></button>
        <h2>Yeni Grup Oluştur</h2>
        
        <div className={styles.inputSection}>
          <label htmlFor="group-name">Grup Adı</label>
          <input 
            id="group-name" 
            type="text" 
            placeholder="Grubunuza bir isim verin..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
        </div>

        <div className={styles.friendListSection}>
          <h4>Kişilerini Davet Et ({selectedFriends.length})</h4>
          {friends.length > 0 ? (
            <ul className={styles.friendList}>
              {friends.map(friend => (
                <FriendSelectItem 
                  key={friend.uid} 
                  friend={friend} 
                  onToggle={handleToggleFriend}
                  isSelected={selectedFriends.includes(friend.uid)}
                />
              ))}
            </ul>
          ) : (
            <p className={styles.noFriends}>Davet edilecek kişi bulunamadı.</p>
          )}
        </div>

        <button className={styles.primaryBtn} onClick={handleCreateGroup} disabled={isLoading}>
          {isLoading ? 'Oluşturuluyor...' : 'Grubu Oluştur'}
        </button>
      </div>
    </div>
  );
}

export default CreateGroupModal;