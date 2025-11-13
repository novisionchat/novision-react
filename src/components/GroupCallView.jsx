// --- DOSYA: src/components/GroupCallView.jsx (NİHAİ VE AKILLI VERSİYON) ---

import React, { useRef, useMemo } from 'react';
import { Grid, AgoraButtons, LocalUser, RemoteUser } from 'agora-react-uikit';
import { useCall } from '../context/CallContext';
import { useDraggable } from '../hooks/useDraggable';
import styles from './GroupCallView.module.css';
import { auth } from '../lib/firebase';

const GroupCallView = () => {
    const { 
        groupCall, 
        groupCallViewMode, 
        setGroupCallViewMode, 
        endGroupCall,
        remoteUsers, // DM aramasındaki remoteUsers'ı burada da kullanacağız
        localTracks 
    } = useCall();
    
    const pipRef = useRef(null);
    const { style: draggableStyle } = useDraggable(pipRef);
    const currentUser = auth.currentUser;

    // Kendi kullanıcımız ve uzaktaki kullanıcıları tek bir listede birleştiriyoruz
    const allUsers = useMemo(() => {
        if (!currentUser) return [];
        const local = { uid: currentUser.uid, hasAudio: !!localTracks.audio, hasVideo: !!localTracks.video };
        return [local, ...remoteUsers];
    }, [currentUser, remoteUsers, localTracks]);

    if (groupCallViewMode === 'closed' || !groupCall || !currentUser) {
        return null;
    }

    const totalUsers = allUsers.length;
    let displayedUsers = [];
    let showFloatingLocalUser = false;

    // Akıllı görüntüleme mantığı
    if (totalUsers <= 3) {
        // 3 veya daha az kişiysek, ana gridden kendimizi çıkarıp altta küçük göster
        displayedUsers = allUsers.filter(user => user.uid !== currentUser.uid);
        showFloatingLocalUser = true;
    } else {
        // 4 veya daha fazla kişiysek, herkesi (kendimiz dahil) ana gridde göster
        displayedUsers = allUsers;
        showFloatingLocalUser = false;
    }
    
    // PiP modunda her zaman herkesi gridde göster (yer kaplamasın diye)
    if (groupCallViewMode === 'pip') {
        displayedUsers = allUsers;
        showFloatingLocalUser = false;
    }

    const rtcProps = {
        appId: AGORA_APP_ID,
        channel: groupCall.channelName,
        token: groupCall.token,
        enableScreensharing: true,
    };

    const callbacks = {
        EndCall: () => endGroupCall(),
    };

    // DM arayüzüyle aynı stil özelliklerini tanımlıyoruz
    const styleProps = {
        gridVideo: { // Griddeki her bir video için
             borderRadius: '10px',
        },
        // Kontrol butonları
        controlBtnStyles: {
            backgroundColor: 'rgba(255,255,255,0.2)',
            width: '50px',
            height: '50px',
        },
        endCallBtnStyles: {
            backgroundColor: '#ff4444',
            transform: 'rotate(135deg)',
        },
        // Butonların olduğu bar
        controlContainer: {
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: '12px 25px',
            borderRadius: '50px',
        }
    };
    
    // PiP modu için daha küçük stiller
    if (groupCallViewMode === 'pip') {
        styleProps.controlBtnStyles = { ...styleProps.controlBtnStyles, width: '40px', height: '40px' };
        styleProps.controlContainer = { ...styleProps.controlContainer, padding: '8px 15px' };
    }

    const containerClasses = `${styles.callContainer} ${groupCallViewMode === 'pip' ? styles.pipScreen : styles.fullScreen}`;
    const containerStyle = groupCallViewMode === 'pip' ? { ...draggableStyle } : {};

    return (
        <div ref={pipRef} className={containerClasses} style={containerStyle} data-drag-handle>
            <div className={styles.videoGrid}>
                <Grid 
                    users={displayedUsers} 
                    styleProps={styleProps}
                    render={(user) => (
                        user.uid === currentUser.uid 
                        ? <LocalUser {...user} /> 
                        : <RemoteUser {...user} />
                    )} 
                />
            </div>
            
            {/* 3 kişiden azken görünecek olan küçük yerel video */}
            {showFloatingLocalUser && localTracks.video && (
                <div className={styles.localUserView}>
                    <LocalUser
                        audioTrack={localTracks.audio}
                        videoTrack={localTracks.video}
                        playVideo={true}
                        playAudio={false}
                    />
                </div>
            )}

            <div className={styles.controlsContainer}>
                <AgoraButtons
                    rtcProps={rtcProps}
                    callbacks={callbacks}
                    styleProps={styleProps}
                />
            </div>
        </div>
    );
};

const AGORA_APP_ID = "c1a39c1b29b24faba92cc2a0c187294d";

export default GroupCallView;