// --- DOSYA: src/components/ChannelList.jsx (TÜM MANTIK HATALARI DÜZELTİLMİŞ NİHAİ HALİ) ---

import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';
import styles from './ChannelList.module.css';
import { IoChatbubbleOutline, IoAddCircleOutline, IoVolumeMedium } from "react-icons/io5";
import CreateChannelModal from './CreateChannelModal'; 
import CreateVoiceChannelModal from './CreateVoiceChannelModal';
import { useVoiceChannel } from '../context/VoiceChannelContext';

function ChannelList({ group, currentUser, onSelectChannel, activeChannelId }) {
  const [channels, setChannels] = useState([]);
  const [voiceChannels, setVoiceChannels] = useState([]);
  const [voiceChannelMembers, setVoiceChannelMembers] = useState({});
  const [userRole, setUserRole] = useState(null);
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // DEĞİŞİKLİK: leaveChannel fonksiyonunu da context'ten alıyoruz
  const { joinChannel, leaveChannel, currentChannel } = useVoiceChannel();

  useEffect(() => {
    if (group && group.members && currentUser) {
      const role = group.members[currentUser.uid];
      setUserRole(role);
      // HATA AYIKLAMA: Rolün doğru gelip gelmediğini kontrol edelim
      console.log(`[ChannelList] Kullanıcı rolü ayarlandı: ${role} (Grup: ${group.name})`);
    } else {
      setUserRole(null);
    }
  }, [group, currentUser]);

  useEffect(() => {
    if (!group || !group.id) {
      setChannels([]);
      setVoiceChannels([]);
      return;
    };

    const channelsRef = ref(db, `groups/${group.id}/channels`);
    const unsubChannels = onValue(channelsRef, (snapshot) => {
      const channelsData = [];
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          channelsData.push({ id: child.key, ...child.val().meta });
        });
      }
      setChannels(channelsData);
    });

    const voiceChannelsRef = ref(db, `groups/${group.id}/voiceChannels`);
    const unsubVoiceChannels = onValue(voiceChannelsRef, (snapshot) => {
        const voiceData = [];
        const memberData = {};
        if(snapshot.exists()) {
            snapshot.forEach(child => {
                const val = child.val();
                voiceData.push({ id: child.key, ...val.meta });
                memberData[child.key] = val.members ? Object.values(val.members) : [];
            });
        }
        setVoiceChannels(voiceData);
        setVoiceChannelMembers(memberData);
    });

    return () => {
      unsubChannels();
      unsubVoiceChannels();
    };
  }, [group]);

  // YENİ FONKSİYON: Kanala tıklama mantığını yönetir
  const handleVoiceChannelClick = (channel) => {
    // Eğer tıklanan kanal zaten bağlı olduğumuz kanalsa, kanaldan ayrıl
    if (currentChannel?.channelId === channel.id) {
      leaveChannel();
    } else {
      // Değilse, o kanala katıl
      joinChannel(group.id, channel.id, channel.name);
    }
  };

  const canManageChannels = userRole === 'creator' || userRole === 'admin';

  if (!group) {
    return <div className={styles.loader}>Yükleniyor...</div>;
  }

  return (
    <>
      <div className={styles.channelListContainer}>
        <div className={styles.channelListHeader}>
          <h4>METİN KANALLARI</h4>
          {canManageChannels && (
            <button onClick={() => setIsTextModalOpen(true)} className={styles.addChannelBtn} title="Yeni Metin Kanalı Oluştur">
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

        <div className={`${styles.channelListHeader} ${styles.voiceHeader}`}>
          <h4>SES KANALLARI</h4>
          {canManageChannels && (
            <button onClick={() => setIsVoiceModalOpen(true)} className={styles.addChannelBtn} title="Yeni Ses Kanalı Oluştur">
              <IoAddCircleOutline size={22} />
            </button>
          )}
        </div>
        <ul>
            {voiceChannels.map(channel => (
                <li key={channel.id} className={styles.voiceChannelItem}>
                    <button
                        className={`${styles.channelButton} ${currentChannel?.channelId === channel.id ? styles.activeVoice : ''}`}
                        // DEĞİŞİKLİK: onClick olayını yeni fonksiyona bağlıyoruz
                        onClick={() => handleVoiceChannelClick(channel)}
                    >
                        <IoVolumeMedium />
                        <span>{channel.name}</span>
                    </button>
                    {/* Yalnızca kanalda üye varsa listeyi göster */}
                    {(voiceChannelMembers[channel.id]?.length > 0) && (
                      <ul className={styles.voiceMemberList}>
                          {voiceChannelMembers[channel.id].map(member => (
                              <li key={member.displayName} className={styles.voiceMember}>
                                  <img src={member.avatar} alt={member.displayName} />
                                  <span>{member.displayName}</span>
                              </li>
                          ))}
                      </ul>
                    )}
                </li>
            ))}
        </ul>
      </div>
      
      <CreateChannelModal 
        isOpen={isTextModalOpen} 
        onClose={() => setIsTextModalOpen(false)} 
        groupId={group?.id}
      />
      <CreateVoiceChannelModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        groupId={group?.id}
      />
    </>
  );
}

export default ChannelList;