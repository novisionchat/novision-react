// --- DOSYA: src/components/GroupCallView.jsx (NİHAİ VE EN KARARLI HALİ) ---

import React, { useRef, useState, useEffect } from 'react';
import {
    AgoraRTCProvider,
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

// --- DÜZELTME: BU BİLEŞENİ ÖNEMLİ ÖLÇÜDE BASİTLEŞTİRİYORUZ ---
// Manuel publish/unpublish işlemlerini içeren useEffect kaldırıldı.
// Artık tüm yayın yaşam döngüsünü agora-rtc-react hook'ları yönetecek.
const VideoCallUI = ({ endGroupCall }) => {
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);

    // Bu hook'lar, micOn/cameraOn durumuna göre OTOMATİK olarak publish/unpublish yapar.
    // Başka bir koda gerek yoktur.
    const { localMicrophoneTrack } = useLocalMicrophoneTrack(micOn);
    const { localCameraTrack } = useLocalCameraTrack(cameraOn);
    
    const remoteUsers = useRemoteUsers();
    
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
                {remoteUsers.map(user => (
                    <div key={user.uid} className="grid-item" style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: '12px', background: '#2c2c2c', position: 'relative' }}>
                        <RemoteUser user={user} playVideo={true} playAudio={true} style={{ width: '100%', height: '100%', objectFit: 'cover' }}>
                            {!user.hasVideo && (
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2c2c2c' }}>
                                    <span style={{color: 'white', fontSize: '12px'}}>Kamera Kapalı</span>
                                </div>
                            )}
                        </RemoteUser>
                    </div>
                ))}
            </div>
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

// Ana component'te bir değişiklik gerekmiyor, önceki hali doğruydu.
const GroupCallView = () => {
    const { groupCall, groupCallViewMode, setGroupCallViewMode, endGroupCall } = useCall();
    const pipRef = useRef(null);
    const { style: draggableStyle } = useDraggable(pipRef);
    const [isJoined, setIsJoined] = useState(false);
    const joinRef = useRef(false);

    const [client] = useState(() => AgoraRTC.createClient({ codec: "vp8", mode: "rtc" }));

    useEffect(() => {
        if (!client || !isJoined) return;

        const handleUserPublished = async (user, mediaType) => {
            await client.subscribe(user, mediaType);
            if (mediaType === 'audio') {
                user.audioTrack?.play();
            }
        };
        const handleUserUnpublished = (user, mediaType) => {};

        client.on("user-published", handleUserPublished);
        client.on("user-unpublished", handleUserUnpublished);

        return () => {
            client.off("user-published", handleUserPublished);
            client.off("user-unpublished", handleUserUnpublished);
        };
    }, [client, isJoined]);

    useEffect(() => {
        let isMounted = true;

        if (groupCall && !joinRef.current) {
            joinRef.current = true;
            const joinChannel = async () => {
                try {
                    if (client.connectionState === 'DISCONNECTED') {
                        await client.join(AGORA_APP_ID, groupCall.channelName, groupCall.token, auth.currentUser.uid);
                    }
                    if (isMounted) setIsJoined(true);
                } catch (error) {
                    console.error("Agora join failed:", error);
                    joinRef.current = false; 
                }
            };
            joinChannel();
        }

        const cleanup = async () => {
            if (joinRef.current || client.connectionState !== 'DISCONNECTED') {
                joinRef.current = false;
                setIsJoined(false);
                await client.leave();
            }
        };

        return () => {
            isMounted = false;
            if (!groupCall) {
                cleanup();
            }
        };
    }, [groupCall, client]);

    if (groupCallViewMode === 'closed' || !groupCall) return null;

    const containerClasses = `${styles.callContainer} ${groupCallViewMode === 'pip' ? styles.pipScreen : styles.fullScreen}`;
    const containerStyle = groupCallViewMode === 'pip' ? { ...draggableStyle } : {};

    const handleEndCall = async () => {
        // Artık cleanup fonksiyonu her şeyi hallettiği için burayı basitleştirebiliriz.
        endGroupCall();
    };

    return (
        <div ref={pipRef} className={containerClasses} style={containerStyle}>
            <AgoraRTCProvider client={client}>
                {isJoined ? (
                    // rtcClient prop'una artık gerek yok
                    <VideoCallUI endGroupCall={handleEndCall} />
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