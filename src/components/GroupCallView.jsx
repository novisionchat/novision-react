// --- DOSYA: src/components/GroupCallView.jsx (SÜRÜKLEME VE STİL SORUNLARI ÇÖZÜLMÜŞ NİHAİ HAL) ---

import React, a
from 'react';
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
        // Kendi küçük videomuzu DM'deki gibi sağ üste alıyoruz
        layout: 1, // 1 = Floating Layout
    };

    const callbacks = {
        EndCall: () => endGroupCall(),
    };

    // DM arayüzüyle aynı stil özellikleri
    const styleProps = {
        UIKitContainer: {
            width: '100%', height: '100%',
            borderRadius: 'inherit', // Ebeveyninden alsın
            backgroundColor: '#1a1a1a',
        },
        // Ana video stilleri
        gridVideoContainer: { borderRadius: '8px', border: 'none', gap: '15px' },
        // Kendi küçük videomuzun stili
        localVideoContainer: { 
            bottom: 85, right: 20, 
            width: 120, height: 180, 
            borderRadius: 10,
        },
        username: {
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: '4px 8px', borderRadius: '0 8px 0 8px',
        },
        controlBar: {
            backgroundColor: 'rgba(0,0,0,0.6)', padding: '12px 25px',
            borderRadius: '50px', bottom: '20px',
        },
        localBtnContainer: {
            backgroundColor: 'rgba(255,255,255,0.2)',
            width: '50px', height: '50px', borderRadius: '50%', border: 'none',
        },
        localBtnContainer_muted: { backgroundColor: '#ff4444' },
    };
    
    // PiP modu için daha kompakt tuşlar
    if (groupCallViewMode === 'pip') {
        styleProps.controlBar = {
             backgroundColor: 'rgba(0,0,0,0.6)', padding: '8px 15px',
             borderRadius: '50px', bottom: '10px'
        };
        styleProps.localBtnContainer = { width: 40, height: 40, borderRadius: '50%' };
        styleProps.localVideoContainer = { display: 'none' }; // PiP modunda kendimizi tekrar göstermeye gerek yok
    }

    const containerClasses = `${styles.callContainer} ${groupCallViewMode === 'pip' ? styles.pipScreen : styles.maximizedView}`;
    const containerStyle = groupCallViewMode === 'pip' ? { ...draggableStyle } : {};

    return (
        <div ref={pipRef} className={containerClasses} style={containerStyle}>
            
            {/* SÜRÜKLEME ÇÖZÜMÜ: PiP modundayken görünen, şeffaf sürükleme alanı */}
            {groupCallViewMode === 'pip' && <div className={styles.dragHandle}></div>}

            <AgoraUIKit
                rtcProps={rtcProps}
                callbacks={callbacks}
                styleProps={styleProps}
            />

            {/* Küçült/Büyüt butonları */}
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