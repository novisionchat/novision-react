// --- DOSYA: src/context/CallContext.jsx (TAM VE EKSİKSİZ NİHAİ HALİ) ---

import React, { createContext, useState, useContext, useCallback, useEffect, useRef } from 'react';
import { auth, db } from '../lib/firebase';
import { ref, set, onValue, remove, serverTimestamp } from 'firebase/database';
import { useToast } from './ToastContext.jsx';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { useChat } from './ChatContext.jsx';

const CallContext = createContext();
export const useCall = () => useContext(CallContext);

const AGORA_APP_ID = "c1a39c1b29b24faba92cc2a0c187294d"; 
const SERVER_URL = 'https://novision-backend.onrender.com';

export const CallProvider = ({ children }) => {
  const [client, setClient] = useState(null);
  
  // DM Aramaları için state'ler
  const [dmCall, setDmCall] = useState(null);
  const [dmViewMode, setDmViewMode] = useState('closed');
  
  // Grup Aramaları için state'ler
  const [groupCall, setGroupCall] = useState(null);
  const [groupCallViewMode, setGroupCallViewMode] = useState('closed'); 

  const [localTracks, setLocalTracks] = useState({ audio: null, video: null });
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const { showToast } = useToast();
  const loggedInUser = auth.currentUser;
  const tracksRef = useRef({ audio: null, video: null });
  const [videoDevices, setVideoDevices] = useState([]);
  const [currentVideoDeviceIndex, setCurrentVideoDeviceIndex] = useState(0);

  const { activeConversation } = useChat();

  useEffect(() => {
    const agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    setClient(agoraClient);
  }, []);

  const cleanupCallState = useCallback(async () => {
    if (!client) return;

    const currentTracks = tracksRef.current;
    currentTracks.audio?.stop();
    currentTracks.audio?.close();
    currentTracks.video?.stop();
    currentTracks.video?.close();
    tracksRef.current = { audio: null, video: null };
    
    if (client.connectionState === 'CONNECTED') {
        try {
            await client.leave();
        } catch (error) {
            console.error("Agora'dan ayrılırken hata oluştu:", error);
        }
    }

    setLocalTracks({ audio: null, video: null });
    setRemoteUsers([]);
    setDmCall(null);
    setDmViewMode('closed');
    setGroupCall(null);
    setGroupCallViewMode('closed');
    setIsMicMuted(false);
    setIsCameraOff(false);
    setVideoDevices([]);
    setCurrentVideoDeviceIndex(0);
  }, [client]);

  const endDmCall = useCallback(async () => {
    if (dmCall) {
        remove(ref(db, `calls/${dmCall.callerId}`));
        remove(ref(db, `calls/${dmCall.calleeId}`));
    }
    await cleanupCallState();
  }, [dmCall, cleanupCallState]);

  const endGroupCall = useCallback(async () => {
    if (groupCall) {
        // Sadece arama sahibi veritabanı kaydını siler
        if (groupCall.initiatorId === loggedInUser?.uid) {
            remove(ref(db, `group_calls/${groupCall.groupId}`));
        }
    }
    await cleanupCallState();
  }, [groupCall, loggedInUser, cleanupCallState]);

  // Birebir (DM) gelen aramaları dinle
  useEffect(() => { if (!loggedInUser || !client) return; const incomingCallRef = ref(db, `calls/${loggedInUser.uid}`); const unsubscribe = onValue(incomingCallRef, (snapshot) => { if (snapshot.exists()) { const callData = snapshot.val(); if (callData.calleeId === loggedInUser.uid && callData.status === 'ringing' && dmCall?.callId !== callData.callId) { setDmCall(callData); showToast(`${callData.callerName} sizi arıyor...`, { persistent: true, actions: [ { text: "Cevapla", onClick: () => acceptDmCall(callData) }, { text: "Reddet", onClick: () => declineDmCall(callData) } ] }); } } }); return () => unsubscribe(); }, [loggedInUser, client, dmCall]);
  
  // Başlatılan DM aramasının durumunu dinle (reddedildi mi vs.)
  useEffect(() => { if (!dmCall || !loggedInUser || dmCall.callerId !== loggedInUser.uid || dmViewMode === 'closed') { return; } const outgoingCallRef = ref(db, `calls/${dmCall.callerId}`); const unsubscribe = onValue(outgoingCallRef, (snapshot) => { if (!snapshot.exists() && dmViewMode !== 'closed') { showToast("Arama cevaplanmadı veya reddedildi.", false); endDmCall(); } else if (snapshot.exists()) { const callData = snapshot.val(); if (callData.status === 'active' && dmCall.status !== 'active') { setDmCall(callData); } } }); return () => unsubscribe(); }, [dmCall, loggedInUser, dmViewMode, endDmCall]);

  // Grup aramalarını dinle
  useEffect(() => {
    if (!loggedInUser || !activeConversation || activeConversation.type !== 'group') {
        return;
    }
    const groupCallRef = ref(db, `group_calls/${activeConversation.id}`);
    const unsubscribe = onValue(groupCallRef, (snapshot) => {
        if (snapshot.exists() && groupCallViewMode === 'closed') {
            const callData = snapshot.val();
            showToast(`${activeConversation.name} grubunda bir görüşme başladı.`, {
                actions: [{ text: "Katıl", onClick: () => joinGroupCall(callData) }]
            });
        }
    });
    return () => unsubscribe();
  }, [loggedInUser, activeConversation, groupCallViewMode, showToast]);


  // Agora event dinleyicileri
  useEffect(() => { if (!client) return; const handleUserPublished = async (user, mediaType) => { await client.subscribe(user, mediaType); setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]); if (mediaType === 'audio') user.audioTrack.play(); }; const handleUserUnpublished = (user) => { setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid)); }; const handleUserLeft = (user) => { setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid)); showToast("Bir kullanıcı aramadan ayrıldı.", false); }; client.on("user-published", handleUserPublished); client.on("user-unpublished", handleUserUnpublished); client.on("user-left", handleUserLeft); return () => { client.off("user-published", handleUserPublished); client.off("user-unpublished", handleUserUnpublished); client.off("user-left", handleUserLeft); }; }, [client]);

  const getToken = async (channelName, uid) => { try { const response = await fetch(`${SERVER_URL}/api/agora/token/${channelName}/${uid}`); if (!response.ok) throw new Error('Token alınamadı'); return (await response.json()).token; } catch (error) { console.error("Token alma hatası:", error); showToast("Arama sunucusuna bağlanılamadı.", true); return null; } };

  const prepareMediaTracks = async (callType) => {
    try {
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      let videoTrack = null;
      if (callType === 'video') {
        const cameras = await AgoraRTC.getCameras();
        if (cameras.length === 0) {
            showToast("Kamera bulunamadı.", true);
            return { audio: audioTrack, video: null };
        }
        setVideoDevices(cameras);
        videoTrack = await AgoraRTC.createCameraVideoTrack({ deviceId: cameras[0].deviceId });
      }
      return { audio: audioTrack, video: videoTrack };
    } catch (error) {
      console.error("Medya izni alınamadı veya track oluşturulamadı:", error);
      showToast("Kamera/mikrofon izni gerekli.", true);
      return null;
    }
  };

  const joinChannel = async (channelName, user, tracks) => {
    if (!client || !tracks) return false;
    try {
      const token = await getToken(channelName, user.uid);
      if (!token) throw new Error("Geçersiz token.");
      await client.join(AGORA_APP_ID, channelName, token, user.uid);
      
      tracksRef.current = tracks;
      setLocalTracks(tracks);
      
      const tracksToPublish = Object.values(tracks).filter(Boolean);
      if(tracksToPublish.length > 0) {
        await client.publish(tracksToPublish);
      }
      return true;
    } catch (error) {
      console.error("Kanala katılım hatası:", error);
      showToast("Aramaya katılamadı: " + error.message, true);
      return false;
    }
  };

  const initiateDmCall = async (calleeId, calleeName, user, callType) => {
    if (dmCall || groupCall) {
        showToast("Zaten bir arama içerisindesiniz.", true);
        return;
    }
    const tracks = await prepareMediaTracks(callType);
    if (!tracks) return;
    const channelName = `dm_${user.uid}_${calleeId}`;
    const callData = { callId: channelName, channelName, callerId: user.uid, callerName: user.displayName, calleeId, calleeName, status: 'ringing', timestamp: serverTimestamp(), type: callType };
    try {
        await set(ref(db, `calls/${calleeId}`), callData);
        await set(ref(db, `calls/${user.uid}`), callData);
        setDmCall(callData);
        const joined = await joinChannel(callData.channelName, user, tracks);
        if(joined) setDmViewMode('pip'); else await endDmCall();
    } catch (error) {
        showToast("Arama başlatılamadı.", true);
        tracks.audio?.close(); tracks.video?.close();
        await endDmCall();
    }
  };
  const acceptDmCall = async (callData) => {
    const user = auth.currentUser;
    if (!user) return;
    const tracks = await prepareMediaTracks(callData.type);
    if(!tracks) { declineDmCall(callData); return; }
    const activeCallData = { ...callData, status: 'active' };
    await set(ref(db, `calls/${callData.callerId}`), activeCallData);
    await set(ref(db, `calls/${user.uid}`), activeCallData);
    setDmCall(activeCallData);
    const joined = await joinChannel(activeCallData.channelName, user, tracks);
    if(joined) setDmViewMode('pip'); else await endDmCall();
  };
  const declineDmCall = async (callData) => { await remove(ref(db, `calls/${callData.calleeId}`)); await remove(ref(db, `calls/${callData.callerId}`)); if (dmCall && dmCall.callId === callData.callId) { setDmCall(null); } };

  const initiateGroupCall = async (group) => {
      if (dmCall || groupCall) {
          showToast("Zaten bir arama içerisindesiniz.", true);
          return;
      }
      const user = auth.currentUser;
      const channelName = `group_${group.id}`;
      const token = await getToken(channelName, user.uid);
      if (!token) {
          showToast("Arama başlatılamadı.", true);
          return;
      }
      const callData = {
          groupId: group.id, channelName, initiatorId: user.uid,
          initiatorName: user.displayName, groupName: group.name,
          timestamp: serverTimestamp(), token: token
      };
      try {
          await set(ref(db, `group_calls/${group.id}`), callData);
          setGroupCall(callData);
          setGroupCallViewMode('full'); // Aramayı başlatan için direkt tam ekran aç
      } catch (error) {
          showToast("Grup araması başlatılamadı.", true);
          console.error("Grup araması başlatma hatası:", error);
      }
  };

  const joinGroupCall = async (callData) => {
      if (groupCallViewMode !== 'closed') return;
      const user = auth.currentUser;
      const token = await getToken(callData.channelName, user.uid);
      if (!token) {
          showToast("Aramaya katılamadı.", true);
          return;
      }
      const callDataWithToken = { ...callData, token };
      setGroupCall(callDataWithToken);
      setGroupCallViewMode('full'); // Katılan için de direkt tam ekran aç
  };
  
  const toggleMic = async () => { if (!tracksRef.current.audio) return; try { const newMutedState = !isMicMuted; await tracksRef.current.audio.setEnabled(!newMutedState); setIsMicMuted(newMutedState); } catch (error) { console.error("Mikrofon durumu değiştirilemedi:", error); } };
  const toggleCamera = async () => { if (!tracksRef.current.video) return; try { const newCameraOffState = !isCameraOff; await tracksRef.current.video.setEnabled(!newCameraOffState); setIsCameraOff(newCameraOffState); } catch (error) { console.error("Kamera durumu değiştirilemedi:", error); } };
  const flipCamera = async () => { if (isCameraOff || !tracksRef.current.video || videoDevices.length < 2) { return; } try { const nextIndex = (currentVideoDeviceIndex + 1) % videoDevices.length; const nextDevice = videoDevices[nextIndex]; await tracksRef.current.video.setDevice(nextDevice.deviceId); setCurrentVideoDeviceIndex(nextIndex); } catch (e) { console.error("Kamera çevirme hatası:", e); } };

  const value = { 
    // Genel
    endCall: async () => { await endDmCall(); await endGroupCall(); },
    // DM
    call: dmCall, 
    viewMode: dmViewMode, 
    setViewMode: setDmViewMode, 
    localTracks, remoteUsers, 
    initiateCall: initiateDmCall,
    isMicMuted, isCameraOff, videoDevices,
    toggleMic, toggleCamera, flipCamera,
    // Grup
    groupCall,
    groupCallViewMode,
    setGroupCallViewMode,
    initiateGroupCall,
    joinGroupCall,
    endGroupCall
  };

  return <CallContext.Provider value={value}>{children}</Call.Provider>;
};