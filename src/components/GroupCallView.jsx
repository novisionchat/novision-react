// --- DOSYA: src/components/GroupCallView.jsx (NİHAİ VE ÇALIŞIR SÜRÜM) ---

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
const client = AgoraRTC.createClient({ codec: "vp8", mode: "rtc" });

const VideoCallUI = ({ endGroupCall, groupCallViewMode }) => {
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);

    const { localMicrophoneTrack } = useLocalMicrophoneTrack(micOn);
    const { localCameraTrack } = useLocalCameraTrack(cameraOn);
    const remoteUsers = useRemoteUsers();
    const rtcClient = useRTCClient();

    useEffect(() => {
        const publishTracks = async () => {
            if (localMicrophoneTrack && localCameraTrack) {
                await rtcClient.publish([localMicrophoneTrack, localCameraTrack]);
            }
        };
        publishTracks();
        return () => {
             if (localMicrophoneTrack && localCameraTrack) {
                rtcClient.unpublish([localMicrophoneTrack, localCameraTrack]);
             }
        };
    }, [localCameraTrack, localMicrophoneTrack, rtcClient]);

    // Katılımcı sayısına göre dinamik grid stili oluştur
    const gridStyle = {
        display: 'grid',
        width: '100%',
        height: '100%',
        gap: groupCallViewMode === 'pip' ? '8px' : '15px',
        // Katılımcı sayısına göre kolon sayısını ayarla
        gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(remoteUsers.length + 1))}, 1fr)`,
    };
    
    return (
        <>
            <div className={styles.videoGridContainer} data-drag-handle="true" style={gridStyle}>
                {/* DİĞER KULLANICILARIN VİDEOSU */}
                {remoteUsers.map(user => (
                    // DÜZELTME 1: Siyah ekran sorunu için style eklendi
                    <div key={user.uid} className="remote-user-container" style={{ width: '100%', height: '100%', borderRadius: '8px', overflow: 'hidden' }}>
                        <RemoteUser user={user} playVideo={true} playAudio={true} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                ))}

                 {/* KENDİ GÖRÜNTÜMÜZÜN YÜZEN PENCERESİ */}
                 {/* Eğer 1'den fazla kişi varsa kendi görüntümüzü küçük göster, teksek tam ekran */}
                 {cameraOn && remoteUsers.length > 0 ? (
                    <div className={styles.floatingLocalUser}>
                        <LocalVideoTrack track={localCameraTrack} play={true} className={styles.localVideo} />
                    </div>
                 ) : cameraOn && (
                    <div className="local-user-container" style={{ width: '100%', height: '100%', borderRadius: '8px', overflow: 'hidden' }}>
                       <LocalVideoTrack track={localCameraTrack} play={true} className={styles.localVideo} />
                    </div>
                 )}
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
                    <VideoCallUI endGroupCall={endGroupCall} groupCallViewMode={groupCallViewMode}/>
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