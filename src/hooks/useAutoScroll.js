// src/hooks/useAutoScroll.js
import { useRef, useLayoutEffect } from 'react';

// Bu hook, sohbet konteynerini ve mesajları alır.
function useAutoScroll(chatContainerRef, messages) {
    const scrollPositionRef = useRef(null);

    // useLayoutEffect, DOM güncellendikten hemen sonra, ekran boyanmadan önce çalışır.
    // Bu, kaydırma pozisyonunu ayarlamak için en doğru zamandır.
    useLayoutEffect(() => {
        const container = chatContainerRef.current;
        if (!container) return;

        // 1. Durum: Yeni bir mesaj geldi ve kullanıcı zaten en alttaydı.
        // `scrollPositionRef.current` null ise, bu ilk yükleme veya en altta olduğumuz anlamına gelir.
        if (scrollPositionRef.current === null) {
            container.scrollTop = container.scrollHeight;
            return;
        }

        // 2. Durum: Mesaj listesi değişti (tepki, silme vb.) ama yeni mesaj gelmedi.
        // Kaydırma pozisyonunu, değişiklikten önceki haline geri getir.
        container.scrollTop = scrollPositionRef.current;
        
        // Bir sonraki render için ref'i tekrar sıfırla.
        scrollPositionRef.current = null; 

    }, [messages, chatContainerRef]); // Bu effect, mesajlar değiştiğinde çalışır.

    // Bu fonksiyon, bir değişiklik olmadan HEMEN ÖNCE çalışır.
    // Mevcut kaydırma pozisyonunu hafızaya almamızı sağlar.
    const preserveScrollPosition = () => {
        const container = chatContainerRef.current;
        if (!container) return;

        // Kullanıcının en altta olup olmadığını kontrol et (küçük bir pay bırakarak)
        const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
        
        // Eğer en altta değilse, mevcut pozisyonu kaydet.
        // Eğer en alttaysa, null olarak bırak ki yukarıdaki logic en alta kaydırsın.
        if (!isAtBottom) {
            scrollPositionRef.current = container.scrollTop;
        } else {
            scrollPositionRef.current = null;
        }
    };

    return { preserveScrollPosition };
}

export default useAutoScroll;