// --- DOSYA: src/components/ChatArea.jsx ---

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useChat } from '../context/ChatContext';
import { listenForMessages, sendMessage, deleteMessage, toggleReaction } from '../lib/chat';
import { listenToTyping, setTypingStatus } from '../lib/typing';
import { markMessagesAsRead } from '../lib/messageStatus';
import { listenToUserPresence, getPresenceText, formatLastSeen } from '../lib/presence';
import { uploadToCloudinary } from '../lib/cloudinary';
import { auth } from '../lib/firebase';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import styles from './ChatArea.module.css';
import { 
    IoMenu, IoSend, IoImageOutline, IoVideocamOutline, IoCallOutline, 
    IoReturnUpForwardOutline, IoTrashOutline, IoCopyOutline, IoSettingsOutline, 
    IoMicOutline, IoStopCircleOutline, IoGiftOutline
} from "react-icons/io5";
import { FaChessPawn } from "react-icons/fa";
import { BsEmojiSmile } from "react-icons/bs";
import MessageBubble from './MessageBubble';
import ContextMenu from './ContextMenu';
import ReplyPreview from './ReplyPreview';
import useAutoScroll from '../hooks/useAutoScroll';
import GroupSettingsModal from './GroupSettingsModal';
import { useCall } from '../context/CallContext.jsx';
import GifPicker from './GifPicker';

