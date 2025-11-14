// src/components/CreateChannelModal.jsx
import React, { useState } from 'react';
import styles from './CreateChannelModal.module.css';
import { IoClose } from 'react-icons/io5';
import { createChannel } from '../lib/groupManagement';

function CreateChannelModal({ isOpen, onClose, groupId }) {
  const [channelName, setChannelName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!channelName.trim()) {
      alert("Lütfen bir kanal adı girin.");
      return;
    }
    setIsLoading(true);
    try {
      await createChannel(groupId, channelName.trim());
      handleClose(); // Başarılı olunca kapat ve state'i sıfırla
    } catch (error) {
      alert(`Kanal oluşturulamadı: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setChannelName('');
    setIsLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalCloseBtn} onClick={handleClose}><IoClose size={28} /></button>
        <h2>Yeni Kanal Oluştur</h2>
        
        <div className={styles.inputSection}>
          <label htmlFor="channel-name">Kanal Adı</label>
          <input 
            id="channel-name" 
            type="text" 
            placeholder="# genel-sohbet"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            autoFocus
          />
        </div>

        <button className={styles.primaryBtn} onClick={handleCreate} disabled={isLoading}>
          {isLoading ? 'Oluşturuluyor...' : 'Kanal Oluştur'}
        </button>
      </div>
    </div>
  );
}

export default CreateChannelModal;