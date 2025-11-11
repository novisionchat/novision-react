// --- DOSYA: src/components/MainPage.jsx (NİHAİ VE DOĞRU VERSİYON) ---

import React, { useState, useEffect } from 'react';
import LeftPanel from './LeftPanel';
import ChatArea from './ChatArea';
import ChessGame from './ChessGame/ChessGame';
import CallView from './CallView.jsx'; // DÜZELTME: Klasör yolu kaldırıldı, uzantı eklendi
import { initializePresence } from '../lib/presence';
import { auth, db } from '../lib/firebase';
import { ref, onValue, update, remove } from 'firebase/database';
import { useToast } from '../context/ToastContext';
import { useCall } from '../context/CallContext';

function MainPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const currentUser = auth.currentUser;
  const { showToast } = useToast();

  const [chessViewMode, setChessViewMode] = useState('closed');
  const [activeGameId, setActiveGameId] = useState(null);

  const { viewMode: callViewMode } = useCall();

  useEffect(() => {
    if (currentUser) {
      initializePresence(currentUser.uid);

      const challengesRef = ref(db, `challenges/${currentUser.uid}`);
      const unsubscribe = onValue(challengesRef, (snapshot) => {
        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot) => {
            const gameId = childSnapshot.key;
            const challengeData = childSnapshot.val();
            
            showToast(`${challengeData.fromName} size satrançta meydan okuyor!`, {
              persistent: true,
              actions: [
                {
                  text: "Kabul Et",
                  onClick: () => {
                    update(ref(db, `chess_games/${gameId}`), { status: 'active' });
                    setActiveGameId(gameId);
                    setChessViewMode('pip');
                    remove(childSnapshot.ref);
                  }
                },
                {
                  text: "Reddet",
                  onClick: () => {
                    remove(ref(db, `chess_games/${gameId}`));
                    remove(childSnapshot.ref);
                  }
                }
              ]
            });
          });
        }
      });
      return () => unsubscribe();
    }
  }, [currentUser, showToast]);
  
  useEffect(() => {
    document.body.classList.toggle('sidebar-open', isSidebarOpen);
  }, [isSidebarOpen]);

  const handleToggleSidebar = () => {
    setIsSidebarOpen(prevState => !prevState);
  };

  const closeSidebarOnMobile = () => {
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleChessButtonClick = () => {
    setChessViewMode(prev => prev === 'closed' ? 'pip' : 'closed');
  };

  const isFullScreen = chessViewMode === 'full' || callViewMode === 'full';

  return (
    <div id="main-page" className="page">
      <LeftPanel 
        onConversationSelect={closeSidebarOnMobile}
      />
      
      {!isFullScreen && (
        <ChatArea 
          onToggleSidebar={handleToggleSidebar} 
          onChessButtonClick={handleChessButtonClick}
        />
      )}

      {chessViewMode === 'full' && (
        <ChessGame 
          viewMode={chessViewMode} 
          setViewMode={setChessViewMode}
          activeGameId={activeGameId}
          setActiveGameId={setActiveGameId}
        />
      )}

      {callViewMode === 'full' && <CallView />}

      {chessViewMode === 'pip' && (
        <ChessGame 
          viewMode={chessViewMode} 
          setViewMode={setChessViewMode}
          activeGameId={activeGameId}
          setActiveGameId={setActiveGameId}
        />
      )}

      {(callViewMode === 'pip' || callViewMode === 'full') && <CallView />}
    </div>
  );
}

export default MainPage;