function ChatArea({ onToggleSidebar, onChessButtonClick }) {
  const { activeConversation: activeChat, activeChannelId } = useChat();
  const { initiateCall } = useCall();
  const currentUser = auth.currentUser;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingStatusText, setTypingStatusText] = useState('');
  const [opponentStatus, setOpponentStatus] = useState('');
  const [currentReply, setCurrentReply] = useState(null);
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [menu, setMenu] = useState({ visible: false, x: 0, y: 0, items: [], target: null });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 });
  const [recordingTime, setRecordingTime] = useState(0);
  const [isGifPickerOpen, setIsGifPickerOpen] = useState(false);

  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const targetMessageRef = useRef(null);

  const { preserveScrollPosition } = useAutoScroll(chatContainerRef, messages);
  
  const onRecordingComplete = async (audioFile) => {
    if (!audioFile || !activeChat) return;
    setIsUploading(true);
    try {
      const result = await uploadToCloudinary(audioFile, { 
        folder: 'voice_messages',
        resource_type: 'video'
      });
      const payload = { type: 'media', mediaType: 'audio', mediaUrl: result.url, format: result.format, duration: result.duration };
      const sender = { uid: currentUser.uid, displayName: currentUser.displayName };
      await sendMessage(activeChat.id, activeChat.type, sender, payload, null, activeChannelId);
    } catch (error) {
      alert(`Sesli mesaj gönderilemedi: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const { isRecording, startRecording, stopRecording, cancelRecording } = useVoiceRecorder(onRecordingComplete);
  
  useEffect(() => {
    if (!activeChat || !currentUser) {
      setMessages([]); setTypingStatusText(''); setOpponentStatus(''); setCurrentReply(null);
      return;
    }
    const unsubMessages = listenForMessages(activeChat.id, activeChat.type, setMessages, activeChannelId);
    const unsubTyping = listenToTyping(activeChat.id, activeChat.type, currentUser.uid, (users) => {
      setTypingStatusText(users.length > 0 ? `${users.join(', ')} yazıyor...` : '');
    });
    return () => { unsubMessages(); unsubTyping(); };
  }, [activeChat, activeChannelId, currentUser]);

  useEffect(() => {
    if (!activeChat) return;
    const markAsReadIfFocused = () => { if (document.hasFocus()) markMessagesAsRead(activeChat.id, activeChat.type, currentUser.uid, activeChannelId); };
    markAsReadIfFocused();
    window.addEventListener('focus', markAsReadIfFocused);
    let unsubPresence = () => {};
    if (activeChat.type === 'dm' && activeChat.otherUserId) {
      unsubPresence = listenToUserPresence(activeChat.otherUserId, ({ presence, lastSeen }) => {
        setOpponentStatus(presence?.state === 'online' ? getPresenceText(presence.state) : formatLastSeen(lastSeen));
      });
    } else if (activeChat.type === 'group') {
      setOpponentStatus('Grup Sohbeti');
    }
    return () => { window.removeEventListener('focus', markAsReadIfFocused); unsubPresence(); };
  }, [activeChat, activeChannelId, currentUser]);
  
  const handleToggleReaction = useCallback((messageId, emoji) => { 
    if (!activeChat || !currentUser) return;
    preserveScrollPosition(); 
    toggleReaction(activeChat.id, activeChat.type, messageId, emoji, currentUser.uid, activeChannelId); 
  }, [activeChat, activeChannelId, currentUser, preserveScrollPosition]);

  useEffect(() => {
    const picker = emojiPickerRef.current;
    if (picker && showEmojiPicker) {
      const handleEmojiClick = (e) => {
        if (targetMessageRef.current) handleToggleReaction(targetMessageRef.current.id, e.detail.unicode);
        setShowEmojiPicker(false);
      };
      picker.addEventListener('emoji-click', handleEmojiClick);
      return () => picker.removeEventListener('emoji-click', handleEmojiClick);
    }
  }, [showEmojiPicker, handleToggleReaction]);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => setRecordingTime(prevTime => prevTime + 1), 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatRecordingTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const closeAllPopups = () => {
    if (menu.visible) setMenu(prev => ({ ...prev, visible: false }));
    if (showEmojiPicker) setShowEmojiPicker(false);
  };

  const handleShowContextMenu = (x, y, message) => {
    preserveScrollPosition(); closeAllPopups();
    const isOwn = message.sender === currentUser.uid;
    const items = [
      { label: 'Yanıtla', icon: <IoReturnUpForwardOutline />, onClick: () => setCurrentReply(message) },
      { label: 'Tepki Ver', icon: <BsEmojiSmile />, onClick: () => handleShowEmojiPicker(x, y, message) },
      ...(message.text ? [{ label: 'Kopyala', icon: <IoCopyOutline />, onClick: () => navigator.clipboard.writeText(message.text) }] : []),
      ...(isOwn ? [{ label: 'Sil', icon: <IoTrashOutline />, danger: true, onClick: () => handleDeleteMessage(message.id) }] : []),
    ];
    setMenu({ visible: true, x, y, items, target: message });
  };

  const handleShowEmojiPicker = (x, y, message) => {
    closeAllPopups();
    targetMessageRef.current = message;
    setPickerPosition({ x: Math.max(0, x - 350), y: Math.max(0, y - 460) });
    setShowEmojiPicker(true);
  };
  
  const handleDeleteMessage = (messageId) => { 
    if (confirm("Mesajı silmek istediğinizden emin misiniz?")) {
      preserveScrollPosition(); 
      deleteMessage(activeChat.id, activeChat.type, messageId, activeChannelId); 
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (activeChat) {
      setTypingStatus(activeChat.id, activeChat.type, currentUser.uid, currentUser.displayName, true, activeChannelId);
      typingTimeoutRef.current = setTimeout(() => setTypingStatus(activeChat.id, activeChat.type, currentUser.uid, currentUser.displayName, false, activeChannelId), 2000);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || !currentUser) return;
    const sender = { uid: currentUser.uid, displayName: currentUser.displayName };
    sendMessage(activeChat.id, activeChat.type, sender, { text: newMessage }, currentReply, activeChannelId);
    setNewMessage(''); 
    setCurrentReply(null);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setTypingStatus(activeChat.id, activeChat.type, currentUser.uid, currentUser.displayName, false, activeChannelId);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeChat) return;
    setIsUploading(true);
    try {
      const result = await uploadToCloudinary(file, { folder: 'chat_media' });
      const payload = { type: 'media', mediaType: result.resourceType, mediaUrl: result.url, format: result.format, duration: result.duration };
      const sender = { uid: currentUser.uid, displayName: currentUser.displayName };
      await sendMessage(activeChat.id, activeChat.type, sender, payload, null, activeChannelId);
    } catch (error) {
      alert(`Dosya gönderilemedi: ${error.message}`);
    } finally {
      setIsUploading(false); 
      e.target.value = null;
    }
  };
  
  const handleGifSelect = async (gifUrl) => {
    if (!gifUrl || !activeChat) return;
    try {
        const sender = { uid: currentUser.uid, displayName: currentUser.displayName };
        await sendMessage(activeChat.id, activeChat.type, sender, { type: 'gif', gifUrl: gifUrl }, null, activeChannelId);
    } catch (error) {
        alert(`GIF gönderilemedi: ${error.message}`);
    }
  };

  const handleInitiateCall = (callType) => {
    if (activeChat.type === 'dm' && currentUser) {
      initiateCall(activeChat.otherUserId, activeChat.name, currentUser, callType);
    } else {
      alert("Grup aramaları yakında eklenecektir.");
    }
  };
  
  if (!activeChat) {
    return (
      <main className={styles.chatArea}>
        <div className={`${styles.chatView} ${styles.chatWelcome}`}>
          <img src="/assets/icon.png" alt="Novision Logo" width="120" />
          <h2>Sohbete Hoş Geldin!</h2>
          <p>Bir sohbet seçerek mesajlaşmaya başla.</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.chatArea} onClick={closeAllPopups}> 
      <div className={styles.chatView} style={{ display: 'flex' }} onClick={(e) => e.stopPropagation()}>
        <div className={styles.chatHeader}>
          <button id="sidebarToggleBtn" className={styles.headerActionBtn} title="Menüyü Aç/Kapat" onClick={onToggleSidebar}><IoMenu size={26} /></button>
          <img src={activeChat.avatar} alt="Avatar" className={styles.headerAvatar} />
          <div className={styles.headerInfo}>
            <span className={styles.headerName}>{activeChat.name}</span>
            <span className={styles.headerStatus}>{typingStatusText || opponentStatus}</span>
          </div>
          <div className={styles.headerActions}>
            {activeChat.type === 'dm' ? (
              <>
                <button onClick={() => handleInitiateCall('audio')} className={styles.headerActionBtn} title="Sesli Ara"><IoCallOutline size={22} /></button>
                <button onClick={() => handleInitiateCall('video')} className={styles.headerActionBtn} title="Görüntülü Ara"><IoVideocamOutline size={22} /></button>
                <button onClick={onChessButtonClick} className={styles.headerActionBtn} title="Satranç Oyna"><FaChessPawn size={20} /></button>
              </>
            ) : (
              <>
                <button onClick={() => handleInitiateCall('video')} className={styles.headerActionBtn} title="Grup Araması Başlat"><IoVideocamOutline size={22} /></button>
                <button onClick={onChessButtonClick} className={styles.headerActionBtn} title="Satranç Oyna"><FaChessPawn size={20} /></button>
                <button className={styles.headerActionBtn} title="Grup Ayarları" onClick={() => setIsGroupSettingsOpen(true)}><IoSettingsOutline size={22} /></button>
              </>
            )}
          </div>
        </div>
        
        <div ref={chatContainerRef} className={styles.chatContainer}>
          <div className={styles.messageList}>{messages.map(msg => <MessageBubble key={msg.id} message={msg} isOwnMessage={msg.sender === currentUser?.uid} onContextMenu={handleShowContextMenu} onReply={setCurrentReply} onToggleReaction={handleToggleReaction} currentUserId={currentUser?.uid}/>)}</div>
        </div>

        <div className={styles.inputAreaWrapper}>
          {currentReply && <ReplyPreview reply={currentReply} onCancel={() => setCurrentReply(null)} />}
          <form className={styles.inputArea} onSubmit={handleSendMessage}>
            <input type="file" accept="image/*,video/*,audio/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect}/>
            {isRecording ? (
              <div className={styles.recordingBar}>
                <button type="button" className={`${styles.actionBtn} ${styles.cancelBtn}`} onClick={cancelRecording} title="İptal Et" disabled={isUploading}><IoTrashOutline size={22} /></button>
                <div className={styles.recordingInfo}>
                    <span className={styles.redDot}></span>
                    <span className={styles.recordingTime}>{formatRecordingTime(recordingTime)}</span>
                </div>
                <button type="button" className={styles.sendBtn} onClick={stopRecording} title="Durdur ve Gönder" disabled={isUploading}><IoStopCircleOutline size={28} /></button>
              </div>
            ) : (
              <>
                <button type="button" className={styles.actionBtn} title="Medya Ekle" onClick={() => fileInputRef.current.click()} disabled={isUploading}><IoImageOutline size={24} /></button>
                <button type="button" className={styles.actionBtn} title="GIF Gönder" onClick={() => setIsGifPickerOpen(true)} disabled={isUploading}><IoGiftOutline size={24} /></button>
                <input type="text" placeholder={isUploading ? "Yükleniyor..." : "Mesaj yaz..."} value={newMessage} onChange={handleInputChange} disabled={isUploading} />
                {newMessage.trim() ? (
                  <button type="submit" className={styles.sendBtn} title="Gönder" disabled={isUploading}><IoSend size={22} /></button>
                ) : (
                  <button type="button" className={styles.micBtn} title="Sesli Mesaj Kaydet" disabled={isUploading} onClick={startRecording}><IoMicOutline size={24} /></button>
                )}
              </>
            )}
          </form>
        </div>
      </div>
      
      {menu.visible && <ContextMenu {...menu} onClose={closeAllPopups} />}
      <emoji-picker ref={emojiPickerRef} class="dark" style={{ display: showEmojiPicker ? 'block' : 'none', position: 'fixed', top: `${pickerPosition.y}px`, left: `${pickerPosition.x}px`, zIndex: 3001 }}></emoji-picker>
      {isGifPickerOpen && <GifPicker onSelect={handleGifSelect} onClose={() => setIsGifPickerOpen(false)} />}
      {activeChat.type === 'group' && <GroupSettingsModal isOpen={isGroupSettingsOpen} onClose={() => setIsGroupSettingsOpen(false)} group={activeChat} currentUser={currentUser}/>}
    </main>
  );
}

export default ChatArea;