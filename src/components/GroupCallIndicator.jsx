// src/components/GroupCallIndicator.jsx
import React, 'react';
import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { ref, get } from 'firebase/database';
import styles from './GroupCallIndicator.module.css';
import { IoVideocamOutline } from 'react-icons/io5';

const GroupCallIndicator = ({ groupId, callData, onJoin, onLeave, currentUserId }) => {
    const [participantNames, setParticipantNames] = useState([]);
    const isParticipant = callData.participants && callData.participants[currentUserId];
    const participantCount = callData.participants ? Object.keys(callData.participants).length : 0;

    useEffect(() => {
        if (!callData?.participants) {
            setParticipantNames([]);
            return;
        }

        const participantUids = Object.keys(callData.participants);
        
        const fetchNames = async () => {
            const names = await Promise.all(
                participantUids.slice(0, 3).map(async (uid) => {
                    const userSnap = await get(ref(db, `userSearchIndex/${uid}`));
                    return userSnap.exists() ? userSnap.val().username : 'Kullanıcı';
                })
            );
            setParticipantNames(names);
        };

        fetchNames();
    }, [callData.participants]);

    const participantText = participantCount > 3
        ? `${participantNames.slice(0, 2).join(', ')} ve ${participantCount - 2} kişi daha`
        : participantNames.join(', ');
        
    const buttonClass = isParticipant ? `${styles.actionButton} ${styles.leaveButton}` : styles.actionButton;
    const buttonText = isParticipant ? 'Ayrıl' : 'Katıl';
    const onClick = isParticipant ? onLeave : onJoin;

    return (
        <div className={styles.callIndicatorContainer}>
            <div className={styles.infoSection}>
                <div className={styles.icon}><IoVideocamOutline size={22} /></div>
                <div className={styles.textSection}>
                    <span className={styles.title}>{isParticipant ? '🟢 Görüşmedesiniz' : 'Grup Araması Aktif'}</span>
                    <span className={styles.participants}>{participantText} ({participantCount})</span>
                </div>
            </div>
            <button className={buttonClass} onClick={onClick}>
                {buttonText}
            </button>
        </div>
    );
};

export default GroupCallIndicator;