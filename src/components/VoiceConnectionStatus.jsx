// --- DOSYA: src/components/VoiceConnectionStatus.jsx (YENİ) ---

import React from 'react';
import { useVoiceChannel } from '../context/VoiceChannelContext';
import styles from './VoiceConnectionStatus.module.css';
import { IoMicOff, IoMic, IoCall } from 'react-icons/io5';
import { FaBroadcastTower } from 'react-icons/fa';

const VoiceConnectionStatus = () => {
    const { currentChannel, leaveChannel, toggleMute, isMuted, isLoading } = useVoiceChannel();

    if (!currentChannel) {
        return null;
    }

    return (
        <div className={styles.statusContainer}>
            <div className={styles.connectionInfo}>
                {isLoading ? (
                    <span className={styles.statusTextLoading}>Bağlanılıyor...</span>
                ) : (
                    <>
                        <FaBroadcastTower color="#43b581" />
                        <span className={styles.statusText}>Bağlandı</span>
                    </>
                )}
                <span className={styles.channelName}>{currentChannel.name}</span>
            </div>
            <div className={styles.controls}>
                <button 
                    onClick={toggleMute} 
                    className={`${styles.controlBtn} ${isMuted ? styles.danger : ''}`} 
                    title={isMuted ? "Susturmayı Kaldır" : "Sustur"}
                >
                    {isMuted ? <IoMicOff size={22} /> : <IoMic size={22} />}
                </button>
                <button onClick={leaveChannel} className={`${styles.controlBtn} ${styles.danger}`} title="Ayrıl">
                    <IoCall size={22} />
                </button>
            </div>
        </div>
    );
};

export default VoiceConnectionStatus;