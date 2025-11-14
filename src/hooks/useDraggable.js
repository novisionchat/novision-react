// --- DOSYA: src/hooks/useDraggable.js (GÜNCELLENMİŞ VE DAHA STABİL HALİ) ---

import { useState, useEffect, useRef, useCallback } from 'react';

export const useDraggable = (elRef, initialPosition = { x: 0, y: 0 }) => {
  const [position, setPosition] = useState(initialPosition);
  const isDraggingRef = useRef(false);
  // Hem fare pozisyonunu hem de eleman başlangıç pozisyonunu tutmak yerine,
  // sadece tıklama anındaki "offset"i (fare ile elemanın köşesi arasındaki mesafe) tutacağız.
  // Bu, "atlama" sorununu çözer.
  const offsetRef = useRef({ x: 0, y: 0 });

  const getEventCoords = (e) => {
    return e.touches ? e.touches[0] : e;
  };

  const handleDragStart = useCallback((e) => {
    // Sürüklenmemesi gereken alanları kontrol etme mantığı aynı kalıyor.
    if (e.target.closest('button, input, a, [data-drag-ignore="true"]')) {
      return;
    }

    const coords = getEventCoords(e);
    isDraggingRef.current = true;
    
    // Yeni mantık: Farenin tıklama anındaki pozisyonu ile 
    // elemanın mevcut pozisyonu arasındaki farkı (offset) kaydet.
    offsetRef.current = {
      x: coords.clientX - position.x,
      y: coords.clientY - position.y,
    };
  }, [position]);

  const handleDragMove = useCallback((e) => {
    if (isDraggingRef.current) {
      e.preventDefault();
      const coords = getEventCoords(e);
      
      // Yeni mantık: Elemanın yeni pozisyonunu, farenin mevcut pozisyonundan
      // başlangıçtaki offset'i çıkararak bul. Bu sayede eleman fareyi takip eder.
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

  return {
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      transform: `translate(${position.x}px, ${position.y}px)`,
      // Hook'un kendisi tarafından cursor ataması yapmak daha merkezi bir kontrol sağlar.
      // CSS'te ayrıca yönetilebilir, ancak burada olması da mantıklıdır.
      cursor: isDraggingRef.current ? 'grabbing' : 'move',
    },
  };
};