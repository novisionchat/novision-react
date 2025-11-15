import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { ref, onValue, get } from 'firebase/database';
import { logoutUser } from '../lib/auth';
import { listenForContacts, saveContact, removeContact } from '../lib/friends';
import { listenForConversations } from '../lib/conversations';
import { hideConversation } from '../lib/chat';
import { useChat } from '../context/ChatContext';
import { 
    IoLogOutOutline, 
    IoPersonAddOutline, 
    IoPeopleOutline, 
    IoChatbubblesOutline, 
    IoTrashOutline, 
    IoEyeOffOutline, 
    IoArrowBack 
} from "react-icons/io5";

import styles from './LeftPanel.module.css';
import ConversationItem from './ConversationItem';
import FriendItem from './FriendItem';
import ContextMenu from './ContextMenu';
import ProfileSettingsModal from './ProfileSettingsModal';
import ChannelList from './ChannelList';
import CreateGroupModal from './CreateGroupModal';
import VoiceConnectionStatus from './VoiceConnectionStatus'; // YENİ: Ses bağlantı durumu bileşenini import et

function LeftPanel({ currentUser, onConversationSelect }) {
  const { activeConversation, selectConversation, selectChannel, activeChannelId } = useChat();

  const [detailedGroup, setDetailedGroup] = useState(null);
  const [activeTab, setActiveTab] = useState('chats');
  const [userData, setUserData] = useState({ username: 'Yükleniyor...', tag: '0000', avatar: '/assets/icon.png' });
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendTagInput, setFriendTagInput] = useState('');
  const [menu, setMenu] = useState({ visible: false, x: 0, y: 0, items: [] });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  
  const panelView = activeConversation?.type === 'group' ? 'channels' : 'conversations';

  useEffect(() => {
    if (!currentUser?.uid) return;
    
    const userRef = ref(db, `users/${currentUser.uid}`);
    const unsubUser = onValue(userRef, (snapshot) => { if (snapshot.exists()) setUserData(snapshot.val()); });
    const unsubConversations = listenForConversations(currentUser.uid, setConversations);
    const unsubFriends = listenForContacts(currentUser.uid, setFriends);
    return () => { unsubUser(); unsubConversations(); unsubFriends(); };
  }, [currentUser]);

  useEffect(() => {
    if (activeConversation && activeConversation.type === 'group') {
      const groupRef = ref(db, `groups/${activeConversation.id}`);
      get(groupRef).then((snapshot) => {
        if (snapshot.exists()) {
          // GÜNCELLEME: Grup meta verisine members'ı da ekleyerek ChannelList'e doğru prop geçişi sağlandı
          setDetailedGroup({ id: snapshot.key, type: 'group', ...snapshot.val().meta });
        }
      });
    } else {
      setDetailedGroup(null);
    }
  }, [activeConversation]);

  const handleSelectConversation = (item) => {
    selectConversation(item);
    if(onConversationSelect) onConversationSelect();
  };

  const handleSelectChannel = (channelId) => {
    selectChannel(channelId);
    if(onConversationSelect) onConversationSelect();
  };

  const handleBackToConversations = () => {
    selectConversation(null);
    setDetailedGroup(null);
  };

  const handleLogout = async () => { 
    if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
      await logoutUser(); 
    }
  };

  const handleAddFriend = async (e) => {
    e.preventDefault();
    if (!friendTagInput.trim()) return;
    try {
      const { username, tag } = await saveContact(currentUser, friendTagInput);
      alert(`'${username}#${tag}' başarıyla eklendi!`);
      setFriendTagInput('');
    } catch (error) {
      alert(`Hata: ${error.message}`);
    }
  };

  const handleRemoveContact = async (contactId) => {
    const friendToRemove = friends.find(f => f.uid === contactId);
    if (!friendToRemove) return;

    if (confirm(`'${friendToRemove.username}#${friendToRemove.tag}' kişisini silmek istediğinizden emin misiniz?`)) {
      try {
        await removeContact(currentUser.uid, contactId);
      } catch (error) {
        alert(`Hata: ${error.message}`);
      }
    }
  };
  
  const handleHideConversation = async (convo) => {
    if (confirm(`'${convo.name}' sohbetini gizlemek istediğinize emin misiniz?`)) {
        try {
            await hideConversation(currentUser.uid, convo.id, convo.type);
            if (activeConversation?.id === convo.id) {
                selectConversation(null);
            }
        } catch (error) {
            alert(`Hata: ${error.message}`);
        }
    }
  };

  const showContextMenu = (x, y, item) => {
    const isFriendItem = !item.type && item.uid;
    let menuItems = [];

    if (isFriendItem) {
      menuItems = [ 
        { 
          label: 'Kişiyi Sil', 
          icon: <IoTrashOutline />, 
          danger: true, 
          onClick: () => handleRemoveContact(item.uid) 
        } 
      ];
    } else {
      menuItems = [ 
        { 
          label: 'Sohbeti Gizle', 
          icon: <IoEyeOffOutline />, 
          danger: true, 
          onClick: () => handleHideConversation(item) 
        } 
      ];
    }
    setMenu({ visible: true, x, y, items: menuItems });
  };

  const closeMenu = () => setMenu({ ...menu, visible: false });

  return (
    <>
      <aside className={`${styles.leftPanel} left-panel`}>
        {/* YENİ: Panel içeriğini ve durum çubuğunu ayırmak için bir sarmalayıcı */}
        <div className={styles.panelMainContent}>
            {panelView === 'channels' && detailedGroup ? (
              // Kanal Listesi Görünümü
              <>
                <div className={styles.channelHeader}>
                  <button onClick={handleBackToConversations} className={styles.backButton} title="Sohbetlere Geri Dön"><IoArrowBack size={22} /></button>
                  <h3>{detailedGroup.name}</h3>
                </div>
                <ChannelList 
                  group={detailedGroup} 
                  currentUser={currentUser}
                  onSelectChannel={handleSelectChannel} 
                  activeChannelId={activeChannelId} 
                />
              </>
            ) : (
              // Sohbetler/Kişiler Görünümü
              <>
                <div className={styles.panelHeader}>
                  <div className={styles.userProfileButton} onClick={() => setIsProfileModalOpen(true)}>
                    <img className={styles.profileAvatar} src={userData.avatar} alt="Profil" />
                    <span className={styles.profileUsernameTag}>{`${userData.username}#${userData.tag}`}</span>
                  </div>
                  <div className={styles.panelHeaderActions}>
                    <button className={styles.headerActionBtn} title="Yeni Grup Oluştur" onClick={() => setIsGroupModalOpen(true)}><IoPeopleOutline size={24} /></button>
                    <button className={styles.headerActionBtn} title="Çıkış Yap" onClick={handleLogout}><IoLogOutOutline size={24} /></button>
                  </div>
                </div>
                <nav className={styles.panelNav}>
                  <button className={`${styles.navBtn} ${activeTab === 'chats' ? styles.active : ''}`} onClick={() => setActiveTab('chats')}>Sohbetler</button>
                  <button className={`${styles.navBtn} ${activeTab === 'friends' ? styles.active : ''}`} onClick={() => setActiveTab('friends')}>Kişiler</button>
                </nav>
                <div className={styles.panelContent}>
                  {activeTab === 'chats' ? (
                    <ul>
                      {conversations.map(convo => <ConversationItem key={convo.id} conversation={convo} isActive={activeConversation?.id === convo.id} onSelect={handleSelectConversation} onContextMenu={showContextMenu} />)}
                    </ul>
                  ) : (
                    <div className={styles.friendsView}>
                      <form className={styles.addFriendSection} onSubmit={handleAddFriend}>
                        <h4>KİŞİ EKLE</h4>
                        <div className={styles.addFriendActionWrapper}>
                          <input className={styles.addFriendInput} type="text" placeholder="kullaniciadi#1234" value={friendTagInput} onChange={(e) => setFriendTagInput(e.target.value)} />
                          <button type="submit" className={styles.addFriendBtn} title="Kişi Ekle"><IoPersonAddOutline size={22} /></button>
                        </div>
                      </form>
                      <div className={styles.friendsListSection}>
                        <h4>KİŞİLERİM ({friends.length})</h4>
                        <ul>
                          {friends.map(friend => <FriendItem key={friend.uid} friend={friend} onSelect={handleSelectConversation} onContextMenu={showContextMenu} isActive={activeConversation?.otherUserId === friend.uid} />)}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
        </div>
        
        {/* YENİ: Ses bağlantı durumu paneli, yalnızca kanal görünümündeyken gösterilir */}
        {panelView === 'channels' && <VoiceConnectionStatus />}
      </aside>
      
      {menu.visible && <ContextMenu {...menu} onClose={closeMenu} />}
      <ProfileSettingsModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      <CreateGroupModal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} friends={friends}/>
    </>
  );
}

export default LeftPanel;