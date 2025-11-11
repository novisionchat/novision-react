// --- DOSYA: src/context/CallContext.jsx (VANILLA JS'DEN UYARLANDI) ---

import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { ref, set, onValue, remove, serverTimestamp, push } from 'firebase/database';
import { useToast } from './ToastContext.jsx';
import AgoraRTC from 'agora-rtc-sdk-ng';

const CallContext = createContext();
export const useCall = () => useContext(CallContext);

const AGORA_APP_ID = "c1a39c1b29b24faba92cc2a0c187294d"; // Sizin video.js'den alındı
const SERVER_URL = 'https://novision-backend.onrender.com';

export const CallProvider = ({ children }) => {
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null); // { channelName, callerId, calleeId, status, etc. }
  const [viewMode, setViewMode] = useState('closed');
  const [localTracks, setLocalTracks] = useState({ audio: null, video: null });
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const { showToast } = useToast();
  const loggedInUser = auth.currentUser;

  // --- Agora Client'ı Sadece Bir Kez Oluştur ---
  useEffect(() => {
    const agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    setClient(agoraClient);
  }, []);

  // --- Gelen Aramaları Dinle (main.js'deki listeners.calls mantığı) ---
  useEffect(() => {
    if (!loggedInUser || !client) return;

    const incomingCallRef = ref(db, `calls/${loggedInUser.uid}`);
    const unsubscribe = onValue(incomingCallRef, (snapshot) => {
      if (snapshot.exists()) {
        const callData = snapshot.val();
        // Sadece 'ringing' durumundaki yeni aramalar için bildirim göster
        if (callData.status === 'ringing' && call?.callId !== callData.callId) {
          setCall(callData);
          showToast(`${callData.callerName} sizi arıyor...`, {
            persistent: true,
            actions: [
              { text: "Cevapla", onClick: () => acceptCall(callData) },
              { text: "Reddet", onClick: () => declineCall(callData) }
            ]
          });
        }
      }
    });

    return () => unsubscribe();
  }, [loggedInUser, client, call]); // 'call' state'i eklendi, böylece mevcut arama varken yeni bildirim gelmez

  // --- Agora Olay Dinleyicileri (video.js'deki client.on(...) mantığı) ---
  useEffect(() => {
    if (!client) return;

    const handleUserPublished = async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]);
      if (mediaType === 'audio') {
        user.audioTrack.play();
      }
    };

    const handleUserUnpublished = (user) => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    };

    const handleUserLeft = () => {
      showToast("Kullanıcı aramadan ayrıldı.", false);
      endCall();
    };

    client.on("user-published", handleUserPublished);
    client.on("user-unpublished", handleUserUnpublished);
    client.on("user-left", handleUserLeft);

    return () => {
      client.off("user-published", handleUserPublished);
      client.off("user-unpublished", handleUserUnpublished);
      client.off("user-left", handleUserLeft);
    };
  }, [client]);

  const getToken = async (channelName, uid) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/agora/token/${channelName}/${uid}`);
      if (!response.ok) throw new Error('Token alınamadı');
      return (await response.json()).token;
    } catch (error) {
      console.error("Token alma hatası:", error);
      showToast("Arama sunucusuna bağlanılamadı.", true);
      return null;
    }
  };

  // --- Arama Başlatma ve Katılma Mantığı ---
  const joinChannel = async (callData, user) => {
    if (!client) return;
    try {
      const token = await getToken(callData.channelName, user.uid);
      if (!token) throw new Error("Geçersiz token.");

      await client.join(AGORA_APP_ID, callData.channelName, token, user.uid);

      const [audioTrack, videoTrack] = await Promise.all([
        AgoraRTC.createMicrophoneAudioTrack(),
        AgoraRTC.createCameraVideoTrack()
      ]);
      
      setLocalTracks({ audio: audioTrack, video: videoTrack });
      await client.publish([audioTrack, videoTrack]);
      
      setViewMode('pip');
    } catch (error) {
      console.error("Kanala katılım hatası:", error);
      showToast("Aramaya katılamadı: " + error.message, true);
      await endCall();
    }
  };

  const initiateCall = async (calleeId, calleeName, user) => {
    const channelName = push(ref(db, 'calls')).key;
    const callData = {
      callId: channelName,
      channelName,
      callerId: user.uid,
      callerName: user.displayName,
      calleeId,
      calleeName,
      status: 'ringing',
      timestamp: serverTimestamp(),
    };
    
    await set(ref(db, `calls/${calleeId}`), callData);
    setCall(callData);
    await joinChannel(callData, user);
  };

  const acceptCall = async (callData) => {
    const user = auth.currentUser;
    if (!user) return;
    
    // Önce arama verisini Firebase'den temizle ki bildirim tekrar gelmesin
    await remove(ref(db, `calls/${user.uid}`));
    
    setCall({ ...callData, status: 'active' });
    await joinChannel({ ...callData, status: 'active' }, user);
    
    // Arayan kişiye de durumun 'active' olduğunu bildir (opsiyonel ama iyi bir pratik)
    await set(ref(db, `calls/${callData.callerId}`), { ...callData, status: 'active' });
  };

  const declineCall = async (callData) => {
    await remove(ref(db, `calls/${callData.calleeId}`));
    await remove(ref(db, `calls/${callData.callerId}`)); // Arayanın da beklemesini engelle
  };

  const endCall = useCallback(async () => {
    if (!client) return;
    
    localTracks.audio?.stop();
    localTracks.audio?.close();
    localTracks.video?.stop();
    localTracks.video?.close();
    
    if (client.connectionState === 'CONNECTED') {
      await client.leave();
    }
    
    if (call) {
      // Her iki kullanıcı için de arama verisini temizle
      remove(ref(db, `calls/${call.callerId}`));
      remove(ref(db, `calls/${call.calleeId}`));
    }

    setLocalTracks({ audio: null, video: null });
    setRemoteUsers([]);
    setCall(null);
    setViewMode('closed');
    setIsMicMuted(false);
    setIsCameraOff(false);
  }, [client, call, localTracks]);

  // --- Kontrol Fonksiyonları (video.js'den) ---
  const toggleMic = async () => {
    if (!localTracks.audio) return;
    await localTracks.audio.setEnabled(isMicMuted); // Mevcut durumun tersini uygula
    setIsMicMuted(!isMicMuted);
  };

  const toggleCamera = async () => {
    if (!localTracks.video) return;
    await localTracks.video.setEnabled(isCameraOff); // Mevcut durumun tersini uygula
    setIsCameraOff(!isCameraOff);
  };

  const flipCamera = async () => {
    if (isCameraOff || !localTracks.video) return;
    try {
      await localTracks.video.switchDevice('video');
    } catch (e) {
      showToast("Kamera değiştirilemedi.", true);
      console.error("Kamera çevirme hatası:", e);
    }
  };

  const value = {
    call, viewMode, setViewMode, localTracks, remoteUsers,
    initiateCall, endCall, toggleMic, toggleCamera, flipCamera,
    isMicMuted, isCameraOff
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};