// src/components/ConversationItem.jsx
import React from 'react';
import styles from './ConversationItem.module.css';

function ConversationItem({ conversation, onSelect, onContextMenu, isActive }) {
  const handleContextMenu = (e) => {
    e.preventDefault();
    onContextMenu(e.clientX, e.clientY, conversation);
  };

  const useLongPress = (callback, ms = 500) => {
    const timerRef = React.useRef();
    const handleTouchStart = (e) => {
      timerRef.current = setTimeout(() => {
        e.preventDefault();
        const touch = e.touches[0];
        callback(touch.clientX, touch.clientY, conversation);
      }, ms);
    };
    const handleTouchEnd = () => {
      clearTimeout(timerRef.current);
    };
    return {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
      onTouchMove: handleTouchEnd,
    };
  };
  
  const longPressEvents = useLongPress(onContextMenu);

  const presenceState = conversation.presence?.state || 'offline';
  // GÜNCELLEME: okunmamış mesaj sayısını alıyoruz
  const unreadCount = conversation.unreadCount || 0;

  return (
    <li
      className={`${styles.conversationItem} ${isActive ? styles.active : ''}`}
      onClick={() => onSelect(conversation)}
      onContextMenu={handleContextMenu}
      {...longPressEvents}
    >
      <div className={styles.avatarWrapper}>
        <img src={conversation.avatar} alt={conversation.name} />
        {conversation.type === 'dm' && (
          <div className={`${styles.presenceBadge} ${styles[presenceState]}`}></div>
        )}
      </div>
      <div className={styles.details}>
        <span className={styles.name}>{conversation.name}</span>
        <span className={styles.preview}>{conversation.lastMessage}</span>
      </div>
      {/* YENİ: Okunmamış mesaj sayacı rozeti */}
      {unreadCount > 0 && (
        <div className={styles.meta}>
          <span className={styles.unreadBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        </div>
      )}
    </li>
  );
}

export default ConversationItem;