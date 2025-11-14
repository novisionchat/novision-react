// --- DOSYA: src/components/CreateVoiceChannelModal.jsx (YENİ) ---

import React, { useState } from 'react';
import styles from './CreateChannelModal.module.css'; // Mevcut stili kullanabiliriz
import { IoClose } from 'react-icons/io5';
import { createVoiceChannel } from '../lib/groupManagement';

function CreateVoiceChannelModal({ isOpen, onClose, groupId }) {
  const [channelName, setChannelName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!channelName.trim()) {
      alert("Lütfen bir kanal adı girin.");
      return;
    }
    setIsLoading(true);
    try {
      await createVoiceChannel(groupId, channelName.trim());
      handleClose();
    } catch (error) {
      alert(`Ses kanalı oluşturulamadı: ${error.message}`);
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
        <h2>Yeni Ses Kanalı Oluştur</h2>
        
        <div className={styles.inputSection}>
          <label htmlFor="voice-channel-name">Kanal Adı</label>
          <input 
            id="voice-channel-name" 
            type="text" 
            placeholder="Oyun Odası"
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

export default CreateVoiceChannelModal;