// src/components/GroupCallGrid.jsx
import React, { useRef, useEffect, useState } from 'react';
import styles from './GroupCallGrid.module.css';
import { IoMicOff, IoMic } from "react-icons/io5";
import { get, ref } from 'firebase/database';
import { db } from '../lib/firebase';

// Not: React.memo, prop'lar değişmediği sürece bileşenin yeniden render edilmesini engeller.
const ParticipantTile = React.memo(({ user, isLocal, localTracks }) => {
    const [name, setName] = useState(user.name || 'Kullanıcı');
    // DÜZELTME: Agora'ya ID göndermek için video konteynerinin ID'si
    const videoContainerId = `participant-video-${user.uid}`;

    useEffect(() => {
        const videoTrack = isLocal ? localTracks.video : user.videoTrack;
        if (videoTrack) {
            // DÜZELTME: Agora'ya DOM elementi yerine ID'yi veriyoruz.
            videoTrack.play(videoContainerId);
        }
    }, [user.uid, user.videoTrack, isLocal, localTracks.video, videoContainerId]);

    useEffect(() => {
        if (!user.name && user.uid) {
            get(ref(db, `userSearchIndex/${user.uid}`)).then(snapshot => {
                if (snapshot.exists()) setName(snapshot.val().username);
            });
        }
    }, [user.uid, user.name]);

    const videoTrack = isLocal ? localTracks.video : user.videoTrack;
    const isVideoOff = !videoTrack || (isLocal ? !localTracks.video.enabled : !user.hasVideo);
    const isMicMuted = isLocal ? (localTracks.audio ? !localTracks.audio.enabled : true) : !user.hasAudio;
    const initials = (name || 'K').substring(0, 2).toUpperCase();

    return (
        <div className={`${styles.videoTile} ${isLocal ? styles.localVideoTile : ''}`}>
            {/* DÜZELTME: Benzersiz ID'ye sahip konteyner div */}
            <div id={videoContainerId} className={styles.videoPlayer} style={{ display: isVideoOff ? 'none' : 'block' }}></div>
            
            {isVideoOff && <div className={styles.avatarPlaceholder}>{initials}</div>}
            
            <div className={styles.userInfoOverlay}>
                <span>{name}{isLocal ? " (Siz)" : ""}</span>
                <span className={`${styles.micStatus} ${isMicMuted ? styles.muted : ''}`}>
                    {isMicMuted ? <IoMicOff size={18} /> : <IoMic size={18} />}
                </span>
            </div>
        </div>
    );
});


const GroupCallGrid = ({ call, localTracks, remoteUsers, currentUserId }) => {
    const containerRef = useRef(null);
    // DÜZELTME: State'i daha basit ve etkili yönetmek için allParticipants
    const [allParticipants, setAllParticipants] = useState([]);

    useEffect(() => {
        const localUser = {
            uid: currentUserId,
            name: call.participants[currentUserId]?.name,
            isLocal: true,
            hasVideo: localTracks.video?.enabled,
            hasAudio: localTracks.audio?.enabled,
        };

        const remoteParticipants = remoteUsers.map(user => ({
            uid: user.uid,
            name: call.participants[user.uid]?.name,
            isLocal: false,
            videoTrack: user.videoTrack,
            audioTrack: user.audioTrack,
            hasVideo: user.hasVideo,
            hasAudio: user.hasAudio,
        }));
        
        // DÜZELTME: Yerel ve uzak kullanıcıları birleştirip state'e yaz
        setAllParticipants([localUser, ...remoteParticipants]);

    }, [call.participants, localTracks, remoteUsers, currentUserId]);
    
    // Grid düzenini dinamik olarak ayarla
    useEffect(() => {
        if (containerRef.current) {
            const count = allParticipants.length;
            let gridClass = styles.largeGrid;
            if (count === 1) gridClass = styles.single;
            else if (count === 2) gridClass = styles.duo;
            else if (count <= 4) gridClass = styles.quad;
            
            containerRef.current.className = `${styles.groupCallGrid} ${gridClass}`;
        }
    }, [allParticipants.length]);


    return (
        <div ref={containerRef} className={styles.groupCallGrid}>
            {allParticipants.map(p => (
                <ParticipantTile key={p.uid} user={p} isLocal={p.isLocal} localTracks={localTracks} />
            ))}
        </div>
    );
};

export default GroupCallGrid;