// --- DOSYA: src/hooks/useDraggable.js (GÜNCELLENMİŞ HALİ) ---

import { useState, useEffect, useRef, useCallback } from 'react';

export const useDraggable = (elRef, initialPosition = { x: 0, y: 0 }) => {
  const [position, setPosition] = useState(initialPosition);
  const isDraggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragHandleRef = useRef(null); // Tutma sapını referans olarak sakla

  const getEventCoords = (e) => {
    return e.touches ? e.touches[0] : e;
  };

  const handleDragStart = useCallback((e) => {
    // Sürüklenmemesi gereken alanları kontrol et
    if (e.target.closest('button, input, a, [data-drag-ignore="true"]')) {
      return;
    }
    
    const handle = dragHandleRef.current;
    
    // Eğer bir tutma sapı (handle) tanımlıysa ve tıklama onun dışındaysa, sürüklemeyi başlatma.
    if (handle && !handle.contains(e.target)) {
      return;
    }

    const coords = getEventCoords(e);
    isDraggingRef.current = true;
    
    offsetRef.current = {
      x: coords.clientX - position.x,
      y: coords.clientY - position.y,
    };
  }, [position]);

  const handleDragMove = useCallback((e) => {
    if (isDraggingRef.current) {
      e.preventDefault();
      const coords = getEventCoords(e);
      
      setPosition({
        x: coords.clientX - offsetRef.current.x,
        y: coords.clientY - offsetRef.current.y,
      });
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    // Sadece bir kere sorgulama yap
    dragHandleRef.current = el.querySelector('[data-drag-handle="true"]');

    const moveOptions = { passive: false };

    // Fare event'leri
    el.addEventListener('mousedown', handleDragStart);
    document.addEventListener('mousemove', handleDragMove, moveOptions);
    document.addEventListener('mouseup', handleDragEnd);

    // Dokunmatik event'leri
    el.addEventListener('touchstart', handleDragStart, { passive: true });
    document.addEventListener('touchmove', handleDragMove, moveOptions);
    document.addEventListener('touchend', handleDragEnd);

    return () => {
      el.removeEventListener('mousedown', handleDragStart);
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      
      el.removeEventListener('touchstart', handleDragStart);
      document.removeEventListener('touchmove', handleDragMove);
      document.removeEventListener('touchend', handleDragEnd);
    };
  }, [elRef, handleDragStart, handleDragMove, handleDragEnd]);

  // Sürükleme sapı varsa imleci sadece o sapa ata, yoksa tüm elemana ata
  useEffect(() => {
      const el = elRef.current;
      if (!el) return;
      const handle = dragHandleRef.current;
      const target = handle || el;

      const setCursor = () => target.style.cursor = 'move';
      const unsetCursor = () => target.style.cursor = '';

      target.addEventListener('mouseover', setCursor);
      target.addEventListener('mouseout', unsetCursor);
      
      return () => {
          target.removeEventListener('mouseover', setCursor);
          target.removeEventListener('mouseout', unsetCursor);
      }
  }, [elRef]);

  return {
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      transform: `translate(${position.x}px, ${position.y}px)`,
      cursor: isDraggingRef.current ? 'grabbing' : '', // 'move' imlecini useEffect ile yönet
    },
  };
};