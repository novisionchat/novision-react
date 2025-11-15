// --- DOSYA: src/context/VoiceChannelContext.jsx (DAHA KARARLI VE DOĞRU VERİ ÇEKEN HALİ) ---

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { db, auth } from '../lib/firebase';
import { ref, remove, set, get } from "firebase/database"; // "get" eklendi

const VoiceChannelContext = createContext();

export const useVoiceChannel = () => useContext(VoiceChannelContext);

const AGORA_APP_ID = "c1a39c1b29b24faba92cc2a0c187294d";
const API_BASE_URL = "https://novision-backend.onrender.com";

export const VoiceChannelProvider = ({ children }) => {
    const [agoraClient, setAgoraClient] = useState(null);
    const [localAudioTrack, setLocalAudioTrack] = useState(null);
    const [remoteUsers, setRemoteUsers] = useState([]);
    
    const [currentChannel, setCurrentChannel] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const isJoinedRef = useRef(false);

    useEffect(() => {
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        setAgoraClient(client);

        const handleUserPublished = async (user, mediaType) => {
            await client.subscribe(user, mediaType);
            if (mediaType === 'audio') { user.audioTrack.play(); }
            setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]);
        };
        const handleUserLeft = (user) => {
            setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
        };
        client.on('user-published', handleUserPublished);
        client.on('user-left', handleUserLeft);
        return () => {
            client.off('user-published', handleUserPublished);
            client.off('user-left', handleUserLeft);
        };
    }, []);

    useEffect(() => {
        const handleBeforeUnload = async () => {
            if (isJoinedRef.current) { await leaveChannel(); }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (isJoinedRef.current) { leaveChannel(); }
        };
    }, [currentChannel]);

    const joinChannel = async (groupId, channelId, channelName) => {
        const currentUser = auth.currentUser;
        if (!agoraClient || !currentUser || isJoinedRef.current) {
            console.error("[VoiceContext] Kanala katılma engellendi.", {agoraClient, currentUser, isJoined: isJoinedRef.current});
            return;
        }
        
        if (currentChannel) { await leaveChannel(); }
        setIsLoading(true);
        try {
            const uid = currentUser.uid;
            const agoraChannelName = `${groupId}_${channelId}`;
            
            const response = await fetch(`${API_BASE_URL}/api/agora/token/${agoraChannelName}/${uid}`);
            if (!response.ok) throw new Error('Sunucudan Agora token alınamadı.');
            const data = await response.json();
            const token = data.token;
            if (!token) throw new Error('Alınan token geçersiz.');

            await agoraClient.join(AGORA_APP_ID, agoraChannelName, token, uid);
            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            await agoraClient.publish([audioTrack]);
            setLocalAudioTrack(audioTrack);
            setCurrentChannel({ groupId, channelId, name: channelName });
            isJoinedRef.current = true;

            // --- DEĞİŞİKLİK: KULLANICI BİLGİSİNİ DATABASE'DEN ÇEKME ---
            // Bu sayede currentUser.photoURL yerine her zaman güncel olan profil verisi (GIF dahil) kullanılır.
            const userProfileRef = ref(db, `userSearchIndex/${currentUser.uid}`);
            const userProfileSnap = await get(userProfileRef);
            
            let userProfileData = { displayName: currentUser.displayName, avatar: '/assets/icon.png' };
            if (userProfileSnap.exists()) {
                const profile = userProfileSnap.val();
                userProfileData = {
                    displayName: profile.username, // displayName yerine username kullandığınızdan emin olun
                    avatar: profile.avatar,
                };
            }
            
            const userInChannelRef = ref(db, `groups/${groupId}/voiceChannels/${channelId}/members/${uid}`);
            await set(userInChannelRef, userProfileData);

        } catch (error) {
            console.error("[VoiceContext] Kanala katılma sürecinde HATA:", error);
            if(localAudioTrack) {
                localAudioTrack.stop();
                localAudioTrack.close();
                setLocalAudioTrack(null);
            }
            if (agoraClient.connectionState !== 'DISCONNECTED') {
                await agoraClient.leave();
            }
            setCurrentChannel(null);
            isJoinedRef.current = false;
        } finally {
            setIsLoading(false);
        }
    };

    const leaveChannel = async () => {
        const currentUser = auth.currentUser;
        if (!agoraClient || !currentChannel || !isJoinedRef.current || !currentUser) return;
        
        setIsLoading(true);
        try {
            const userInChannelRef = ref(db, `groups/${currentChannel.groupId}/voiceChannels/${currentChannel.channelId}/members/${currentUser.uid}`);
            await remove(userInChannelRef);
            localAudioTrack?.stop();
            localAudioTrack?.close();
            await agoraClient.leave();
        } catch (error) {
            console.error("Kanaldan ayrılırken hata:", error);
        } finally {
            setLocalAudioTrack(null);
            setRemoteUsers([]);
            setCurrentChannel(null);
            setIsMuted(false);
            setIsLoading(false);
            isJoinedRef.current = false;
        }
    };

    const toggleMute = async () => {
        if (localAudioTrack) {
            await localAudioTrack.setMuted(!isMuted);
            setIsMuted(!isMuted);
        }
    };

    const value = {
        joinChannel,
        leaveChannel,
        toggleMute,
        currentChannel,
        isMuted,
        isLoading
    };

    return (
        <VoiceChannelContext.Provider value={value}>
            {children}
        </VoiceChannelContext.Provider>
    );
};