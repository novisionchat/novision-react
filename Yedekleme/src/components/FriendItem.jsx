// src/components/FriendItem.jsx
import React from 'react';
import styles from './FriendItem.module.css';

function FriendItem({ friend, onSelect, onContextMenu, isActive }) {
  const handleContextMenu = (e) => {
    e.preventDefault();
    onContextMenu(e.clientX, e.clientY, friend);
  };
  
  const useLongPress = (callback, ms = 500) => {
    const timerRef = React.useRef();
    const handleTouchStart = (e) => {
      timerRef.current = setTimeout(() => {
        e.preventDefault();
        const touch = e.touches[0];
        callback(touch.clientX, touch.clientY, friend);
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

  return (
    <li
      className={`${styles.friendItem} ${isActive ? styles.active : ''}`}
      onClick={() => onSelect(friend)}
      onContextMenu={handleContextMenu}
      {...longPressEvents}
    >
      <img src={friend.avatar} alt={friend.username} />
      <div className={styles.friendInfo}>
        <span>{`${friend.username}#${friend.tag}`}</span>
      </div>
    </li>
  );
}

export default FriendItem;