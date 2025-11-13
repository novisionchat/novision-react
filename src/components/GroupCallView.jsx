// --- DOSYA: src/components/GroupCallView.jsx (HATALARI GİDERİLMİŞ VE DOĞRU KULLANIM) ---

import React, { useRef } from 'react';
// DEĞİŞİKLİK 1: Hatalı import'u düzeltiyoruz. Artık tek bir ana bileşen var.
import AgoraUIKit from 'agora-react-uikit'; 
import { useCall } from '../context/CallContext';
import { useDraggable } from '../hooks/useDraggable';
import styles from './GroupCallView.module.css';
import { auth } from '../lib/firebase';
import { IoContract, IoExpand } from "react-icons/io5";

// Agora App ID'sini burada tanımlıyoruz.
const AGORA_APP_ID = "c1a39c1b29b24faba92cc2a0c187294d";

const GroupCallView = () => {
    const { 
        groupCall, 
        groupCallViewMode, 
        setGroupCallViewMode, 
        endGroupCall,
    } = useCall();
    
    const pipRef = useRef(null);
    const { style: draggableStyle } = useDraggable(pipRef);

    if (groupCallViewMode === 'closed' || !groupCall) {
        return null;
    }

    // AgoraUIKit'in ihtiyaç duyduğu tüm konfigürasyonlar
    const rtcProps = {
        appId: AGORA_APP_ID,
        channel: groupCall.channelName,
        token: groupCall.token,
        uid: auth.currentUser.uid,
        enableScreensharing: true,
    };

    // Aramayı bitirme gibi eylemler için callback'ler
    const callbacks = {
        EndCall: () => endGroupCall(),
    };

    // DM arayüzüyle aynı stil özelliklerini buraya taşıyoruz
    const styleProps = {
        UIKitContainer: {
            width: '100%',
            height: '100%',
            borderRadius: groupCallViewMode === 'pip' ? '12px' : '0',
            backgroundColor: '#1a1a1a',
        },
        gridVideoContainer: {
            borderRadius: '8px',
            border: 'none',
            gap: '15px'
        },
        username: {
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: '4px 8px',
            borderRadius: '0 8px 0 8px',
        },
        controlBar: {
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: '12px 25px',
            borderRadius: '50px',
            bottom: '20px',
        },
        localBtnContainer: {
            backgroundColor: 'rgba(255,255,255,0.2)',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: 'none',
        },
        localBtnContainer_muted: {
            backgroundColor: '#ff4444',
        },
    };

    const containerClasses = `${styles.callContainer} ${groupCallViewMode === 'pip' ? styles.pipScreen : styles.fullScreen}`;
    const containerStyle = groupCallViewMode === 'pip' ? { ...draggableStyle } : {};

    return (
        <div ref={pipRef} className={containerClasses} style={containerStyle}>
            
            {/* DEĞİŞİKLİK 2: Ayrı Grid ve Buttonlar yerine tek bir AgoraUIKit bileşeni kullanıyoruz */}
            {/* Bu bileşen, video ızgarasını ve kontrol tuşlarını kendisi yönetir. */}
            <div className={styles.videoGridContainer} data-drag-handle="true">
                 <AgoraUIKit
                    rtcProps={rtcProps}
                    callbacks={callbacks}
                    styleProps={styleProps}
                />
            </div>

            {/* Kendi özel Küçült/Büyüt butonlarımız hala dışarıda ve çalışır durumda */}
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