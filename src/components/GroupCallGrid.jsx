// src/components/GroupCallGrid.jsx
import React, { useRef, useEffect, useState } from 'react';
import styles from './GroupCallGrid.module.css';
import { IoMicOff, IoMic } from "react-icons/io5";
import { get } from 'firebase/database';
import { ref } from 'firebase/database';
import { db } from '../lib/firebase';

const ParticipantTile = React.memo(({ user, isLocal, localTracks }) => {
    const videoRef = useRef(null);
    const [name, setName] = useState(user.name || 'Kullanıcı');

    useEffect(() => {
        const videoTrack = isLocal ? localTracks.video : user.videoTrack;

        if (videoTrack && videoRef.current) {
            // Mevcut bir video elementi varsa kaldır
            const existingVideo = videoRef.current.querySelector('video');
            if(existingVideo) existingVideo.remove();
            
            videoTrack.play(videoRef.current);
        }
        
    }, [user.uid, user.videoTrack, isLocal, localTracks.video]);

    useEffect(() => {
        // Kullanıcı adı bilgisini Firebase'den çek, eğer eksikse
        if (!user.name && user.uid) {
            const userRef = ref(db, `userSearchIndex/${user.uid}`);
            get(userRef).then(snapshot => {
                if (snapshot.exists()) {
                    setName(snapshot.val().username);
                }
            });
        }
    }, [user.uid, user.name]);

    const videoTrack = isLocal ? localTracks.video : user.videoTrack;
    const isVideoOff = !videoTrack || (isLocal ? !localTracks.video.enabled : !user.hasVideo);
    const isMicMuted = isLocal ? localTracks.audio && !localTracks.audio.enabled : !user.hasAudio;
    const initials = (name || 'K').substring(0, 2).toUpperCase();

    return (
        <div className={`${styles.videoTile} ${isLocal ? styles.localVideoTile : ''}`}>
            <div ref={videoRef} style={{ width: '100%', height: '100%', display: isVideoOff ? 'none' : 'block' }}></div>
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
        
        const participants = [localUser, ...remoteParticipants];
        setAllParticipants(participants);

        if (containerRef.current) {
            const count = participants.length;
            let gridClass = styles.largeGrid;
            if (count === 1) gridClass = styles.single;
            else if (count === 2) gridClass = styles.duo;
            else if (count <= 4) gridClass = styles.quad;
            
            containerRef.current.className = `${styles.groupCallGrid} ${gridClass}`;
        }

    }, [call.participants, localTracks, remoteUsers, currentUserId]);

    return (
        <div ref={containerRef} className={styles.groupCallGrid}>
            {allParticipants.map(p => (
                <ParticipantTile 
                    key={p.uid} 
                    user={p} 
                    isLocal={p.isLocal} 
                    localTracks={localTracks} 
                />
            ))}
        </div>
    );
};

export default GroupCallGrid;