// --- DOSYA: src/components/GroupCallView.jsx (DÜZELTİLMİŞ HALİ) ---

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
import styles from './GroupCallView.module.css'; 
import { auth } from '../lib/firebase';
import { IoContract, IoExpand, IoVideocam, IoVideocamOff, IoMic, IoMicOff, IoCall } from "react-icons/io5";

const AGORA_APP_ID = "c1a39c1b29b24faba92cc2a0c187294d";

// Client'ı component dışında oluşturuyoruz ama state yönetimini içeride sıkı tutacağız.
const client = AgoraRTC.createClient({ codec: "vp8", mode: "rtc" });

// Arayüzü içeren bileşen
const VideoCallUI = ({ endGroupCall }) => {
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);

    // Donanım hook'ları
    const { localMicrophoneTrack } = useLocalMicrophoneTrack(micOn);
    const { localCameraTrack } = useLocalCameraTrack(cameraOn);
    
    const remoteUsers = useRemoteUsers();
    const rtcClient = useRTCClient();

    // --- DÜZELTME 2: DONANIM KAPATMA & YAYINLAMA ---
    useEffect(() => {
        // Trackler hazırsa yayınla
        if (localMicrophoneTrack && localCameraTrack) {
            rtcClient.publish([localMicrophoneTrack, localCameraTrack]);
        }

        return () => {
            // Component unmount olduğunda (arama bittiğinde)
            // Önce yayını durdur
            if (localMicrophoneTrack || localCameraTrack) {
                rtcClient.unpublish([localMicrophoneTrack, localCameraTrack].filter(Boolean));
            }
            // SONRA DONANIMI KAPAT (Işıkların sönmesi için kritik nokta)
            localCameraTrack?.close();
            localMicrophoneTrack?.close();
        };
    }, [localCameraTrack, localMicrophoneTrack, rtcClient]);


    // AKILLI GRİD MANTIĞI
    const participantCount = remoteUsers.length + 1;
    const gridCols = Math.ceil(Math.sqrt(participantCount));
    
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
            <div className={styles.videoGridContainer} style={gridStyle} data-drag-handle="true">
                
                {/* KENDİ VİDEOMUZ */}
                {/* Kamera kapalıysa bile yer kaplaması için div'i her zaman render ediyoruz ama track'i kontrol ediyoruz */}
                <div className="grid-item" style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: '12px', background: '#1a1a1a', position: 'relative' }}>
                    {cameraOn && localCameraTrack ? (
                        <LocalVideoTrack
                            track={localCameraTrack}
                            play={true}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                        />
                    ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
                            <IoVideocamOff size={40} />
                        </div>
                    )}
                </div>
                
                {/* DİĞER KULLANICILAR */}
                {remoteUsers.map(user => (
                    <div key={user.uid} className="grid-item" style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: '12px', background: '#2c2c2c', position: 'relative' }}>
                        {/* --- DÜZELTME 1: SİYAH EKRAN İÇİN --- */}
                        {/* RemoteUser'ı user.hasVideo kontrolü ile sarmalıyoruz ve loading durumu ekliyoruz */}
                        <RemoteUser
                            user={user}
                            playVideo={true}
                            playAudio={true}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        >
                            {!user.hasVideo && (
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2c2c2c' }}>
                                    <span style={{color: 'white', fontSize: '12px'}}>Kamera Kapalı</span>
                                </div>
                            )}
                        </RemoteUser>
                    </div>
                ))}
            </div>

            {/* Kontroller */}
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

const GroupCallView = () => {
    const { groupCall, groupCallViewMode, setGroupCallViewMode, endGroupCall } = useCall();
    const pipRef = useRef(null);
    const { style: draggableStyle } = useDraggable(pipRef);
    const [isJoined, setIsJoined] = useState(false);
    
    // --- DÜZELTME 3: ÇİFT KATILIMI ENGELLEME ---
    // React Strict Mode'da useEffect iki kere çalışır, bu ref ile bunu engelliyoruz.
    const joinRef = useRef(false);

    useEffect(() => {
        let isMounted = true;

        if (groupCall && !joinRef.current) {
            joinRef.current = true; // İşlemin başladığını işaretle

            const joinChannel = async () => {
                try {
                    // Eğer client zaten bağlıysa hata vermemesi için kontrol
                    if (client.connectionState === 'DISCONNECTED') {
                        await client.join(AGORA_APP_ID, groupCall.channelName, groupCall.token, auth.currentUser.uid);
                    }
                    if (isMounted) setIsJoined(true);
                } catch (error) {
                    console.error("Agora join failed:", error);
                    // Hata olursa tekrar denemeye izin ver
                    joinRef.current = false; 
                }
            };
            joinChannel();
        }

        return () => {
            isMounted = false;
            // Sayfadan tamamen ayrıldığında veya arama bittiğinde çıkış yap
            // Ancak sadece groupCall null olduğunda veya bileşen unmount olduğunda
            if (!groupCall) {
                joinRef.current = false;
                setIsJoined(false);
                // Trackleri burada kapatmaya gerek yok, VideoCallUI hallediyor.
                // Sadece odadan çıkıyoruz.
                client.leave().catch(err => console.log("Leave error:", err));
            }
        };
    }, [groupCall]);

    // groupCall kapalıysa render etme
    if (groupCallViewMode === 'closed' || !groupCall) return null;

    const containerClasses = `${styles.callContainer} ${groupCallViewMode === 'pip' ? styles.pipScreen : styles.fullScreen}`;
    const containerStyle = groupCallViewMode === 'pip' ? { ...draggableStyle } : {};

    return (
        <div ref={pipRef} className={containerClasses} style={containerStyle}>
            <AgoraRTCProvider client={client}>
                {isJoined ? (
                    <VideoCallUI endGroupCall={() => {
                        // Aramayı bitir butonuna basıldığında
                        setIsJoined(false);
                        joinRef.current = false;
                        client.leave();
                        endGroupCall();
                    }} />
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