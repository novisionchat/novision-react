// src/components/ContextMenu.jsx
import React, { useEffect, useRef } from 'react';
import styles from './ContextMenu.module.css';

function ContextMenu({ x, y, items, onClose }) {
  const menuRef = useRef(null);

  // Menü dışına tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className={styles.contextMenu}
      style={{ top: `${y}px`, left: `${x}px` }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          className={`${styles.menuBtn} ${item.danger ? styles.danger : ''}`}
          onClick={() => {
            item.onClick();
            onClose();
          }}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

export default ContextMenu;