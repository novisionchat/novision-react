// --- DOSYA: src/context/CallContext.jsx (TÜM DÜZELTMELER UYGULANMIŞ NİHAİ HALİ) ---

import React, { createContext, useState, useContext, useCallback, useEffect, useRef } from 'react';
import { auth, db } from '../lib/firebase';
import { ref, set, onValue, remove, serverTimestamp, push } from 'firebase/database';
import { useToast } from './ToastContext.jsx';
import AgoraRTC from 'agora-rtc-sdk-ng';

const CallContext = createContext();
export const useCall = () => useContext(CallContext);

const AGORA_APP_ID = "c1a39c1b29b24faba92cc2a0c187294d";
const SERVER_URL = 'https://novision-backend.onrender.com';

export const CallProvider = ({ children }) => {
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [viewMode, setViewMode] = useState('closed');
  const [localTracks, setLocalTracks] = useState({ audio: null, video: null });
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const { showToast } = useToast();
  const loggedInUser = auth.currentUser;
  const tracksRef = useRef({ audio: null, video: null });
  const [videoDevices, setVideoDevices] = useState([]);
  const [currentVideoDeviceIndex, setCurrentVideoDeviceIndex] = useState(0);

  useEffect(() => {
    const agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    setClient(agoraClient);
  }, []);

  const endCall = useCallback(async () => {
    if (!client) return;
    
    const currentTracks = tracksRef.current;
    currentTracks.audio?.stop();
    currentTracks.audio?.close();
    currentTracks.video?.stop();
    currentTracks.video?.close();
    tracksRef.current = { audio: null, video: null };

    if (client.connectionState === 'CONNECTED') {
      await client.leave();
    }
    
    if (call) {
      remove(ref(db, `calls/${call.callerId}`));
      remove(ref(db, `calls/${call.calleeId}`));
    }

    setLocalTracks({ audio: null, video: null });
    setRemoteUsers([]);
    setCall(null);
    setViewMode('closed');
    setIsMicMuted(false);
    setIsCameraOff(false);
    setVideoDevices([]);
    setCurrentVideoDeviceIndex(0);
  }, [client, call]);

  // Gelen aramaları dinleyen useEffect
  useEffect(() => {
    if (!loggedInUser || !client) return;

    const incomingCallRef = ref(db, `calls/${loggedInUser.uid}`);
    const unsubscribe = onValue(incomingCallRef, (snapshot) => {
      if (snapshot.exists()) {
        const callData = snapshot.val();
        // DÜZELTME: Sadece gerçekten aranan kişi bensem bu aramayı işleme al
        if (callData.calleeId === loggedInUser.uid && callData.status === 'ringing' && call?.callId !== callData.callId) {
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
  }, [loggedInUser, client, call]);

  // Giden aramanın durumunu (reddedilme/sonlanma) dinle
  useEffect(() => {
    if (!call || !loggedInUser || call.callerId !== loggedInUser.uid || viewMode === 'closed') {
        return;
    }

    const outgoingCallRef = ref(db, `calls/${call.callerId}`);
    const unsubscribe = onValue(outgoingCallRef, (snapshot) => {
        if (!snapshot.exists() && viewMode !== 'closed') {
            showToast("Arama cevaplanmadı veya reddedildi.", false);
            endCall();
        } else if (snapshot.exists()) {
            const callData = snapshot.val();
            if (callData.status === 'active' && call.status !== 'active') {
                setCall(callData);
            }
        }
    });

    return () => unsubscribe();
  }, [call, loggedInUser, viewMode, endCall]);


  useEffect(() => {
    if (!client) return;
    const handleUserPublished = async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]);
      if (mediaType === 'audio') user.audioTrack.play();
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
  }, [client, endCall]);

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

  const joinChannel = async (callData, user) => {
    if (!client) return;
    try {
      const token = await getToken(callData.channelName, user.uid);
      if (!token) throw new Error("Geçersiz token.");
      await client.join(AGORA_APP_ID, callData.channelName, token, user.uid);
      
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      let videoTrack = null;
      
      if (callData.type === 'video') {
        const cameras = await AgoraRTC.getCameras();
        if (cameras.length === 0) showToast("Kamera bulunamadı.", true);
        setVideoDevices(cameras);
        if (cameras.length > 0) {
          videoTrack = await AgoraRTC.createCameraVideoTrack({ deviceId: cameras[0].deviceId });
        }
      }
      
      tracksRef.current = { audio: audioTrack, video: videoTrack };
      setLocalTracks({ audio: audioTrack, video: videoTrack });
      
      const tracksToPublish = [audioTrack];
      if (videoTrack) tracksToPublish.push(videoTrack);
      await client.publish(tracksToPublish);
      
      setViewMode('pip');
    } catch (error) {
      console.error("Kanala katılım hatası:", error);
      showToast("Aramaya katılamadı: " + error.message, true);
      await endCall();
    }
  };

  // DÜZELTME: Fonksiyona "Stale State" koruması eklendi
  const initiateCall = async (calleeId, calleeName, user, callType) => {
    // 1. KORUMA: Eğer state'te kalmış eski bir arama varsa,
    // yeni bir arama başlatmadan önce onu tamamen temizle.
    if (call) {
        console.warn("Mevcut arama state'i temiz değil. Yeni arama öncesi endCall zorla çalıştırılıyor.");
        await endCall();
    }

    // 2. TEMİZ BAŞLANGIÇ: Yeni aramayı başlat.
    const channelName = push(ref(db, 'calls')).key;
    if (!channelName) {
        showToast("Arama kanalı oluşturulamadı.", true);
        return;
    }

    const callData = {
      callId: channelName, channelName, callerId: user.uid,
      callerName: user.displayName, calleeId, calleeName,
      status: 'ringing', timestamp: serverTimestamp(), type: callType
    };

    try {
        await set(ref(db, `calls/${calleeId}`), callData);
        await set(ref(db, `calls/${user.uid}`), callData); // Arayanın kendi arama durumunu takip edebilmesi için gerekli
        
        setCall(callData);
        await joinChannel(callData, user);

    } catch (error) {
        console.error("Arama başlatma sırasında veritabanı hatası:", error);
        showToast("Arama başlatılamadı. Lütfen tekrar deneyin.", true);
        await endCall(); // Hata durumunda her şeyi temizle
    }
  };

  const acceptCall = async (callData) => {
    const user = auth.currentUser;
    if (!user) return;
    const activeCallData = { ...callData, status: 'active' };
    await set(ref(db, `calls/${callData.callerId}`), activeCallData);
    await set(ref(db, `calls/${user.uid}`), activeCallData);
    setCall(activeCallData);
    await joinChannel(activeCallData, user);
  };

  const declineCall = async (callData) => {
    await remove(ref(db, `calls/${callData.calleeId}`));
    await remove(ref(db, `calls/${callData.callerId}`));
    if (call && call.callId === callData.callId) {
        setCall(null);
    }
  };

  // DÜZELTME: Toggle fonksiyonlarındaki state senkronizasyon sorunu düzeltildi
  const toggleMic = async () => {
    if (!tracksRef.current.audio) return;
    try {
        const newMutedState = !isMicMuted;
        await tracksRef.current.audio.setEnabled(!newMutedState);
        setIsMicMuted(newMutedState);
    } catch (error) {
        console.error("Mikrofon durumu değiştirilemedi:", error);
        showToast("Mikrofon durumu değiştirilemedi.", true);
    }
  };

  const toggleCamera = async () => {
    if (!tracksRef.current.video) return;
    try {
        const newCameraOffState = !isCameraOff;
        await tracksRef.current.video.setEnabled(!newCameraOffState);
        setIsCameraOff(newCameraOffState);
    } catch (error) {
        console.error("Kamera durumu değiştirilemedi:", error);
        showToast("Kamera durumu değiştirilemedi.", true);
    }
  };

  const flipCamera = async () => {
    if (isCameraOff || !tracksRef.current.video || videoDevices.length < 2) {
      if (videoDevices.length < 2) showToast("Değiştirilecek başka kamera yok.", false);
      return;
    }
    try {
      const nextIndex = (currentVideoDeviceIndex + 1) % videoDevices.length;
      const nextDevice = videoDevices[nextIndex];
      await tracksRef.current.video.setDevice(nextDevice.deviceId);
      setCurrentVideoDeviceIndex(nextIndex);
    } catch (e) {
      showToast("Kamera değiştirilemedi.", true);
      console.error("Kamera çevirme hatası:", e);
    }
  };

  const value = {
    call, viewMode, setViewMode, localTracks, remoteUsers,
    initiateCall, endCall, toggleMic, toggleCamera, flipCamera,
    isMicMuted, isCameraOff, videoDevices
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};