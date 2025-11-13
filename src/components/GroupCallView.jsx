// --- DOSYA: src/components/GroupCallView.jsx (HATA GİDERİLMİŞ VE TAM SÜRÜM) ---

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

// Agora App ID'niz
const AGORA_APP_ID = "c1a39c1b29b24faba92cc2a0c187294d";

// 1. ADIM: Agora Client'ını oluşturuyoruz. Bileşen dışında tanımlanmalı.
const client = AgoraRTC.createClient({ codec: "vp8", mode: "rtc" });

// 2. ADIM: Video ve kontrolleri içeren UI'ı ayrı bir bileşene taşıyoruz.
// Bu bileşen, sadece kanala başarılı bir şekilde katıldıktan sonra render edilecek.
const VideoCallUI = ({ endGroupCall }) => {
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);

    const { localMicrophoneTrack, isMute: isMicMuted } = useLocalMicrophoneTrack(micOn);
    const { localCameraTrack, isMute: isCamMuted } = useLocalCameraTrack(cameraOn);
    const remoteUsers = useRemoteUsers();
    
    // Ses ve video izlerini client'a yayınlıyoruz
    const rtcClient = useRTCClient();
    useEffect(() => {
        rtcClient.publish([localMicrophoneTrack, localCameraTrack]);
        return () => {
            rtcClient.unpublish([localMicrophoneTrack, localCameraTrack]);
        };
    }, [localCameraTrack, localMicrophoneTrack, rtcClient]);

    return (
        <>
            <div className={styles.videoGridContainer} data-drag-handle="true">
                {/* Diğer kullanıcıları ekrana basıyoruz */}
                {remoteUsers.map(user => (
                    <div key={user.uid} className="remote-user-video" style={{ width: '100%', height: '100%'}}>
                        <RemoteUser user={user} playVideo={true} playAudio={true} />
                    </div>
                ))}

                {/* Kendi görüntümüzün yüzen penceresi */}
                {cameraOn && (
                    <div className={styles.floatingLocalUser}>
                        <LocalVideoTrack
                            track={localCameraTrack}
                            play={true}
                            className={styles.localVideo}
                        />
                    </div>
                )}
            </div>

            {/* Kontrol Butonları */}
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
    const { 
        groupCall, 
        groupCallViewMode, 
        setGroupCallViewMode, 
        endGroupCall,
    } = useCall();
    
    const pipRef = useRef(null);
    const { style: draggableStyle } = useDraggable(pipRef);
    const [isJoined, setIsJoined] = useState(false); // Bağlantı durumunu tutacak state

    // 3. ADIM: Kanala katılma ve ayrılma mantığını useEffect içinde yönetiyoruz.
    useEffect(() => {
        if (groupCall) {
            // Kanala katılma fonksiyonu
            const joinChannel = async () => {
                await client.join(AGORA_APP_ID, groupCall.channelName, groupCall.token, auth.currentUser.uid);
                setIsJoined(true);
            };
            
            joinChannel();

            // Cleanup fonksiyonu: Bileşen unmount olduğunda kanaldan ayrıl
            return () => {
                setIsJoined(false);
                client.leave();
            };
        }
    }, [groupCall]); // Sadece groupCall değiştiğinde çalışır


    if (groupCallViewMode === 'closed' || !groupCall) {
        return null;
    }
    
    const containerClasses = `${styles.callContainer} ${groupCallViewMode === 'pip' ? styles.pipScreen : styles.fullScreen}`;
    const containerStyle = groupCallViewMode === 'pip' ? { ...draggableStyle } : {};

    return (
        <div ref={pipRef} className={containerClasses} style={containerStyle}>
            {/* 4. ADIM: AgoraRTCProvider artık client'ı doğru şekilde sarmalıyor */}
            <AgoraRTCProvider client={client}>
                {/* Video UI'ını sadece kanala katılım başarılı olduğunda gösteriyoruz */}
                {isJoined ? (
                    <VideoCallUI endGroupCall={endGroupCall} />
                ) : (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        Bağlanılıyor...
                    </div>
                )}
                
                {/* Küçült/Büyüt Butonları dışarıda kalabilir çünkü Agora hook'larını kullanmıyorlar */}
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