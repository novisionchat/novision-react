// src/components/MessageBubble.jsx
import React, { useRef, useCallback } from 'react';
import styles from './MessageBubble.module.css';
import { IoReturnUpBack, IoCheckmark, IoCheckmarkDone } from "react-icons/io5";

const StatusIcon = React.memo(({ status }) => {
    if (status === 'read') return <IoCheckmarkDone className={styles.readIcon} size={16} />;
    if (status === 'delivered') return <IoCheckmarkDone size={16} />;
    if (status === 'sent') return <IoCheckmark size={16} />;
    return null;
});

const ReactionBubble = React.memo(({ emoji, count, hasReacted, onClick }) => {
    return (
        <button className={`${styles.reaction} ${hasReacted ? styles.mine : ''}`} onClick={(e) => { e.stopPropagation(); onClick(); }}>
            {emoji} <span className={styles.reactionCount}>{count}</span>
        </button>
    );
});

const MediaContent = React.memo(({ message }) => {
    switch (message.mediaType) {
        case 'image':
            return <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer"><img src={message.mediaUrl} alt="Gönderilen Resim" className={styles.mediaImage} /></a>;
        case 'video':
            return <video src={message.mediaUrl} controls className={styles.mediaVideo} />;
        case 'audio':
            return <audio src={message.mediaUrl} controls className={styles.mediaAudio} />;
        default:
            return (
                <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer" className={styles.fileLink}>
                    Dosyayı İndir: {message.mediaUrl.split('/').pop().substring(0, 30)}...
                </a>
            );
    }
});

function MessageBubble({ message, isOwnMessage, onContextMenu, onReply, onToggleReaction, currentUserId }) {
    const swipeState = useRef({ startX: 0, deltaX: 0, isSwiping: false, longPressTimer: null }).current;
    const messageWrapperRef = useRef(null);

    const handleTouchStart = (e) => {
        swipeState.startX = e.touches[0].clientX;
        swipeState.isSwiping = false;
        if (messageWrapperRef.current) messageWrapperRef.current.style.transition = 'none';
        swipeState.longPressTimer = setTimeout(() => {
            if (!swipeState.isSwiping) {
                const touch = e.touches[0];
                onContextMenu(touch.clientX, touch.clientY, message);
            }
        }, 500);
    };

    const handleTouchMove = (e) => {
        const deltaX = e.touches[0].clientX - swipeState.startX;
        if (Math.abs(deltaX) > 10) {
            swipeState.isSwiping = true;
            if (swipeState.longPressTimer) clearTimeout(swipeState.longPressTimer);
        }
        if (swipeState.isSwiping && deltaX > 0) {
            const newDeltaX = Math.min(deltaX, 80);
            if (messageWrapperRef.current) messageWrapperRef.current.style.transform = `translateX(${newDeltaX}px)`;
            swipeState.deltaX = newDeltaX;
        }
    };

    const handleTouchEnd = useCallback(() => {
        if (swipeState.longPressTimer) clearTimeout(swipeState.longPressTimer);
        if (swipeState.deltaX > 60) onReply(message);
        if (messageWrapperRef.current) {
            messageWrapperRef.current.style.transition = 'transform 0.2s ease-out';
            messageWrapperRef.current.style.transform = 'translateX(0px)';
        }
        swipeState.startX = 0; swipeState.deltaX = 0; swipeState.isSwiping = false;
    }, [message, onReply, swipeState]);
    
    const handleContextMenu = (e) => { if (swipeState.isSwiping) return; e.preventDefault(); onContextMenu(e.clientX, e.clientY, message); };
    const formatTime = (timestamp) => { if (!timestamp) return ''; return new Date(timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); };

    const reactions = message.reactions ? Object.entries(message.reactions).map(([emoji, users]) => ({
        emoji, count: Object.keys(users).length, hasReacted: users[currentUserId] === true,
    })) : [];

    return (
        <div className={`${styles.swipeContainer} ${isOwnMessage ? styles.benimMesajimContainer : ''}`}>
            <div className={styles.swipeAction} style={{ opacity: Math.min(swipeState.deltaX / 60, 1) }}><IoReturnUpBack size={24} /></div>
            <div ref={messageWrapperRef} className={`${styles.messageWrapper} ${isOwnMessage ? styles.benimMesajim : styles.digerMesaj}`} onContextMenu={handleContextMenu} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                {!isOwnMessage && <img src={message.senderAvatar} alt="Avatar" className={styles.messageAvatar} />}
                <div className={styles.messageContentWrapper}>
                    <div className={styles.messageBubble}>
                        {message.replyTo && (
                            <div className={styles.replyQuote}>
                                <div className={styles.sender}>{message.replyTo.senderName}</div>
                                <div className={styles.text}>{message.replyTo.text}</div>
                            </div>
                        )}
                        {!isOwnMessage && <div className={styles.senderName}>{message.senderName}</div>}
                        <div className={styles.messageText}>
                            {message.type === 'media' ? <MediaContent message={message} /> : message.text}
                        </div>
                        <div className={styles.messageMeta}>
                            <span className={styles.messageTime}>{formatTime(message.timestamp)}</span>
                            {isOwnMessage && <StatusIcon status={message.status} />}
                        </div>
                    </div>
                    {reactions.length > 0 && (
                        <div className={styles.reactionsContainer}>
                            {reactions.map(({ emoji, count, hasReacted }) => (
                                <ReactionBubble key={emoji} emoji={emoji} count={count} hasReacted={hasReacted} onClick={() => onToggleReaction(message.id, emoji)} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MessageBubble;