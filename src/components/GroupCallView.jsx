// --- DOSYA: src/components/GroupCallView.jsx (TÜM SORUNLARI GİDEREN NİHAİ HALİ) ---

import React, { useRef } from 'react';
import AgoraUIKit from 'agora-react-uikit'; 
import { useCall } from '../context/CallContext';
import { useDraggable } from '../hooks/useDraggable';
import styles from './GroupCallView.module.css';
import { auth } from '../lib/firebase';
import { IoContract, IoExpand } from "react-icons/io5";

const AGORA_APP_ID = "c1a39c1b29b24faba92cc2a0c187294d";

const GroupCallView = () => {
    const { 
        groupCall, 
        groupCallViewMode, 
        setGroupCallViewMode, 
        endGroupCall,
    } = useCall();
    
    const pipRef = useRef(null);
    // Sadece başlık çubuğundan sürükleneceği için useDraggable doğru çalışacak.
    const { style: draggableStyle } = useDraggable(pipRef);

    if (groupCallViewMode === 'closed' || !groupCall) {
        return null;
    }

    const rtcProps = {
        appId: AGORA_APP_ID,
        channel: groupCall.channelName,
        token: groupCall.token,
        uid: auth.currentUser.uid,
        enableScreensharing: true,
        // Kendi küçük videomuzu DM'deki gibi sağ üste alalım.
        layout: 1, // 0: Grid, 1: Pinned layout
    };

    const callbacks = {
        EndCall: () => endGroupCall(),
    };

    // SORUN 1 & 2 ÇÖZÜMÜ: Stilleri DM arayüzüyle tam uyumlu ve baskın hale getiriyoruz.
    const styleProps = {
        UIKitContainer: {
            width: '100%',
            height: '100%',
            borderRadius: groupCallViewMode === 'pip' ? '12px' : '0',
            backgroundColor: '#1a1a1a',
        },
        // Kontrol çubuğunun pozisyonunu manuel olarak ayarlayarak kaybolmasını engelliyoruz.
        controlBar: {
            position: 'absolute',
            bottom: groupCallViewMode === 'pip' ? '10px' : '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: groupCallViewMode === 'pip' ? '8px 15px' : '12px 25px',
            borderRadius: '50px',
        },
        // Her bir butonu ayrı ayrı DM arayüzüne benzetiyoruz.
        localBtnContainer: {
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            width: groupCallViewMode === 'pip' ? '40px' : '50px',
            height: groupCallViewMode === 'pip' ? '40px' : '50px',
            border: 'none',
        },
        localBtnContainer_muted: {
            backgroundColor: '#ff4444',
        },
        // Kırmızı kapatma butonu
        endCallButton: {
            transform: 'rotate(135deg)',
            backgroundColor: '#ff4444 !important', // Rengi her durumda eziyoruz
        },
    };

    const containerClasses = `${styles.callContainer} ${groupCallViewMode === 'pip' ? styles.pipScreen : styles.fullScreen}`;
    const containerStyle = groupCallViewMode === 'pip' ? { ...draggableStyle } : {};

    return (
        <div ref={pipRef} className={containerClasses} style={containerStyle}>
            
            {/* SORUN 3 ÇÖZÜMÜ: Sadece PiP modunda görünecek bir başlık çubuğu ekliyoruz. */}
            {/* Bu başlık, sürükleme işlemini devralacak. */}
            {groupCallViewMode === 'pip' && (
                <div className={styles.pipHeader} data-drag-handle="true">
                    <span>Grup Sohbeti</span>
                </div>
            )}

            <div className={styles.videoGridContainer}>
                 <AgoraUIKit
                    rtcProps={rtcProps}
                    callbacks={callbacks}
                    styleProps={styleProps}
                />
            </div>

            {/* Küçült/Büyüt butonlarımız hala en üstte ve bağımsız. */}
            <div className={styles.customControls}>
                {groupCallViewMode === 'full' ? (
                    <button className={styles.controlBtn} onClick={() => setGroupCallViewMode('pip')} title="Küçült">
                        <IoContract />
                    </button>
                ) : (
                    <button className={styles.controlBtn} onClick={() => setGroupCallViewMode('full')} title="Genişlet">
                        <IoExpand />
                    </button>
                )}
            </div>
        </div>
    );
};

export default GroupCallView;