// --- DOSYA: src/components/GroupCallView.jsx (AKILLI GRİD VE SİYAH EKRAN SORUNU GİDERİLDİ) ---

import React, { useRef, useState, useEffect } from 'react';
import {
    AgoraRTCProvider,
    useRTCClient,
    useLocalCameraTrack,
    useLocalMicrophoneTrack,
    useRemoteUsers,
    RemoteUser,
    LocalVideoTrack
} from "agora-rtc-react";
import AgoraRTC from "agora-rtc-sdk-ng";

import { useCall } from '../context/CallContext';
import { useDraggable } from '../hooks/useDraggable';
import styles from './GroupCallView.module.css'; // Bu CSS dosyası kullanılmaya devam edecek
import { auth } from '../lib/firebase';
import { IoContract, IoExpand, IoVideocam, IoVideocamOff, IoMic, IoMicOff, IoCall } from "react-icons/io5";

const AGORA_APP_ID = "c1a39c1b29b24faba92cc2a0c187294d";
const client = AgoraRTC.createClient({ codec: "vp8", mode: "rtc" });

// Arayüzü içeren bileşen
const VideoCallUI = ({ endGroupCall }) => {
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);

    const { localMicrophoneTrack } = useLocalMicrophoneTrack(micOn);
    const { localCameraTrack } = useLocalCameraTrack(cameraOn);
    const remoteUsers = useRemoteUsers();
    const rtcClient = useRTCClient();

    useEffect(() => {
        // Cihazlar hazır olduğunda kanalda yayınla
        if (localMicrophoneTrack && localCameraTrack) {
            rtcClient.publish([localMicrophoneTrack, localCameraTrack]);
        }
        return () => {
            // Bileşen ayrıldığında yayını durdur
            if (localMicrophoneTrack && localCameraTrack) {
                rtcClient.unpublish([localMicrophoneTrack, localCameraTrack]);
            }
        };
    }, [localCameraTrack, localMicrophoneTrack, rtcClient]);

    // --- 1. ADIM: AKILLI GRİD MANTIĞI ---
    // Toplam katılımcı sayısı (kendimiz + diğerleri)
    const participantCount = remoteUsers.length + 1;
    // Grid'in kolon sayısını hesapla (2 katılımcı -> 2, 4 katılımcı -> 2, 9 katılımcı -> 3)
    const gridCols = Math.ceil(Math.sqrt(participantCount));
    
    // Dinamik grid stilini oluştur
    const gridStyle = {
        display: 'grid',
        width: '100%',
        height: '100%',
        gap: '15px',
        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
        gridTemplateRows: `repeat(${Math.ceil(participantCount / gridCols)}, 1fr)`
    };

    return (
        <>
            {/* --- 2. ADIM: GRİD'İ UYGULA --- */}
            <div className={styles.videoGridContainer} style={gridStyle} data-drag-handle="true">
                
                {/* KENDİ VİDEOMUZU GRİD'İN BİR PARÇASI YAPIYORUZ */}
                {cameraOn && (
                    <div className="grid-item" style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: '12px' }}>
                        <LocalVideoTrack
                            track={localCameraTrack}
                            play={true}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                        />
                    </div>
                )}
                
                {/* DİĞER KULLANICILARIN VİDEOLARI */}
                {remoteUsers.map(user => (
                    <div key={user.uid} className="grid-item" style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: '12px', background: '#2c2c2c' }}>
                        {/* --- 3. ADIM: SİYAH EKRAN ÇÖZÜMÜ --- */}
                        {/* RemoteUser bileşenine doğrudan stil vererek kaplama yapmasını sağlıyoruz */}
                        <RemoteUser
                            user={user}
                            playVideo={true}
                            playAudio={true}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>
                ))}
            </div>

            {/* Kontrol Butonları (Aynı kalıyor) */}
            <div className={styles.controlsWrapper}>
                <button className={styles.controlBtn} onClick={() => setMicOn(on => !on)}>
                    {micOn ? <IoMic /> : <IoMicOff style={{ color: '#ff4444' }} />}
                </button>
                <button className={styles.controlBtn} onClick={() => setCameraOn(on => !on)}>
                    {cameraOn ? <IoVideocam /> : <IoVideocamOff style={{ color: '#ff4444' }} />}
                </button>
                <button className={styles.controlBtn} style={{ backgroundColor: '#ff4444' }} onClick={endGroupCall}>
                    <IoCall />
                </button>
            </div>
        </>
    );
};

// Ana bileşen (Aynı kalıyor)
const GroupCallView = () => {
    const { groupCall, groupCallViewMode, setGroupCallViewMode, endGroupCall } = useCall();
    const pipRef = useRef(null);
    const { style: draggableStyle } = useDraggable(pipRef);
    const [isJoined, setIsJoined] = useState(false);

    useEffect(() => {
        if (groupCall) {
            const joinChannel = async () => {
                try {
                    await client.join(AGORA_APP_ID, groupCall.channelName, groupCall.token, auth.currentUser.uid);
                    setIsJoined(true);
                } catch (error) {
                    console.error("Agora join failed:", error);
                }
            };
            joinChannel();

            return () => {
                setIsJoined(false);
                client.leave();
            };
        }
    }, [groupCall]);

    if (groupCallViewMode === 'closed' || !groupCall) return null;

    const containerClasses = `${styles.callContainer} ${groupCallViewMode === 'pip' ? styles.pipScreen : styles.fullScreen}`;
    const containerStyle = groupCallViewMode === 'pip' ? { ...draggableStyle } : {};

    return (
        <div ref={pipRef} className={containerClasses} style={containerStyle}>
            <AgoraRTCProvider client={client}>
                {isJoined ? (
                    <VideoCallUI endGroupCall={endGroupCall} />
                ) : (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        Bağlanılıyor...
                    </div>
                )}
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
            </AgoraRTCProvider>
        </div>
    );
};

export default GroupCallView;