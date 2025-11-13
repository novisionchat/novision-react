// --- DOSYA: src/components/GroupCallView.jsx (NİHAİ VE AKILLI VERSİYON) ---

import React, { useRef, useMemo } from 'react';
import AgoraUIKit from 'agora-react-uikit';
import { useCall } from '../context/CallContext';
import { useDraggable } from '../hooks/useDraggable';
import styles from './GroupCallView.module.css';
import { IoContract, IoExpand } from "react-icons/io5";

const GroupCallView = () => {
    const { 
        groupCall, 
        groupCallViewMode, 
        setGroupCallViewMode, 
        endGroupCall,
        remoteUsers // Akıllı düzen için remoteUsers'ı alıyoruz
    } = useCall();

    const pipRef = useRef(null);
    const { style: draggableStyle } = useDraggable(pipRef); // SÜRÜKLENEBİLİRLİK EKLENDİ

    // Akıllı düzen mantığı
    const totalUsers = useMemo(() => 1 + remoteUsers.length, [remoteUsers]);
    const layout = totalUsers >= 4 ? 1 : 2; // 4+ kişi ise Grid (1), 3 veya daha az ise Pinned (2)

    if (groupCallViewMode === 'closed' || !groupCall) {
        return null;
    }

    const rtcProps = {
        appId: AGORA_APP_ID,
        channel: groupCall.channelName,
        token: groupCall.token,
        enableScreensharing: true,
        layout: layout, // AKILLI DÜZEN BURADA UYGULANIYOR
        uid: auth.currentUser?.uid, // Kendi UID'mizi verelim ki kit bizi tanısın
    };

    const callbacks = {
        EndCall: () => {
            endGroupCall();
        },
    };

    // STİL TUTARLILIĞI: DM arayüzüyle aynı renkleri ve stilleri tanımlıyoruz
    const styleProps = {
        gridContainer: {
            backgroundColor: '#111',
            borderRadius: groupCallViewMode === 'pip' ? '12px' : '0',
        },
        controlBar: {
            backgroundColor: 'rgba(0,0,0,0.6)',
            borderRadius: '50px',
        },
        localBtnContainer: {
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderColor: 'transparent',
            width: '50px',
            height: '50px',
        },
        endCallContainer: {
            backgroundColor: '#ff4444', // DM'deki kırmızı
            borderColor: '#ff4444',
            width: '50px',
            height: '50px',
        },
        // Pip modunda butonları küçültelim
        pipLocalBtnContainer: {
            backgroundColor: 'rgba(255,255,255,0.2)',
            width: '40px',
            height: '40px'
        },
        pipEndCallContainer: {
            backgroundColor: '#ff4444',
            width: '40px',
            height: '40px'
        }
    };

    const containerClasses = `${styles.callContainer} ${groupCallViewMode === 'pip' ? styles.pipScreen : styles.fullScreen}`;
    // Sürüklenebilir stili sadece PiP modunda uygula
    const containerStyle = groupCallViewMode === 'pip' ? { ...draggableStyle } : {};

    return (
        // Sürüklenebilirlik için ref'i ekliyoruz
        <div ref={pipRef} className={containerClasses} style={containerStyle}>
            <AgoraUIKit
                rtcProps={rtcProps}
                callbacks={callbacks}
                styleProps={styleProps}
            />
            {/* Özel Küçült/Büyüt butonlarımız */}
            <div className={styles.customControls}>
                {groupCallViewMode === 'full' ? (
                    <button className={styles.controlBtn} onClick={() => setGroupCallViewMode('pip')} title="Küçült">
                        <IoContract size={18} />
                    </button>
                ) : (
                    <button className={styles.controlBtn} onClick={() => setGroupCallViewMode('full')} title="Genişlet">
                        <IoExpand size={18} />
                    </button>
                )}
            </div>
        </div>
    );
};

const AGORA_APP_ID = "c1a39c1b29b24faba92cc2a0c187294d";
// auth'ı burada da import etmemiz gerekiyor
import { auth } from '../lib/firebase.js';

export default GroupCallView;