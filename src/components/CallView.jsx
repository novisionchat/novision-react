// --- DOSYA: src/components/CallView.jsx (GÜNCELLENMİŞ) ---

import React, { useRef, useEffect, useState } from 'react';
import { useCall } from '../context/CallContext.jsx';
import { useDraggable } from '../hooks/useDraggable.js';
import styles from './CallView.module.css';
import { 
    IoClose, IoExpand, IoContract, IoMicOff, IoMic, 
    IoVideocamOff, IoVideocam, IoCall, IoSync 
} from "react-icons/io5";
import { auth } from '../lib/firebase.js';

const CallView = () => {
    const { 
        call, viewMode, setViewMode, localTracks, remoteUsers, endCall, 
        toggleMic, toggleCamera, flipCamera, isMicMuted, isCameraOff
    } = useCall();
    
    const pipRef = useRef(null);
    const { style: draggableStyle } = useDraggable(pipRef); // useDraggable'dan gelen stili yeniden adlandırdık
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    // --- YENİ EKLENEN BÖLÜMLER ---
    const [videoAspectRatio, setVideoAspectRatio] = useState(null);
    const [controlsVisible, setControlsVisible] = useState(true);
    const controlsTimerRef = useRef(null);

    // Kontrolleri gösteren ve 3 saniye sonra gizleyen fonksiyon
    const showControls = () => {
        setControlsVisible(true);
        if (controlsTimerRef.current) {
            clearTimeout(controlsTimerRef.current);
        }
        controlsTimerRef.current = setTimeout(() => {
            setControlsVisible(false);
        }, 3000);
    };

    useEffect(() => {
        showControls(); // Bileşen yüklendiğinde kontrolleri göster
        return () => {
            if (controlsTimerRef.current) {
                clearTimeout(controlsTimerRef.current);
            }
        };
    }, []);
    // --- YENİ BÖLÜMLER BİTİŞİ ---

    useEffect(() => {
        if (viewMode === 'full' && pipRef.current) {
            const updateHeight = () => {
                const vh = window.innerHeight;
                pipRef.current.style.setProperty('--call-height', `${vh}px`);
            };
            updateHeight();
            window.addEventListener('resize', updateHeight);
            return () => window.removeEventListener('resize', updateHeight);
        }
    }, [viewMode]);

    useEffect(() => {
        if (localTracks.video && localVideoRef.current) {
            localTracks.video.play(localVideoRef.current);
        }
    }, [localTracks.video]);

    useEffect(() => {
        const remoteUser = remoteUsers[0];
        const videoElement = remoteVideoRef.current;
        if (remoteUser?.videoTrack && videoElement) {
            remoteUser.videoTrack.play(videoElement);

            // --- YENİ: Video'nun en-boy oranını almak için ---
            const handleMetadata = () => {
                if (videoElement.videoWidth > 0) {
                    const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
                    setVideoAspectRatio(aspectRatio);
                }
            };
            videoElement.addEventListener('loadedmetadata', handleMetadata);
            return () => {
                videoElement.removeEventListener('loadedmetadata', handleMetadata);
            };
            // --- YENİ BÖLÜM BİTİŞİ ---
        } else {
             setVideoAspectRatio(null); // Kullanıcı ayrıldığında oranı sıfırla
        }
    }, [remoteUsers]);

    if (!call || viewMode === 'closed') return null;

    // --- YENİ: Dinamik PiP Pencere Stili ---
    const pipDynamicStyle = {};
    if (viewMode === 'pip') {
        const baseWidth = 300; // PiP penceresinin temel genişliği
        pipDynamicStyle.width = `${baseWidth}px`;
        // Eğer video oranı varsa, yüksekliği ona göre ayarla. Yoksa varsayılan 4:3 oranını kullan.
        pipDynamicStyle.height = videoAspectRatio ? `${baseWidth / videoAspectRatio}px` : `400px`;
    }

    const containerStyle = viewMode === 'pip' ? { ...draggableStyle, ...pipDynamicStyle } : {};
    // --- YENİ BÖLÜM BİTİŞİ ---

    const currentUser = auth.currentUser;
    const otherUserName = currentUser && call.callerId === currentUser.uid ? call.calleeName : call.callerName;
    const isVideoCall = call.type === 'video';
    const containerClass = `${styles.pipContainer} ${viewMode === 'pip' ? styles.pipWindow : ''} ${viewMode === 'full' ? styles.fullWindow : ''}`;

    const renderAudioCallUI = () => (
        <div className={styles.audioCallContainer}>
            <img src="/assets/icon.png" alt="Avatar" className={styles.audioCallAvatar} />
            <h3>{otherUserName}</h3>
            <span>Sesli Görüşme</span>
        </div>
    );

    return (
        // DEĞİŞİKLİK: onClick ve onMouseMove ile kontrolleri göster
        <div 
            ref={pipRef} 
            className={containerClass} 
            style={containerStyle}
            onClick={showControls}
            onMouseMove={showControls}
        >
            {/* DEĞİŞİKLİK: controlsVisible durumuna göre gizle/göster */}
            <div className={`${styles.pipHeader} ${!controlsVisible ? styles.controlsHidden : ''}`} data-drag-handle>
                <span>{otherUserName} ile görüşme</span>
                <div className={styles.pipControls}>
                    {viewMode === 'pip' ? (
                        <button onClick={(e) => { e.stopPropagation(); setViewMode('full'); }} title="Genişlet"><IoExpand /></button>
                    ) : (
                        <button onClick={(e) => { e.stopPropagation(); setViewMode('pip'); }} title="Küçült"><IoContract /></button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); endCall(); }} title="Kapat"><IoClose /></button>
                </div>
            </div>
            <div className={styles.pipContent}>
                {isVideoCall ? (
                    <>
                        <div className={styles.remoteVideoContainer}>
                             <video ref={remoteVideoRef} playsInline autoPlay />
                            {remoteUsers.length === 0 && <div className={styles.waitingText}>Bağlanılıyor...</div>}
                        </div>
                        <div className={styles.localVideoContainer}>
                            <video ref={localVideoRef} playsInline autoPlay muted />
                        </div>
                    </>
                ) : (
                    renderAudioCallUI()
                )}
                
                {/* DEĞİŞİKLİK: controlsVisible durumuna göre gizle/göster */}
                <div className={`${styles.callControls} ${!controlsVisible ? styles.controlsHidden : ''}`}>
                    <button onClick={(e) => { e.stopPropagation(); toggleMic(); }} className={isMicMuted ? styles.danger : ''}>
                        {isMicMuted ? <IoMicOff size={24} /> : <IoMic size={24} />}
                    </button>
                    {isVideoCall && (
                        <>
                            <button onClick={(e) => { e.stopPropagation(); toggleCamera(); }} className={isCameraOff ? styles.danger : ''}>
                                {isCameraOff ? <IoVideocamOff size={24} /> : <IoVideocam size={24} />}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); flipCamera(); }}><IoSync size={24} /></button>
                        </>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); endCall(); }} className={styles.endCallBtn}>
                        <IoCall size={24} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CallView;