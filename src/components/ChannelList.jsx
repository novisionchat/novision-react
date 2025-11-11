// src/components/ChannelList.jsx
import React, { useState, useEffect } from 'react'; // DÜZELTME: useState ve useEffect buraya eklendi
import { db } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';
import styles from './ChannelList.module.css';
import { IoChatbubbleOutline } from "react-icons/io5";

function ChannelList({ groupId, onSelectChannel, activeChannelId }) {
  const [channels, setChannels] = useState([]);

  useEffect(() => {
    if (!groupId) return;
    const channelsRef = ref(db, `groups/${groupId}/channels`);
    const unsubscribe = onValue(channelsRef, (snapshot) => {
      const channelsData = [];
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          channelsData.push({ id: child.key, ...child.val().meta });
        });
      }
      setChannels(channelsData);
    });
    return () => unsubscribe();
  }, [groupId]);

  return (
    <div className={styles.channelListContainer}>
      <h4>KANALLAR</h4>
      <ul>
        {channels.map(channel => (
          <li key={channel.id}>
            <button 
              className={`${styles.channelButton} ${activeChannelId === channel.id ? styles.active : ''}`}
              onClick={() => onSelectChannel(channel.id)}
            >
              <IoChatbubbleOutline />
              <span>{channel.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ChannelList;