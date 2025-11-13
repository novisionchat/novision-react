// --- DOSYA: src/components/CallView.jsx (GÜNCELLENMİŞ HALİ) ---

import React, { useRef, useEffect, useState, useMemo } from 'react';
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
        toggleMic, toggleCamera, flipCamera, isMicMuted, isCameraOff,
        videoDevices
    } = useCall();

    const pipRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    const initialPipPosition = useMemo(() => {
        if (typeof window === 'undefined') return { x: 0, y: 0 };
        const windowWidth = window.innerWidth;
        const pipWidth = 280;
        const margin = 20;
        return {
            x: windowWidth - pipWidth - margin,
            y: margin
        };
    }, []);

    const { style: draggableStyle } = useDraggable(pipRef, initialPipPosition);
    

    const [videoAspectRatio, setVideoAspectRatio] = useState(16 / 9);
    const [controlsVisible, setControlsVisible] = useState(true);
    const controlsTimerRef = useRef(null);

    const showControls = () => {
        setControlsVisible(true);
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
    };

    useEffect(() => {
        showControls();
        return () => { if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current); };
    }, []);

    useEffect(() => {
        if (viewMode === 'full' && pipRef.current) {
            const updateHeight = () => pipRef.current.style.setProperty('--call-height', `${window.innerHeight}px`);
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

            const handleResize = () => {
                if (videoElement.videoWidth > 0) {
                    const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
                    setVideoAspectRatio(aspectRatio);
                }
            };
            
            videoElement.addEventListener('loadedmetadata', handleResize);
            videoElement.addEventListener('resize', handleResize);

            return () => {
                videoElement.removeEventListener('loadedmetadata', handleResize);
                videoElement.removeEventListener('resize', handleResize);
            };
        } else {
             setVideoAspectRatio(16 / 9);
        }
    }, [remoteUsers]);

    if (!call || viewMode === 'closed') return null;

    const isVideoCall = call.type === 'video';

    const pipDynamicStyle = {};
    if (viewMode === 'pip') {
        const baseWidth = 280;
        pipDynamicStyle.width = `${baseWidth}px`;
        
        if (isVideoCall) {
            pipDynamicStyle.height = `${baseWidth / videoAspectRatio}px`;
        } else {
            pipDynamicStyle.height = `${baseWidth}px`;
        }
    }

    const containerStyle = viewMode === 'pip' ? { ...draggableStyle, ...pipDynamicStyle } : {};
    const currentUser = auth.currentUser;
    const otherUserName = currentUser && call.callerId === currentUser.uid ? call.calleeName : call.callerName;
    const containerClass = `${styles.pipContainer} ${viewMode === 'pip' ? styles.pipWindow : ''} ${viewMode === 'full' ? styles.fullWindow : ''}`;

    const renderAudioCallUI = () => (
        <div className={styles.audioCallContainer}>
            <img src="/assets/icon.png" alt="Avatar" className={styles.audioCallAvatar} />
            <h3>{otherUserName}</h3>
            <span>Sesli Görüşme</span>
        </div>
    );

    return (
        <div
            ref={pipRef}
            className={containerClass}
            style={containerStyle}
            onClick={showControls}
            // --- GÜNCELLENDİ ---: onMouseMove buradan kaldırıldı çünkü sürükleme ile çakışıyordu.
        >
            <div className={`${styles.pipHeader} ${!controlsVisible ? styles.controlsHidden : ''}`} data-drag-handle="true">
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
            {/* --- GÜNCELLENDİ ---: onMouseMove olayı iç panele taşındı. */}
            <div className={styles.pipContent} onMouseMove={showControls}>
                {isVideoCall ? (
                    <>
                        <div className={styles.remoteVideoContainer}>
                             <video ref={remoteVideoRef} playsInline autoPlay />
                            {remoteUsers.length === 0 && <div className={styles.waitingText}>Bağlanılıyor...</div>}
                        </div>
                        {localTracks.video && (
                          <div className={styles.localVideoContainer}>
                              <video ref={localVideoRef} playsInline autoPlay muted />
                          </div>
                        )}
                    </>
                ) : (
                    renderAudioCallUI()
                )}

                <div className={`${styles.callControls} ${!controlsVisible ? styles.controlsHidden : ''}`}>
                    <button onClick={(e) => { e.stopPropagation(); toggleMic(); }} className={isMicMuted ? styles.danger : ''}>
                        {isMicMuted ? <IoMicOff size={24} /> : <IoMic size={24} />}
                    </button>
                    {isVideoCall && (
                        <>
                            <button onClick={(e) => { e.stopPropagation(); toggleCamera(); }} className={isCameraOff ? styles.danger : ''}>
                                {isCameraOff ? <IoVideocamOff size={24} /> : <IoVideocam size={24} />}
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); flipCamera(); }} 
                                disabled={videoDevices.length < 2}
                                title={videoDevices.length < 2 ? "Başka kamera yok" : "Kamerayı Değiştir"}
                            >
                                <IoSync size={24} />
                            </button>
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