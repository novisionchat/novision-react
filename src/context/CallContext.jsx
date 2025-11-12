// --- DOSYA: src/context/CallContext.jsx (ASPECT RATIO TESPİTİ EKLENDİ) ---

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
  
  // DÜZELTME: Karşı tarafın video oranını saklamak için yeni state
  const [remoteAspectRatio, setRemoteAspectRatio] = useState(null);

  useEffect(() => {
    const agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    setClient(agoraClient);
  }, []);

  const endCall = useCallback(async () => {
    if (!client) return;
    
    const currentTracks = tracksRef.current;
    currentTracks.audio?.stop(); currentTracks.audio?.close();
    currentTracks.video?.stop(); currentTracks.video?.close();
    tracksRef.current = { audio: null, video: null };

    if (client.connectionState === 'CONNECTED') await client.leave();
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
    setRemoteAspectRatio(null); // Oranı sıfırla
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
      
      // DÜZELTME: Video yayınlandığında boyutlarını al ve oranı hesapla
      if (mediaType === 'video' && user.videoTrack) {
        // Kısa bir gecikme ile boyutları almak daha güvenilir olabilir
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
        setRemoteAspectRatio(null); // Video kapandığında oranı sıfırla
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

  const getToken = async (channelName, uid) => { /* ... aynı ... */ };
  const joinChannel = async (callData, user) => { /* ... aynı ... */ };
  const initiateCall = async (calleeId, calleeName, user, callType) => { /* ... aynı ... */ };
  const acceptCall = async (callData) => { /* ... aynı ... */ };
  const declineCall = async (callData) => { /* ... aynı ... */ };
  const toggleMic = async () => { /* ... aynı ... */ };
  const toggleCamera = async () => { /* ... aynı ... */ };
  const flipCamera = async () => { /* ... aynı ... */ };

  const value = {
    call, viewMode, setViewMode, localTracks, remoteUsers,
    initiateCall, endCall, toggleMic, toggleCamera, flipCamera,
    isMicMuted, isCameraOff,
    remoteAspectRatio // DÜZELTME: Oranı context'e ekle
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};