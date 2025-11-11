// src/components/ReplyPreview.jsx
import React from 'react';
import styles from './ReplyPreview.module.css';
import { IoClose } from 'react-icons/io5';

function ReplyPreview({ reply, onCancel }) {
  if (!reply) return null;

  // Yanıtlanan içeriğin türünü kontrol edip uygun metni oluşturan fonksiyon
  const getPreviewText = () => {
    // 1. Eğer mesajın metni varsa, metni kısalt
    if (reply.text) {
      return reply.text.length > 50 ? `${reply.text.substring(0, 50)}...` : reply.text;
    }
    // 2. Eğer mesaj bir medya dosyası ise
    if (reply.type === 'media') {
      // Medya türüne göre uygun metni döndür
      switch (reply.mediaType) {
        case 'image': return '🖼️ Resim';
        case 'video': return '🎬 Video';
        case 'audio': return '🎤 Sesli Mesaj';
        default: return '📎 Dosya';
      }
    }
    // 3. Eğer mesaj bir GIF ise
    if (reply.type === 'gif') {
      return '🎞️ GIF';
    }
    // 4. Hiçbiri değilse, genel bir metin göster
    return 'Bir mesaja yanıt veriliyor...';
  };

  return (
    <div className={styles.replyPreview}>
      <div className={styles.content}>
        <span className={styles.user}>Yanıtlanıyor: {reply.senderName}</span>
        <span className={styles.text}>{getPreviewText()}</span>
      </div>
      <button onClick={onCancel} className={styles.cancelBtn} title="Yanıtı İptal Et">
        <IoClose size={20} />
      </button>
    </div>
  );
}

export default ReplyPreview;