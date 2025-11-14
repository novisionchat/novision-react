// src/components/ChannelList.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';
import styles from './ChannelList.module.css';
import { IoChatbubbleOutline, IoAddCircleOutline } from "react-icons/io5";
import CreateChannelModal from './CreateChannelModal'; 

function ChannelList({ group, currentUser, onSelectChannel, activeChannelId }) {
  const [channels, setChannels] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // group objesinin ve 'members' anahtarının varlığını kontrol et
    if (group && group.members && currentUser) {
      const role = group.members[currentUser.uid];
      setUserRole(role);
    } else {
      // Eğer grup bilgisi tam değilse veya yoksa, rolü null yap
      setUserRole(null);
    }
  }, [group, currentUser]);

  useEffect(() => {
    // Kanal listesini çekmeden önce 'group' objesinin var olduğundan emin ol
    if (!group || !group.id) {
      setChannels([]); // Grup yoksa kanalları temizle
      return;
    };

    const channelsRef = ref(db, `groups/${group.id}/channels`);
    const unsubscribe = onValue(channelsRef, (snapshot) => {
      const channelsData = [];
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          channelsData.push({ id: child.key, ...child.val().meta });
        });
      }
      setChannels(channelsData);
    });
    return () => unsubscribe();
  }, [group]);

  const handleCreateChannelClick = () => {
    setIsModalOpen(true);
  };
  
  const canManageChannels = userRole === 'creator' || userRole === 'admin';

  // YENİ: Eğer grup bilgisi henüz yüklenmediyse bir yükleniyor durumu gösterilebilir.
  if (!group) {
    return <div className={styles.loader}>Yükleniyor...</div>;
  }

  return (
    <>
      <div className={styles.channelListContainer}>
        <div className={styles.channelListHeader}>
          <h4>KANALLAR</h4>
          {canManageChannels && (
            <button onClick={handleCreateChannelClick} className={styles.addChannelBtn} title="Yeni Kanal Oluştur">
              <IoAddCircleOutline size={22} />
            </button>
          )}
        </div>
        <ul>
          {channels.map(channel => (
            <li key={channel.id}>
              <button 
                className={`${styles.channelButton} ${activeChannelId === channel.id ? styles.active : ''}`}
                onClick={() => onSelectChannel(channel.id)}
              >
                <IoChatbubbleOutline />
                <span>{channel.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      
      <CreateChannelModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        groupId={group?.id}
      />
    </>
  );
}

export default ChannelList;