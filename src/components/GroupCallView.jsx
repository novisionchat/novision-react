// --- DOSYA: src/components/GroupCallView.jsx (SÜRÜKLEME VE LAYOUT SORUNLARI ÇÖZÜLMÜŞ NİHAİ HAL) ---

import React, { useRef } from 'react';
import AgoraUIKit from 'agora-react-uikit'; // Doğru paketten doğru bileşeni import ediyoruz
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
    
    // Ana kapsayıcıyı referans alıyoruz
    const containerRef = useRef(null); 
    // Sürükleme hook'unu bu kapsayıcıya bağlıyoruz
    const { style: draggableStyle } = useDraggable(containerRef);

    if (groupCallViewMode === 'closed' || !groupCall) {
        return null;
    }

    const rtcProps = {
        appId: AGORA_APP_ID,
        channel: groupCall.channelName,
        token: groupCall.token,
        uid: auth.currentUser.uid,
    };

    const callbacks = {
        EndCall: () => endGroupCall(),
    };

    // Stilleri DM arayüzüne benzetiyoruz
    const styleProps = {
        UIKitContainer: { width: '100%', height: '100%', borderRadius: 'inherit' },
        controlBar: {
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: '12px 25px',
            borderRadius: '50px',
            bottom: '20px',
        },
        localBtnContainer: {
            backgroundColor: 'rgba(255,255,255,0.2)',
            width: '50px', height: '50px', borderRadius: '50%',
        },
        localBtnContainer_muted: { backgroundColor: '#ff4444' },
    };
    
    // Tam ekran için doğru CSS sınıfını kullanıyoruz
    const containerClasses = `${styles.callContainer} ${groupCallViewMode === 'pip' ? styles.pipScreen : styles.maximizedView}`;
    const containerStyle = groupCallViewMode === 'pip' ? { ...draggableStyle } : {};

    return (
        <div ref={containerRef} className={containerClasses} style={containerStyle}>
            
            {/* SÜRÜKLEME ÇÖZÜMÜ: Sadece PiP modundayken görünen bir sürükleme alanı ekliyoruz. */}
            {/* Bu alan, Agora arayüzünün üzerine gelir ve fare olaylarını yakalar. */}
            {groupCallViewMode === 'pip' && <div className={styles.dragHandle} />}

            <div className={styles.agoraWrapper}>
                 <AgoraUIKit
                    rtcProps={rtcProps}
                    callbacks={callbacks}
                    styleProps={styleProps}
                />
            </div>

            {/* Küçült/Büyüt butonlarımız hala çalışıyor */}
            <div className={styles.customControls}>
                 <button 
                    className={styles.controlBtn} 
                    onClick={() => setGroupCallViewMode(groupCallViewMode === 'full' ? 'pip' : 'full')}
                    title={groupCallViewMode === 'full' ? "Küçült" : "Genişlet"}
                >
                    {groupCallViewMode === 'full' ? <IoContract /> : <IoExpand />}
                </button>
            </div>
        </div>
    );
};

export default GroupCallView;