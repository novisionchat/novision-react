// --- DOSYA: src/components/CallView.jsx (RESPONSIVE YÜKSEKLİK DÜZELTMESİ) ---

import React, { useRef, useEffect } from 'react';
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
    const { style } = useDraggable(pipRef);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    // --- YENİ EKLENEN BÖLÜM: HER CİHAZA UYUMLU YÜKSEKLİK İÇİN ---
    useEffect(() => {
        // Bu efekt sadece tam ekran modunda çalışsın
        if (viewMode === 'full' && pipRef.current) {
            const updateHeight = () => {
                // Pencerenin gerçek iç yüksekliğini ölç ve bir CSS değişkenine ata
                const vh = window.innerHeight;
                pipRef.current.style.setProperty('--call-height', `${vh}px`);
            };

            updateHeight(); // İlk açılışta yüksekliği ayarla
            window.addEventListener('resize', updateHeight); // Pencere boyutu değiştiğinde (örn: telefon yan döndüğünde) tekrar ayarla

            // Bileşen kapandığında event listener'ı temizle (hafıza sızıntısını önler)
            return () => {
                window.removeEventListener('resize', updateHeight);
            };
        }
    }, [viewMode]); // Sadece viewMode değiştiğinde çalışsın
    // --- YENİ BÖLÜM BİTİŞİ ---

    useEffect(() => {
        if (localTracks.video && localVideoRef.current) {
            localTracks.video.play(localVideoRef.current);
        }
    }, [localTracks.video]);

    useEffect(() => {
        const remoteUser = remoteUsers[0];
        if (remoteUser?.videoTrack && remoteVideoRef.current) {
            remoteUser.videoTrack.play(remoteVideoRef.current);
        }
    }, [remoteUsers]);

    if (!call || viewMode === 'closed') return null;

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
                {isVideoCall ? (
                    <>
                        <div className={styles.remoteVideoContainer} ref={remoteVideoRef}>
                            {remoteUsers.length === 0 && <div className={styles.waitingText}>Bağlanılıyor...</div>}
                        </div>
                        <div className={styles.localVideoContainer} ref={localVideoRef}></div>
                    </>
                ) : (
                    renderAudioCallUI()
                )}
                
                <div className={styles.callControls}>
                    <button onClick={toggleMic} className={isMicMuted ? styles.danger : ''}>
                        {isMicMuted ? <IoMicOff size={24} /> : <IoMic size={24} />}
                    </button>
                    {isVideoCall && (
                        <>
                            <button onClick={toggleCamera} className={isCameraOff ? styles.danger : ''}>
                                {isCameraOff ? <IoVideocamOff size={24} /> : <IoVideocam size={24} />}
                            </button>
                            <button onClick={flipCamera}><IoSync size={24} /></button>
                        </>
                    )}
                    <button onClick={endCall} className={styles.endCallBtn}>
                        <IoCall size={24} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CallView;