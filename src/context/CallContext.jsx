// --- DOSYA: src/context/CallContext.jsx (TAM VE EKSİKSİZ SON HALİ) ---

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
  const [remoteAspectRatio, setRemoteAspectRatio] = useState(null);

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
    setRemoteAspectRatio(null);
  }, [client, call]);

  useEffect(() => {
    if (!loggedInUser || !client) return;
    const incomingCallRef = ref(db, `calls/${loggedInUser.uid}`);
    const unsubscribe = onValue(incomingCallRef, (snapshot) => {
      if (snapshot.exists()) {
        const callData = snapshot.val();
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
  }, [loggedInUser, client, call, endCall]);

  useEffect(() => {
    if (!client) return;
    const handleUserPublished = async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]);
      if (mediaType === 'audio') user.audioTrack.play();
      
      if (mediaType === 'video' && user.videoTrack) {
        setTimeout(() => {
          const track = user.videoTrack.getMediaStreamTrack();
          if (track) {
            const { width, height } = track.getSettings();
            if (width && height) {
              setRemoteAspectRatio(width / height);
            }
          }
        }, 100);
      }
    };
    const handleUserUnpublished = (user, mediaType) => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      if (mediaType === 'video') {
        setRemoteAspectRatio(null);
      }
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
        videoTrack = await AgoraRTC.createCameraVideoTrack();
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

  const initiateCall = async (calleeId, calleeName, user, callType) => {
    const channelName = push(ref(db, 'calls')).key;
    const callData = {
      callId: channelName, channelName, callerId: user.uid,
      callerName: user.displayName, calleeId, calleeName,
      status: 'ringing', timestamp: serverTimestamp(), type: callType
    };
    await set(ref(db, `calls/${calleeId}`), callData);
    setCall(callData);
    await joinChannel(callData, user);
  };

  const acceptCall = async (callData) => {
    const user = auth.currentUser;
    if (!user) return;
    await remove(ref(db, `calls/${user.uid}`));
    const activeCallData = { ...callData, status: 'active' };
    setCall(activeCallData);
    await joinChannel(activeCallData, user);
    await set(ref(db, `calls/${callData.callerId}`), activeCallData);
  };

  const declineCall = async (callData) => {
    await remove(ref(db, `calls/${callData.calleeId}`));
    await remove(ref(db, `calls/${callData.callerId}`));
  };

  const toggleMic = async () => {
    if (!tracksRef.current.audio) return;
    await tracksRef.current.audio.setEnabled(isMicMuted);
    setIsMicMuted(!isMicMuted);
  };

  const toggleCamera = async () => {
    if (!tracksRef.current.video) return;
    await tracksRef.current.video.setEnabled(isCameraOff);
    setIsCameraOff(!isCameraOff);
  };

  const flipCamera = async () => {
    if (isCameraOff || !tracksRef.current.video) return;
    try {
      await tracksRef.current.video.switchDevice('video');
    } catch (e) {
      showToast("Kamera değiştirilemedi.", true);
      console.error("Kamera çevirme hatası:", e);
    }
  };

  const value = {
    call, viewMode, setViewMode, localTracks, remoteUsers,
    initiateCall, endCall, toggleMic, toggleCamera, flipCamera,
    isMicMuted, isCameraOff,
    remoteAspectRatio
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};