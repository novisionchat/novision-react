// --- DOSYA: src/components/GroupCallView.jsx (YENİ DOSYA) ---

import React, { useState } from 'react';
import AgoraUIKit from 'agora-react-uikit';
import { useCall } from '../context/CallContext';
import { IoVideocam } from "react-icons/io5";

const GroupCallView = () => {
    const { groupCall, isGroupCallActive, endGroupCall } = useCall();
    const [videoCall, setVideoCall] = useState(true);
    const [isMinimized, setIsMinimized] = useState(false);

    const rtcProps = {
        appId: AGORA_APP_ID,
        channel: groupCall?.channelName,
        token: groupCall?.token, 
        enableScreensharing: true, // Ekran paylaşımını aktif et
    };

    const callbacks = {
        EndCall: () => {
            endGroupCall();
            setVideoCall(false);
            setIsMinimized(false);
        },
    };

    const containerStyle = {
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 2500,
        display: 'flex',
        backgroundColor: '#000000d1',
    };
    
    const minimizedStyle = {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 2501,
        backgroundColor: 'var(--accent-color)',
        color: 'white',
        padding: '10px 15px',
        borderRadius: '25px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
    };
    
    const minimizeBtnStyle = {
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 2502,
        background: 'rgba(255, 255, 255, 0.2)',
        border: 'none',
        color: 'white',
        cursor: 'pointer',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    };


    if (!isGroupCallActive) {
        return null;
    }

    if (isMinimized) {
        return (
            <div style={minimizedStyle} onClick={() => setIsMinimized(false)}>
                <IoVideocam size={22} />
                <span>Görüşmeye Dön</span>
            </div>
        );
    }
    
    return videoCall ? (
        <div style={containerStyle}>
            <AgoraUIKit rtcProps={rtcProps} callbacks={callbacks} />
            <button style={minimizeBtnStyle} onClick={() => setIsMinimized(true)} title="Küçült">
                —
            </button>
        </div>
    ) : null;
};

// Agora App ID'sini burada da tanımlamamız gerekiyor çünkü UI Kit doğrudan kullanıyor.
const AGORA_APP_ID = "c1a39c1b29b24faba92cc2a0c187294d";

export default GroupCallView;