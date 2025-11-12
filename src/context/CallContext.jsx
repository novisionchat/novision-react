// --- DOSYA: src/context/CallContext.jsx ---

import React, { createContext, useState, useContext, useCallback, useEffect, useRef } from 'react';
import { auth, db } from '../lib/firebase';
import { ref, set, onValue, remove, serverTimestamp } from 'firebase/database';
import { useToast } from './ToastContext.jsx';
import AgoraRTC from 'agora-rtc-sdk-ng';
import * as groupMgmt from '../lib/groupManagement';

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
  const callListenerRef = useRef(null);

  useEffect(() => {
    const agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    setClient(agoraClient);
  }, []);

  const endCall = useCallback(async () => {
    const currentCall = call; // O anki call state'ini al, çünkü state asenkron güncellenir
    if (callListenerRef.current) {
        callListenerRef.current();
        callListenerRef.current = null;
    }
    
    tracksRef.current.audio?.stop();
    tracksRef.current.audio?.close();
    tracksRef.current.video?.stop();
    tracksRef.current.video?.close();
    tracksRef.current = { audio: null, video: null };
    setLocalTracks({ audio: null, video: null });

    if (client?.connectionState === 'CONNECTED') {
      await client.leave();
    }
    
    if (currentCall) {
        if (currentCall.type === 'dm') {
            await remove(ref(db, `calls/${currentCall.callerId}`));
            await remove(ref(db, `calls/${currentCall.calleeId}`));
        } else if (currentCall.type === 'group' && loggedInUser) {
            await groupMgmt.removeGroupCallParticipant(currentCall.groupId, loggedInUser.uid);
        }
    }

    setRemoteUsers([]);
    setCall(null);
    setViewMode('closed');
    setIsMicMuted(false);
    setIsCameraOff(false);
  }, [client, call, loggedInUser]);

  const joinChannel = useCallback(async (callData, user) => {
    if (!client || client.connectionState === 'CONNECTED') return;
    try {
      const token = await getToken(callData.channelName, user.uid);
      if (!token) throw new Error("Geçersiz token.");
      await client.join(AGORA_APP_ID, callData.channelName, token, user.uid);
      
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      let videoTrack = null;
      
      if (callData.type === 'video' || callData.type === 'group') {
        const cameras = await AgoraRTC.getCameras();
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
      
      if (callData.type === 'group') {
        await groupMgmt.updateGroupCallParticipant(callData.groupId, user.uid, user.displayName, !!videoTrack, !!audioTrack);
      }
      setViewMode('pip');
    } catch (error) {
      console.error("Kanala katılım hatası:", error);
      showToast("Aramaya katılamadı: " + error.message, true);
      await endCall();
    }
  }, [client, endCall]);

  const acceptCall = useCallback(async (callData) => {
    const user = auth.currentUser;
    if (!user) return;
    
    const activeCallData = { ...callData, status: 'active' };
    await set(ref(db, `calls/${callData.callerId}`), activeCallData);
    await set(ref(db, `calls/${user.uid}`), activeCallData);
    setCall(activeCallData);
    await joinChannel(activeCallData, user);
  }, [joinChannel]);

  const declineCall = useCallback(async (callData) => {
    await remove(ref(db, `calls/${callData.calleeId}`));
    await remove(ref(db, `calls/${callData.callerId}`));
    setCall(null);
  }, []);

  useEffect(() => {
    if (!loggedInUser || !client) return;
    const userCallRef = ref(db, `calls/${loggedInUser.uid}`);
    if (callListenerRef.current) callListenerRef.current();

    callListenerRef.current = onValue(userCallRef, (snapshot) => {
      const callData = snapshot.val();
      if (callData) {
        if (callData.status === 'ringing' && call?.callId !== callData.callId) {
          setCall(callData);
          showToast(`${callData.callerName} sizi arıyor...`, {
            persistent: true,
            actions: [
              { text: "Cevapla", onClick: () => acceptCall(callData) },
              { text: "Reddet", onClick: () => declineCall(callData) }
            ]
          });
        } else if (callData.status === 'active' && call?.status !== 'active') {
          setCall(callData);
          joinChannel(callData, loggedInUser);
        }
      } else {
        if(call && call.calleeId === loggedInUser.uid) endCall();
      }
    });

    return () => {
      if (callListenerRef.current) callListenerRef.current();
    };
  }, [loggedInUser, client, call, acceptCall, declineCall, joinChannel, endCall]);

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
      showToast("Arama sunucusuna bağlanılamadı.", true);
      return null;
    }
  };

  const initiateCall = async (targetId, targetName, user, callType) => {
    if (call) return showToast("Zaten bir arama yapıyorsunuz.", true);
    if (callType === 'group') {
        const callData = await groupMgmt.startGroupCall(targetId, targetName, user);
        setCall(callData);
        await joinChannel(callData, user);
    } else {
        const channelName = user.uid + "_" + Date.now();
        const callData = {
          callId: channelName, channelName, callerId: user.uid,
          callerName: user.displayName, calleeId: targetId, calleeName: targetName,
          status: 'ringing', timestamp: serverTimestamp(), type: callType
        };
        await set(ref(db, `calls/${targetId}`), callData);
        await set(ref(db, `calls/${user.uid}`), callData); // Arayan da dinleyebilsin diye
    }
  };

  const toggleMic = async () => {
    if (!tracksRef.current.audio) return;
    const newState = !isMicMuted;
    await tracksRef.current.audio.setEnabled(!newState);
    setIsMicMuted(newState);
    if (call?.type === 'group' && loggedInUser) {
        await groupMgmt.updateGroupCallParticipant(call.groupId, loggedInUser.uid, loggedInUser.displayName, !isCameraOff, !newState);
    }
  };

  const toggleCamera = async () => {
    if (!tracksRef.current.video) return;
    const newState = !isCameraOff;
    await tracksRef.current.video.setEnabled(!newState);
    setIsCameraOff(newState);
    if (call?.type === 'group' && loggedInUser) {
        await groupMgmt.updateGroupCallParticipant(call.groupId, loggedInUser.uid, loggedInUser.displayName, !newState, !isMicMuted);
    }
  };

  const flipCamera = async () => {
    if (isCameraOff || !tracksRef.current.video || videoDevices.length < 2) return;
    try {
      const nextIndex = (currentVideoDeviceIndex + 1) % videoDevices.length;
      await tracksRef.current.video.setDevice(videoDevices[nextIndex].deviceId);
      setCurrentVideoDeviceIndex(nextIndex);
    } catch (e) {
      showToast("Kamera değiştirilemedi.", true);
    }
  };

  const value = {
    call, viewMode, setViewMode, localTracks, remoteUsers,
    initiateCall, endCall, toggleMic, toggleCamera, flipCamera,
    isMicMuted, isCameraOff, videoDevices
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};