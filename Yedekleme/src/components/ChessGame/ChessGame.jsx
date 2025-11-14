// --- DOSYA: src/components/ChessGame/ChessGame.jsx (TAM VE GÜNCELLENMİŞ HALİ) ---

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { ref, onValue, update, set, push, get } from 'firebase/database';
import { db, auth } from '../../lib/firebase';
import { useChat } from '../../context/ChatContext';
import styles from './ChessGame.module.css';
import { IoClose, IoExpand, IoContract } from "react-icons/io5";
import { playSound } from '../../lib/chessSounds';
import { useDraggable } from '../../hooks/useDraggable';

const PIECES = {
    w: { p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔' },
    b: { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' }
};

function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

const ChessGame = ({ viewMode, setViewMode, activeGameId, setActiveGameId }) => {
    const { activeConversation } = useChat();
    const currentUser = auth.currentUser;

    const [game, setGame] = useState(new Chess());
    const [gameData, setGameData] = useState(null);
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [promotionChoice, setPromotionChoice] = useState(null);
    const [isResignModalOpen, setIsResignModalOpen] = useState(false);
    const [groupMembers, setGroupMembers] = useState([]);
    const [selectedOpponent, setSelectedOpponent] = useState(null);
    const [capturedPieces, setCapturedPieces] = useState({ w: [], b: [] });
    const [checkSquare, setCheckSquare] = useState(null);
    
    const pipRef = useRef(null);
    const previousGameData = usePrevious(gameData);
    
    const initialPipPosition = useMemo(() => {
        if (typeof window === 'undefined') return { x: 0, y: 0 };
        const windowWidth = window.innerWidth;
        const pipWidth = 340;
        const margin = 20;
        return {
            x: windowWidth - pipWidth - margin,
            y: margin
        };
    }, []);

    const { style } = useDraggable(pipRef, initialPipPosition);

    const playerColor = useMemo(() => {
        if (!gameData || !currentUser) return null;
        if (gameData.players.w === currentUser.uid) return 'w';
        if (gameData.players.b === currentUser.uid) return 'b';
        return null;
    }, [gameData, currentUser]);

    useEffect(() => {
        if (!previousGameData || !gameData || previousGameData.fen === gameData.fen) {
            return;
        }
        const newGameInstance = new Chess(gameData.fen);
        const moverColor = newGameInstance.turn() === 'w' ? 'b' : 'w';
        if (playerColor && moverColor !== playerColor) {
            const oldGameInstance = new Chess(previousGameData.fen);
            const oldPieceCount = oldGameInstance.board().flat().filter(p => p).length;
            const newPieceCount = newGameInstance.board().flat().filter(p => p).length;
            if (newPieceCount < oldPieceCount) {
                playSound('capture');
            } else {
                playSound('move');
            }
        }
    }, [gameData, previousGameData, playerColor]);

    useEffect(() => {
        if (!activeGameId) { 
            setGameData(null);
            return; 
        }
        const gameRef = ref(db, `chess_games/${activeGameId}`);
        const unsubscribe = onValue(gameRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setGameData(data);
                const newGame = new Chess(data.fen);
                setGame(newGame);

                if (newGame.inCheck()) {
                    const kingPos = newGame.board().flat().find(p => p && p.type === 'k' && p.color === newGame.turn())?.square;
                    setCheckSquare(kingPos);
                    if (newGame.turn() === playerColor) playSound('check');
                } else {
                    setCheckSquare(null);
                }
            } else {
                setGameData(null);
                setActiveGameId(null);
                setViewMode('closed');
            }
        });
        return () => unsubscribe();
    }, [activeGameId, setActiveGameId, setViewMode, playerColor]);

    useEffect(() => {
        if (gameData?.fen) {
            const tempGame = new Chess(gameData.fen);
            const captured = { w: [], b: [] };
            const pieceCounts = { p: 8, r: 2, n: 2, b: 2, q: 1 };
            ['w', 'b'].forEach(color => {
                for (const piece in pieceCounts) {
                    const onBoard = tempGame.board().flat().filter(p => p && p.type === piece && p.color === color).length;
                    const capturedCount = pieceCounts[piece] - onBoard;
                    for (let i = 0; i < capturedCount; i++) {
                        captured[color === 'w' ? 'b' : 'w'].push({ type: piece, color: color });
                    }
                }
            });
            setCapturedPieces(captured);
        }
    }, [gameData?.fen]);

    useEffect(() => {
        if (gameData?.status === 'draw' || gameData?.status === 'resign' || game.isGameOver()) {
            playSound('end');
            const timer = setTimeout(() => {
                setActiveGameId(null);
                setViewMode('closed');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [gameData?.status, game.isGameOver, setActiveGameId, setViewMode]);

     useEffect(() => {
        const fetchGroupMembers = async () => {
            if (activeConversation?.type === 'group') {
                const groupRef = ref(db, `groups/${activeConversation.id}/meta/members`);
                const snapshot = await get(groupRef);
                if (snapshot.exists()) {
                    const memberIds = Object.keys(snapshot.val()).filter(id => id !== currentUser.uid);
                    const memberPromises = memberIds.map(id => get(ref(db, `users/${id}`)));
                    const memberSnapshots = await Promise.all(memberPromises);
                    const members = memberSnapshots.map(snap => ({ uid: snap.key, ...snap.val() }));
                    setGroupMembers(members);
                } else {
                    setGroupMembers([]);
                }
            } else {
                setGroupMembers([]);
            }
        };
        fetchGroupMembers();
    }, [activeConversation, currentUser.uid]);

    const makeMove = (move) => {
        const gameCopy = new Chess(game.fen());
        const result = gameCopy.move(move);
        if (result) {
            if (result.flags.includes('c') || result.flags.includes('e')) {
                playSound('capture');
            } else {
                playSound('move');
            }
            update(ref(db, `chess_games/${activeGameId}`), { fen: gameCopy.fen(), drawOffer: null });
        }
        setSelectedSquare(null);
        setPromotionChoice(null);
    };

    const handleSquareClick = (square) => {
        if (!gameData || gameData.status !== 'active' || game.turn() !== playerColor) return;
        if (selectedSquare) {
            const move = game.moves({ square: selectedSquare, verbose: true }).find(m => m.to === square);
            if (move) {
                if (move.flags.includes('p')) { setPromotionChoice({ from: selectedSquare, to: square }); return; }
                makeMove({ from: selectedSquare, to: square });
            }
            setSelectedSquare(null);
        } else {
            if (game.get(square)?.color === playerColor) { setSelectedSquare(square); }
        }
    };
    
    const handlePromotion = (piece) => {
        if (promotionChoice) makeMove({ ...promotionChoice, promotion: piece });
    };

    const handleChallenge = async () => {
        let opponentId = null;
        if (activeConversation.type === 'dm') {
            opponentId = activeConversation.otherUserId;
        } else if (activeConversation.type === 'group' && selectedOpponent) {
            opponentId = selectedOpponent;
        }
        if (!currentUser || !opponentId) return;

        const newGameRef = push(ref(db, 'chess_games'));
        const gameId = newGameRef.key;
        const newGame = {
            fen: new Chess().fen(),
            players: { w: currentUser.uid, b: opponentId },
            status: 'challenge',
            createdAt: Date.now(),
            challenger: currentUser.uid,
        };
        await set(newGameRef, newGame);
        await set(ref(db, `challenges/${opponentId}/${gameId}`), { fromName: currentUser.displayName || 'Bir oyuncu', fromUid: currentUser.uid });
        setActiveGameId(gameId);
    };

    const handleOfferDraw = () => update(ref(db, `chess_games/${activeGameId}`), { drawOffer: playerColor });
    const handleAcceptDraw = () => update(ref(db, `chess_games/${activeGameId}`), { status: 'draw', drawOffer: null });
    const handleDeclineDraw = () => update(ref(db, `chess_games/${activeGameId}`), { drawOffer: null });
    const handleConfirmResign = () => {
        update(ref(db, `chess_games/${activeGameId}`), { status: 'resign', resignedBy: playerColor });
        setIsResignModalOpen(false);
    };

    const renderBoard = () => {
        const board = game.board();
        const isFlipped = playerColor === 'b';
        const squares = [];
        const possibleMoves = selectedSquare ? game.moves({ square: selectedSquare, verbose: true }).map(m => m.to) : [];

        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const rowIndex = isFlipped ? 7 - i : i;
                const colIndex = isFlipped ? 7 - j : j;
                const piece = board[rowIndex][colIndex];
                const squareName = String.fromCharCode('a'.charCodeAt(0) + colIndex) + (8 - rowIndex);
                
                const classNames = [
                    styles.square,
                    (rowIndex + colIndex) % 2 === 0 ? styles.white : styles.black,
                    selectedSquare === squareName ? styles.selected : '',
                    squareName === checkSquare ? styles.inCheck : '',
                ].join(' ');

                squares.push(
                    <div key={squareName} className={classNames} onClick={() => handleSquareClick(squareName)}>
                        {piece && <span>{PIECES[piece.color][piece.type]}</span>}
                        {possibleMoves.includes(squareName) && <div className={styles.moveIndicator}></div>}
                    </div>
                );
            }
        }
        // Satranç tahtasının sürüklenmesini engelle
        return <div className={styles.chessboard} data-drag-ignore="true">{squares}</div>;
    };

    const renderStatusAndOffers = () => {
        if (!gameData) return <p>Yükleniyor...</p>;

        if (gameData.drawOffer && gameData.drawOffer !== playerColor && gameData.status === 'active') {
            return (
                <div className={styles.offer}>
                    <p>Rakip beraberlik teklif ediyor.</p>
                    <div>
                        <button onClick={handleAcceptDraw}>Kabul Et</button>
                        <button onClick={handleDeclineDraw}>Reddet</button>
                    </div>
                </div>
            );
        }

        let statusText = "Durum bilinmiyor";
        if (gameData.status === 'challenge') statusText = "Rakibin kabul etmesi bekleniyor...";
        else if (gameData.status === 'draw') statusText = "Oyun Berabere (Anlaşmalı)";
        else if (gameData.status === 'resign') statusText = `${gameData.resignedBy === playerColor ? 'Siz' : 'Rakip'} terk etti.`;
        else if (game.isGameOver()) {
            if (game.isCheckmate()) statusText = `Şah Mat! ${game.turn() === 'w' ? 'Siyah' : 'Beyaz'} kazandı.`;
            else statusText = "Oyun Berabere";
        } else {
            statusText = `Sıra ${game.turn() === 'w' ? 'Beyaz' : 'Siyah'}'da`;
        }
        return <p>{statusText}</p>;
    };

    const renderLobby = () => (
        // Lobi'nin ana kapsayıcısından `data-drag-ignore` kaldırıldı.
        // Artık lobideki boş alanlardan da sürükleme yapılabilecek.
        <div className={styles.lobby}> 
            {activeConversation?.type === 'dm' && (
                <>
                    <div>
                        <h4>Yeni Satranç Oyunu</h4>
                        <p>Rakibine bir oyun teklif et.</p>
                    </div>
                    <div className={styles.opponentInfo}>
                        <img src={activeConversation.avatar} alt={activeConversation.name} />
                        <span>{activeConversation.name}</span>
                    </div>
                    <button onClick={handleChallenge}>Meydan Oku</button>
                </>
            )}
            {activeConversation?.type === 'group' && (
                <>
                    <div>
                        <h4>Gruptan Birine Meydan Oku</h4>
                        <p>Oynamak için birini seç.</p>
                    </div>
                    <div className={styles.groupLobbyList}>
                        {groupMembers.length > 0 ? groupMembers.map(member => (
                            <label key={member.uid} className={styles.groupLobbyItem}>
                                <input type="radio" name="opponent" value={member.uid} onChange={(e) => setSelectedOpponent(e.target.value)} />
                                <img src={member.avatar} alt={member.username} />
                                <span>{member.username}#{member.tag}</span>
                            </label>
                        )) : <p>Meydan okunacak başka üye yok.</p>}
                    </div>
                    <button onClick={handleChallenge} disabled={!selectedOpponent}>Meydan Oku</button>
                </>
            )}
        </div>
    );

    const renderGame = () => (
        // Oyun alanının ana kapsayıcısından `data-drag-ignore` kaldırıldı.
        <div className={styles.gameContainer}>
            {isResignModalOpen && (
                <div className={styles.dialogOverlay}>
                    <div className={styles.dialogContent}>
                        <p>Oyunu terk etmek istediğinize emin misiniz?</p>
                        <div>
                            <button className={styles.danger} onClick={handleConfirmResign}>Evet, Terk Et</button>
                            <button onClick={() => setIsResignModalOpen(false)}>İptal</button>
                        </div>
                    </div>
                </div>
            )}
            {promotionChoice && (
                <div className={styles.dialogOverlay}>
                    <div className={styles.dialogContent}>
                        <p>Piyon Terfisi</p>
                        <div>
                            {['q', 'r', 'b', 'n'].map(p => (
                                <button key={p} className={styles.promotionButton} onClick={() => handlePromotion(p)}>
                                    <span>{PIECES[playerColor][p]}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            
            <div className={styles.capturedPieces}>
                {(playerColor === 'w' ? capturedPieces.b : capturedPieces.w).map((p, i) => <span key={i}>{PIECES[p.color][p.type]}</span>)}
            </div>
            {renderBoard()}
            <div className={styles.capturedPieces}>
                {(playerColor === 'w' ? capturedPieces.w : capturedPieces.b).map((p, i) => <span key={i}>{PIECES[p.color][p.type]}</span>)}
            </div>
            <div className={styles.statusBar}>
                {renderStatusAndOffers()}
                <div className={styles.actions}>
                    <button onClick={handleOfferDraw} disabled={gameData?.status !== 'active' || !!gameData?.drawOffer}>Beraberlik</button>
                    <button onClick={() => setIsResignModalOpen(true)} disabled={gameData?.status !== 'active'}>Terk Et</button>
                </div>
            </div>
        </div>
    );

    const content = activeGameId && gameData ? renderGame() : renderLobby();
    const containerClass = `${styles.pipContainer} ${viewMode === 'pip' ? styles.pipWindow : ''} ${viewMode === 'full' ? styles.fullWindow : ''}`;

    return (
        <div 
            ref={pipRef} 
            className={containerClass}
            style={viewMode === 'pip' ? style : {}}
        >
            <div className={styles.pipHeader}>
                <span>Satranç</span>
                {/* Header'daki kontrol butonlarının sürüklenmesi engellenmeli */}
                <div className={styles.pipControls} data-drag-ignore="true">
                    {viewMode === 'pip' ? (
                        <button onClick={() => setViewMode('full')} title="Genişlet"><IoExpand /></button>
                    ) : (
                        <button onClick={() => setViewMode('pip')} title="Küçült"><IoContract /></button>
                    )}
                    <button onClick={() => setViewMode('closed')} title="Kapat"><IoClose /></button>
                </div>
            </div>
            <div className={styles.pipContent}>{content}</div>
        </div>
    );
};

export default ChessGame;