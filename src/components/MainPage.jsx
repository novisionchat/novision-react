// --- DOSYA: src/components/MainPage.jsx ---

import React, { useState, useEffect } from 'react';
import LeftPanel from './LeftPanel';
import ChatArea from './ChatArea';
import ChessGame from './ChessGame/ChessGame.jsx';
import CallView from './CallView.jsx';
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
      // Meydan okumaları dinle
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

  const handleToggleSidebar = () => setIsSidebarOpen(p => !p);
  const closeSidebarOnMobile = () => { if (window.innerWidth <= 768) setIsSidebarOpen(false); };
  const handleChessButtonClick = () => setChessViewMode(p => p === 'closed' ? 'pip' : 'closed');

  // Tam ekran kontrolü
  const isChessFull = chessViewMode === 'full';
  const isCallFull = callViewMode === 'full';
  const isAnyFullScreen = isChessFull || isCallFull;

  return (
    <div id="main-page" className="page">
      {/* Tam ekranda sol paneli gizle (mobil uyumluluk için iyi olur) */}
      <div style={{ display: isAnyFullScreen ? 'none' : 'flex', height: '100%' }}>
          <LeftPanel onConversationSelect={closeSidebarOnMobile} />
      </div>
      
      {/* Eğer herhangi biri tam ekransa ChatArea'yı render etme */}
      {!isAnyFullScreen && (
        <ChatArea 
          onToggleSidebar={handleToggleSidebar} 
          onChessButtonClick={handleChessButtonClick}
        />
      )}

      {/* Satranç Bileşeni */}
      {(chessViewMode === 'full' || chessViewMode === 'pip') && (
        <ChessGame 
          viewMode={chessViewMode} 
          setViewMode={setChessViewMode}
          activeGameId={activeGameId}
          setActiveGameId={setActiveGameId}
        />
      )}

      {/* Arama Bileşeni */}
      {(callViewMode === 'full' || callViewMode === 'pip') && (
        <CallView />
      )}
    </div>
  );
}

export default MainPage;