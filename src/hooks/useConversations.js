// src/hooks/useConversations.js
import { useState, useEffect } from 'react';
import { listenForConversations } from '../lib/conversations'; // lib'deki fonksiyonu kullanıyoruz
import { auth } from '../lib/firebase';

export function useConversations() {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    // listenForConversations zaten bir "unsubscribe" fonksiyonu döndürüyor
    const unsubscribe = listenForConversations(currentUser.uid, (loadedConversations) => {
      setConversations(loadedConversations);
      setIsLoading(false);
    });

    // useEffect'in temizleme fonksiyonu, bileşen kaldırıldığında çağrılır
    return () => unsubscribe();
  }, [currentUser]); // currentUser değiştiğinde bu effect yeniden çalışır

  return { conversations, isLoading };
}