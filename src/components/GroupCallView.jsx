// --- DOSYA: src/components/GroupCallView.jsx (NİHAİ VE AKILLI ARAYÜZ) ---

import React, { useRef, useMemo } from 'react';
import { Grid, AgoraButtons } from 'agora-react-uikit';
import { useCall } from '../context/CallContext';
import { useDraggable } from '../hooks/useDraggable';
import styles from './GroupCallView.module.css'; // Yeni stillerimizi import ediyoruz
import { auth } from '../lib/firebase';
import { IoContract, IoExpand } from "react-icons/io5";

// Agora App ID'sini burada tanımlıyoruz.
const AGORA_APP_ID = "c1a39c1b29b24faba92cc2a0c187294d";

// Kendi videomuzu göstermek için küçük bir bileşen
const LocalUserView = ({ localVideoTrack }) => {
    const videoRef = useRef(null);

    React.useEffect(() => {
        if (videoRef.current && localVideoTrack) {
            localVideoTrack.play(videoRef.current);
        }
        return () => {
            localVideoTrack?.stop();
        };
    }, [localVideoTrack]);

    return (
        <div className={styles.floatingLocalUser}>
            <div ref={videoRef} className={styles.localVideo}></div>
        </div>
    );
};


const GroupCallView = () => {
    const { 
        groupCall, 
        groupCallViewMode, 
        setGroupCallViewMode, 
        endGroupCall,
        remoteUsers,      // Artık remoteUsers'ı da alıyoruz
        localTracks       // Kendi video track'imizi almak için
    } = useCall();
    
    const pipRef = useRef(null);
    const { style: draggableStyle } = useDraggable(pipRef); // 1. Sürüklenebilir PiP çözüldü.

    // Memoize ederek gereksiz render'ları önle
    const allUsers = useMemo(() => {
        const currentUser = auth.currentUser;
        if (!currentUser) return [];
        
        const localUser = {
            uid: currentUser.uid,
            hasAudio: localTracks.audio ? true : false,
            hasVideo: localTracks.video ? true : false,
            videoTrack: localTracks.video,
            audioTrack: localTracks.audio,
            displayName: currentUser.displayName // Görüntülemek için
        };
        return [localUser, ...remoteUsers];
    }, [remoteUsers, localTracks]);


    if (groupCallViewMode === 'closed' || !groupCall) {
        return null;
    }

    // 3. Akıllı Görüntü Yerleşimi Mantığı
    let gridUsers = allUsers;
    let showFloatingLocalUser = false;

    if (allUsers.length <= 3) {
        // 3 veya daha az kişi varsa, ana grid'de sadece diğerlerini göster
        gridUsers = allUsers.filter(user => user.uid !== auth.currentUser.uid);
        // Kendimizi sağ alttaki küçük pencerede göster
        showFloatingLocalUser = true;
    }

    const rtcProps = {
        appId: AGORA_APP_ID,
        channel: groupCall.channelName,
        token: groupCall.token,
        uid: auth.currentUser.uid, // UID'mizi belirtmek önemli
        enableScreensharing: true,
    };

    const callbacks = {
        EndCall: () => endGroupCall(),
    };

    // 2. Tam Tema Entegrasyonu: DM arayüzüyle aynı stil
    const styleProps = {
        UIKitContainer: {
            borderRadius: groupCallViewMode === 'pip' ? '12px' : '0',
        },
        gridVideoContainer: {
            borderRadius: '8px',
            border: 'none',
            gap: '8px'
        },
        gridUserContainer: {
             // İsim etiketlerinin stili
            username: {
                backgroundColor: 'rgba(0,0,0,0.5)',
                padding: '4px 8px',
                borderRadius: '0 8px 0 0',
            }
        },
        // Kontrol butonlarının olduğu bar
        controlBar: {
            backgroundColor: 'transparent',
            padding: '15px 25px',
        },
        // Butonların kendisi
        localBtnContainer: {
            backgroundColor: 'rgba(255,255,255,0.2)',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: 'none',
        },
        // Buton aktif değilken (örneğin kamera kapalıyken)
        localBtnContainer_muted: {
            backgroundColor: '#ff4444',
        },
    };

    const containerClasses = `${styles.callContainer} ${groupCallViewMode === 'pip' ? styles.pipScreen : styles.fullScreen}`;
    const containerStyle = groupCallViewMode === 'pip' ? { ...draggableStyle } : {};

    return (
        <div ref={pipRef} className={containerClasses} style={containerStyle}>
            <div className={styles.videoGridContainer}>
                {/* Agora Grid'i sadece katılımcıları göstermek için kullanıyoruz */}
                <Grid users={gridUsers} styleProps={styleProps} />
                {/* 3 kişiden azsa, kendi görüntümüzü ayrı gösteriyoruz */}
                {showFloatingLocalUser && <LocalUserView localVideoTrack={localTracks.video} />}
            </div>
            
            {/* Agora Butonlarını kontroller için kullanıyoruz */}
            <div className={styles.controlsWrapper}>
                <AgoraButtons
                    rtcProps={rtcProps}
                    callbacks={callbacks}
                    styleProps={styleProps}
                />
            </div>

            {/* Kendi özel Küçült/Büyüt butonlarımız */}
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
        </div>
    );
};

export default GroupCallView;