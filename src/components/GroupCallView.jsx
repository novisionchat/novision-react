// --- DOSYA: src/components/GroupCallView.jsx (ABONELİK SORUNU İÇİN DÜZELTİLMİŞ HALİ) ---

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

// (VideoCallUI bileşeninde bir değişiklik yok, aynı kalabilir)
const VideoCallUI = ({ endGroupCall, rtcClient }) => {
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);

    const { localMicrophoneTrack } = useLocalMicrophoneTrack(micOn);
    const { localCameraTrack } = useLocalCameraTrack(cameraOn);
    
    const remoteUsers = useRemoteUsers();
    
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


const GroupCallView = () => {
    const { groupCall, groupCallViewMode, setGroupCallViewMode, endGroupCall } = useCall();
    const pipRef = useRef(null);
    const { style: draggableStyle } = useDraggable(pipRef);
    const [isJoined, setIsJoined] = useState(false);
    const joinRef = useRef(false);

    const [client] = useState(() => AgoraRTC.createClient({ codec: "vp8", mode: "rtc" }));

    // --- YENİ EKLENEN KOD: MANUEL ABONELİK İÇİN ---
    useEffect(() => {
        if (!client || !isJoined) return;

        // Bir kullanıcı yayın yaptığında tetiklenir
        const handleUserPublished = async (user, mediaType) => {
            console.log(`[Agora] User published: ${user.uid}, Type: ${mediaType}`);
            try {
                // Bu kullanıcıya abone oluyoruz.
                await client.subscribe(user, mediaType);
                console.log(`[Agora] Successfully subscribed to ${user.uid}`);
                
                // Eğer video ise, RemoteUser component'i zaten otomatik oynatmalı.
                // Eğer ses ise, burada manuel oynatma gerekebilir ama RemoteUser hallediyor olmalı.
                if (mediaType === 'audio') {
                    user.audioTrack?.play();
                }

            } catch (error) {
                console.error(`[Agora] Failed to subscribe to user ${user.uid}`, error);
            }
        };

        // Bir kullanıcının yayını kesildiğinde tetiklenir
        const handleUserUnpublished = (user, mediaType) => {
            console.log(`[Agora] User unpublished: ${user.uid}, Type: ${mediaType}`);
        };

        client.on("user-published", handleUserPublished);
        client.on("user-unpublished", handleUserUnpublished);

        return () => {
            // Component unmount olduğunda dinleyicileri temizle
            client.off("user-published", handleUserPublished);
            client.off("user-unpublished", handleUserUnpublished);
        };
    }, [client, isJoined]); // isJoined'e bağımlı hale getirildi

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