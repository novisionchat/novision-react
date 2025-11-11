// --- DOSYA: src/hooks/useDraggable.js ---

import { useState, useEffect, useRef, useCallback } from 'react';

export const useDraggable = (elRef) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const initialPosRef = useRef({ x: 0, y: 0 });
  const elStartPositionRef = useRef({ x: 0, y: 0 });

  const getEventCoords = (e) => {
    return e.touches ? e.touches[0] : e;
  };

  const handleDragStart = useCallback((e) => {
    // Sadece header'dan sürüklenmesini sağla
    if (e.target.closest('[data-drag-handle]')) {
      const coords = getEventCoords(e);
      isDraggingRef.current = true;
      initialPosRef.current = {
        x: coords.clientX,
        y: coords.clientY,
      };
      elStartPositionRef.current = { ...position };
    }
  }, [position]);

  const handleDragMove = useCallback((e) => {
    if (isDraggingRef.current) {
      const coords = getEventCoords(e);
      const dx = coords.clientX - initialPosRef.current.x;
      const dy = coords.clientY - initialPosRef.current.y;
      
      setPosition({
        x: elStartPositionRef.current.x + dx,
        y: elStartPositionRef.current.y + dy,
      });
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    // Fare Olayları
    el.addEventListener('mousedown', handleDragStart);
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);

    // Dokunma Olayları
    el.addEventListener('touchstart', handleDragStart, { passive: true });
    document.addEventListener('touchmove', handleDragMove);
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

  return {
    style: {
      transform: `translate(${position.x}px, ${position.y}px)`,
    },
  };
};