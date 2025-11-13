// --- DOSYA: src/components/GroupCallView.jsx (HİBRİT YAKLAŞIMLI YENİ HALİ) ---

import React, { useRef } from 'react';
import AgoraUIKit from 'agora-react-uikit';
import { useCall } from '../context/CallContext';
import { useDraggable } from '../hooks/useDraggable';
import styles from './GroupCallView.module.css';
import { IoContract, IoExpand } from "react-icons/io5";

const GroupCallView = () => {
    const { groupCall, groupCallViewMode, setGroupCallViewMode, endGroupCall } = useCall();
    const pipRef = useRef(null);
    const { style: draggableStyle } = useDraggable(pipRef);

    if (groupCallViewMode === 'closed' || !groupCall) {
        return null;
    }

    const rtcProps = {
        appId: AGORA_APP_ID,
        channel: groupCall.channelName,
        token: groupCall.token,
        enableScreensharing: true,
    };

    const callbacks = {
        EndCall: () => {
            endGroupCall();
        },
    };

    // Agora Kit'in stillerini kendi temamıza uyduralım
    const styleProps = {
        // Ana video grid alanının arkaplanı
        gridContainer: {
            backgroundColor: '#1a1a1a',
            borderRadius: groupCallViewMode === 'pip' ? '12px' : '0',
        },
        // Kontrol butonlarının olduğu bar
        controlBar: {
            backgroundColor: '#212225',
            borderRadius: '0',
        },
        // Butonların kendisi
        localBtnContainer: {
            backgroundColor: '#3b3d44',
            borderColor: '#3b3d44',
        },
        // Buton ikonları
        localBtn: {
            mic: {
                width: '20px',
                height: '20px'
            },
            camera: {
                width: '20px',
                height: '20px'
            },
            endCall: {
                width: '25px',
                height: '25px',
            },
        },
    };

    const containerClasses = `${styles.callContainer} ${groupCallViewMode === 'pip' ? styles.pipScreen : styles.fullScreen}`;
    const containerStyle = groupCallViewMode === 'pip' ? { ...draggableStyle } : {};

    return (
        <div ref={pipRef} className={containerClasses} style={containerStyle}>
            <AgoraUIKit
                rtcProps={rtcProps}
                callbacks={callbacks}
                styleProps={styleProps}
            />
            {/* Kendi özel Küçült/Büyüt butonlarımız */}
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

// Agora App ID'sini burada da tanımlamamız gerekiyor.
const AGORA_APP_ID = "c1a39c1b29b24faba92cc2a0c187294d";

export default GroupCallView;