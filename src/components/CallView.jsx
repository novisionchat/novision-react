// --- DOSYA: src/components/CallView.jsx (TÜM YOLLAR DÜZELTİLDİ) ---

import React, { useRef, useEffect, useState } from 'react';
import { useCall } from '../context/CallContext.jsx';         // DÜZELTME: Yol ../context/CallContext.jsx oldu
import { useDraggable } from '../hooks/useDraggable.js';       // DÜZELTME: Yol ../hooks/useDraggable.js oldu
import styles from './CallView.module.css';                    // Bu yol doğruydu, aynı kalıyor
import { 
    IoClose, IoExpand, IoContract, IoMicOff, IoMic, 
    IoVideocamOff, IoVideocam, IoCall, IoSync, IoDesktop 
} from "react-icons/io5";
import { auth } from '../lib/firebase.js';                     // DÜZELTME: Yol ../lib/firebase.js oldu
import AgoraRTC from 'agora-rtc-sdk-ng';

const CallView = () => {
    const { 
        call, viewMode, setViewMode, localTracks, remoteUsers, endCall, 
        isScreenSharing, setIsScreenSharing, agoraClient 
    } = useCall();
    
    const pipRef = useRef(null);
    const { style } = useDraggable(pipRef);

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [screenTrack, setScreenTrack] = useState(null);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    useEffect(() => {
        if (localTracks.video && localVideoRef.current) {
            localTracks.video.play(localVideoRef.current);
        }
        return () => {
            localTracks.video?.stop();
        };
    }, [localTracks.video]);

    useEffect(() => {
        if (remoteUsers.length > 0 && remoteVideoRef.current) {
            remoteUsers[0].videoTrack.play(remoteVideoRef.current);
        }
        return () => {
            remoteUsers[0]?.videoTrack?.stop();
        };
    }, [remoteUsers]);

    const handleToggleMute = async () => {
        await localTracks.audio.setMuted(!isMuted);
        setIsMuted(!isMuted);
    };

    const handleToggleVideo = async () => {
        await localTracks.video.setMuted(!isVideoOff);
        setIsVideoOff(!isVideoOff);
    };

    const handleSwitchCamera = async () => {
        try {
            await localTracks.video.switchDevice('video');
        } catch (e) {
            console.error('Kamera değiştirilemedi:', e);
        }
    };

    const handleScreenShare = async () => {
        if (isScreenSharing) {
            await agoraClient.unpublish(screenTrack);
            screenTrack.close();
            setScreenTrack(null);
            await agoraClient.publish(localTracks.video);
            setIsScreenSharing(false);
        } else {
            const track = await AgoraRTC.createScreenVideoTrack({}, "auto");
            setScreenTrack(track);
            await agoraClient.unpublish(localTracks.video);
            await agoraClient.publish(track);
            setIsScreenSharing(true);
        }
    };

    if (!call || viewMode === 'closed') return null;

    const otherUserName = call.callerId === auth.currentUser.uid ? call.calleeName : call.callerName;
    const containerClass = `${styles.pipContainer} ${viewMode === 'pip' ? styles.pipWindow : ''} ${viewMode === 'full' ? styles.fullWindow : ''}`;

    return (
        <div ref={pipRef} className={containerClass} style={viewMode === 'pip' ? style : {}}>
            <div className={styles.pipHeader} data-drag-handle>
                <span>{otherUserName} ile görüşme</span>
                <div className={styles.pipControls}>
                    {viewMode === 'pip' ? (
                        <button onClick={() => setViewMode('full')} title="Genişlet"><IoExpand /></button>
                    ) : (
                        <button onClick={() => setViewMode('pip')} title="Küçült"><IoContract /></button>
                    )}
                    <button onClick={endCall} title="Kapat"><IoClose /></button>
                </div>
            </div>
            <div className={styles.pipContent}>
                <div className={styles.remoteVideoContainer} ref={remoteVideoRef}>
                    {remoteUsers.length === 0 && <div className={styles.waitingText}>Bağlanılıyor...</div>}
                </div>
                <div className={styles.localVideoContainer} ref={localVideoRef}></div>
                
                <div className={styles.callControls}>
                    <button onClick={handleToggleMute} className={isMuted ? styles.danger : ''}>
                        {isMuted ? <IoMicOff size={24} /> : <IoMic size={24} />}
                    </button>
                    <button onClick={handleToggleVideo} className={isVideoOff ? styles.danger : ''}>
                        {isVideoOff ? <IoVideocamOff size={24} /> : <IoVideocam size={24} />}
                    </button>
                    <button onClick={handleSwitchCamera}><IoSync size={24} /></button>
                    <button onClick={handleScreenShare} className={isScreenSharing ? styles.active : ''}>
                        <IoDesktop size={24} />
                    </button>
                    <button onClick={endCall} className={styles.endCallBtn}>
                        <IoCall size={24} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CallView;