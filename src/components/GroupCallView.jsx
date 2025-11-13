// --- DOSYA: src/components/GroupCallView.jsx (NİHAİ DÜZELTİLMİŞ HALİ) ---

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

// --- DÜZELTME 1: Agora Client Yönetimi (EN ÖNEMLİ DEĞİŞİKLİK) ---
// Client'ı globalde oluşturmak yerine, component içinde useState ile yönetiyoruz.
// Bu, component her mount olduğunda temiz bir client örneği oluşturulmasını sağlar
// ve "karşı tarafın medyasının gelmemesi" sorununu çözer.
// const client = AgoraRTC.createClient({ codec: "vp8", mode: "rtc" }); // <- BU SATIR KALDIRILDI

// Arayüzü içeren bileşen
const VideoCallUI = ({ endGroupCall, rtcClient }) => { // rtcClient prop olarak alındı
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);

    // Donanım hook'ları
    const { localMicrophoneTrack } = useLocalMicrophoneTrack(micOn);
    const { localCameraTrack } = useLocalCameraTrack(cameraOn);
    
    const remoteUsers = useRemoteUsers();
    // useRTCClient hook'u artık prop'tan gelen client'ı kullanacak
    // const rtcClient = useRTCClient();

    useEffect(() => {
        if (!rtcClient) return;

        if (localMicrophoneTrack && localCameraTrack) {
            rtcClient.publish([localMicrophoneTrack, localCameraTrack]);
        }

        return () => {
            if (rtcClient.connectionState !== 'DISCONNECTED') {
                if (localMicrophoneTrack || localCameraTrack) {
                    rtcClient.unpublish([localMicrophoneTrack, localCameraTrack].filter(Boolean));
                }
            }
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
    const joinRef = useRef(false);

    // --- DÜZELTME 1: Agora Client Yönetimi (DEVAMI) ---
    // Client'ı burada useState ile oluşturuyoruz.
    const [client] = useState(() => AgoraRTC.createClient({ codec: "vp8", mode: "rtc" }));

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

        // Cleanup function for leaving the channel
        const cleanup = async () => {
            if (joinRef.current) {
                joinRef.current = false;
                setIsJoined(false);
                if (client.connectionState !== 'DISCONNECTED') {
                    await client.leave();
                }
            }
        };

        return () => {
            isMounted = false;
            // Component unmount olduğunda veya arama bittiğinde (groupCall null olduğunda) çıkış yap
            if (!groupCall) {
                cleanup();
            }
        };
    }, [groupCall, client]);

    if (groupCallViewMode === 'closed' || !groupCall) return null;

    const containerClasses = `${styles.callContainer} ${groupCallViewMode === 'pip' ? styles.pipScreen : styles.fullScreen}`;
    const containerStyle = groupCallViewMode === 'pip' ? { ...draggableStyle } : {};

    const handleEndCall = async () => {
        setIsJoined(false);
        joinRef.current = false;
        if (client.connectionState !== 'DISCONNECTED') {
            await client.leave();
        }
        endGroupCall();
    };

    return (
        <div ref={pipRef} className={containerClasses} style={containerStyle}>
            {/* Düzeltilmiş client nesnesini Provider'a veriyoruz */}
            <AgoraRTCProvider client={client}>
                {isJoined ? (
                    <VideoCallUI rtcClient={client} endGroupCall={handleEndCall} />
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