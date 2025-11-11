// --- DOSYA: src/context/CallContext.jsx (TÜM HATALAR DÜZELTİLDİ) ---

import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { ref, set, onValue, remove, serverTimestamp, push } from 'firebase/database';
import { useToast } from './ToastContext.jsx';
import AgoraRTC from 'agora-rtc-sdk-ng';

const CallContext = createContext();

export const useCall = () => useContext(CallContext);

const agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
const SERVER_URL = 'https://novision-backend.onrender.com';

export const CallProvider = ({ children }) => {
  const [call, setCall] = useState(null);
  const [viewMode, setViewMode] = useState('closed');
  const [localTracks, setLocalTracks] = useState({ audio: null, video: null });
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const { showToast } = useToast();
  const loggedInUser = auth.currentUser;

  const initiateCall = async (calleeId, calleeName, user) => {
    if (!user) {
      console.error("[CallContext] Arama başlatılamadı: Geçerli kullanıcı bilgisi sağlanmadı.");
      return;
    }
    const channelName = push(ref(db, 'calls')).key;
    
    const callData = {
      callId: channelName,
      appId: 'c1a39c1b29b24faba92cc2a0c187294d', // KENDİ AGORA APP ID'Nİ GİR
      channelName,
      callerId: user.uid,
      callerName: user.displayName,
      calleeId,
      calleeName,
      status: 'ringing',
      timestamp: serverTimestamp(),
    };

    try {
      await set(ref(db, `calls/${calleeId}`), callData);
      setCall(callData);
      setViewMode('pip');
    } catch (error) {
      console.error("[CallContext] Firebase'e yazma hatası:", error);
    }
  };

  const getToken = async (channelName, uid) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/agora/token/${channelName}/${uid}`);
      if (!response.ok) throw new Error('Token alınamadı');
      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error("Token alma hatası:", error);
      return null;
    }
  };

  // DÜZELTME 2: joinChannel fonksiyonuna detaylı loglama ve hata yakalama eklendi
  const joinChannel = async (callData, user) => {
    console.log("[CallContext] joinChannel fonksiyonu başlatıldı.");
    try {
      const token = await getToken(callData.channelName, user.uid);
      if (!token) {
        console.error("Agora token alınamadı, işlem durduruldu.");
        return;
      }
      console.log("Agora token başarıyla alındı.");

      await agoraClient.join(callData.appId, callData.channelName, token, user.uid);
      console.log("Agora kanalına başarıyla join olundu.");

      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      const videoTrack = await AgoraRTC.createCameraVideoTrack();
      console.log("Lokal ses ve video kanalları oluşturuldu.");
      
      setLocalTracks({ audio: audioTrack, video: videoTrack });
      await agoraClient.publish([audioTrack, videoTrack]);
      console.log("Lokal kanallar başarıyla yayınlandı.");
    } catch (error) {
      console.error("[CallContext] joinChannel sırasında kritik hata:", error);
    }
  };

  // DÜZELTME 2: acceptCall fonksiyonuna detaylı loglama eklendi
  const acceptCall = useCallback(async (callData) => {
    console.log("[CallContext] acceptCall fonksiyonu tetiklendi.");
    const user = auth.currentUser;
    if (!user) {
      console.error("Arama kabul edilemedi, kullanıcı bulunamadı.");
      return;
    }

    await joinChannel(callData, user);
    
    console.log("Firebase durumu 'active' olarak güncelleniyor.");
    await set(ref(db, `calls/${callData.callerId}`), { ...callData, status: 'active' });
    await set(ref(db, `calls/${user.uid}`), { ...callData, status: 'active' });
    
    console.log("React state'i 'active' ve 'pip' olarak güncelleniyor.");
    setCall({ ...callData, status: 'active' });
    setViewMode('pip');
  }, []);

  const declineCall = useCallback(async (callData) => {
    await remove(ref(db, `calls/${callData.calleeId}`));
    await remove(ref(db, `calls/${callData.callerId}`));
    setCall(null);
    setViewMode('closed');
  }, []);

  const endCall = useCallback(async () => {
    const user = auth.currentUser;
    if (call && user) {
      const otherUserId = call.callerId === user.uid ? call.calleeId : call.callerId;
      remove(ref(db, `calls/${otherUserId}`));
      remove(ref(db, `calls/${user.uid}`));
    }
    
    localTracks.audio?.close();
    localTracks.video?.close();
    setLocalTracks({ audio: null, video: null });
    
    if (agoraClient.connectionState === 'CONNECTED' || agoraClient.connectionState === 'CONNECTING') {
        await agoraClient.leave();
    }

    setRemoteUsers([]);
    setCall(null);
    setViewMode('closed');
    setIsScreenSharing(false);
  }, [call, localTracks]);

  useEffect(() => {
    if (!loggedInUser) return;

    const incomingCallRef = ref(db, `calls/${loggedInUser.uid}`);
    const unsubscribe = onValue(incomingCallRef, (snapshot) => {
      const callData = snapshot.val();
      // Gelen arama zaten state'de varsa tekrar bildirim gösterme
      if (callData && callData.status === 'ringing' && call?.callId !== callData.callId) {
        setCall(callData);
        showToast(`${callData.callerName} sizi arıyor...`, {
          persistent: true,
          actions: [
            { text: "Kabul Et", onClick: () => acceptCall(callData) },
            { text: "Reddet", onClick: () => declineCall(callData) }
          ]
        });
      } else if (callData && callData.status === 'active' && call?.status !== 'active') {
        // Başka bir cihazda kabul edilirse senkronize et
        setCall(callData);
        setViewMode('pip');
      }
    });

    return () => unsubscribe();
    // DÜZELTME 1: Bağımlılık dizisinden 'call' kaldırıldı, döngü engellendi.
  }, [loggedInUser, showToast, acceptCall, declineCall]);

  useEffect(() => {
    const handleUserPublished = async (user, mediaType) => {
      await agoraClient.subscribe(user, mediaType);
      if (mediaType === 'video') {
        setRemoteUsers(prev => [...prev, user]);
      }
      if (mediaType === 'audio') {
        user.audioTrack.play();
      }
    };
    const handleUserUnpublished = (user) => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    };
    const handleUserLeft = () => {
      endCall();
    };

    agoraClient.on('user-published', handleUserPublished);
    agoraClient.on('user-unpublished', handleUserUnpublished);
    agoraClient.on('user-left', handleUserLeft);

    return () => {
      agoraClient.off('user-published', handleUserPublished);
      agoraClient.off('user-unpublished', handleUserUnpublished);
      agoraClient.off('user-left', handleUserLeft);
    };
  }, [endCall]);

  const value = {
    call,
    viewMode,
    setViewMode,
    localTracks,
    remoteUsers,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    isScreenSharing,
    setIsScreenSharing,
    agoraClient
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};