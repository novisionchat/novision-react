// src/context/ChatContext.jsx
import React, { createContext, useState, useContext, useCallback } from 'react';
import { auth } from '../lib/firebase'; // currentUser'ı almak için
import { getOrCreateDmId } from '../lib/chat'; // DM ID oluşturmak için

// 1. Context'i oluşturuyoruz.
const ChatContext = createContext();

// 2. Bu context'i herhangi bir bileşenden kolayca kullanmak için bir custom hook oluşturuyoruz.
// Artık her seferinde `useContext(ChatContext)` yazmak yerine `useChat()` kullanacağız.
export function useChat() {
  return useContext(ChatContext);
}

// 3. Tüm uygulamayı saracak ve state'i sağlayacak olan Provider bileşeni.
export function ChatProvider({ children }) {
  const [activeConversation, setActiveConversation] = useState(null);
  const [activeChannelId, setActiveChannelId] = useState('general');

  // Bir sohbete tıklandığında çalışacak fonksiyon.
  // useCallback ile gereksiz yere yeniden oluşturulmasını engelliyoruz.
  const selectConversation = useCallback((item) => {
    const currentUser = auth.currentUser;
    if (!currentUser || !item) {
        setActiveConversation(null);
        return;
    };

    let chatObject;
    
    // Eğer gelen 'item' bir arkadaş listesi öğesiyse (type'ı yoksa),
    // onu bir sohbet nesnesine dönüştür.
    if (!item.type && item.uid) {
        chatObject = { 
            id: getOrCreateDmId(currentUser.uid, item.uid), 
            type: 'dm', 
            name: `${item.username}#${item.tag}`, 
            avatar: item.avatar, 
            otherUserId: item.uid 
        };
    } else {
        // Eğer zaten bir sohbet nesnesiyse (DM veya grup), doğrudan kullan.
        chatObject = { ...item };
    }
    
    setActiveConversation(chatObject);
    // Her yeni sohbet seçildiğinde, kanalı varsayılan 'genel' kanalına sıfırla.
    setActiveChannelId('general');
  }, []);

  // Bir kanal seçildiğinde çalışacak fonksiyon.
  const selectChannel = useCallback((channelId) => {
    setActiveChannelId(channelId);
  }, []);

  // Paylaşılacak tüm değerleri bir obje içinde topluyoruz.
  const value = {
    activeConversation,
    activeChannelId,
    selectConversation,
    selectChannel,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}