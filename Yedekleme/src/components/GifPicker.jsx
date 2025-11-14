// --- GÜNCELLENMİŞ DOSYA: src/components/GifPicker.jsx ---

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './GifPicker.module.css';
import { IoClose, IoSearch } from 'react-icons/io5';

// Sunucu adresini doğrudan buraya ekliyoruz.
const API_URL = 'https://novision-backend.onrender.com';

function GifPicker({ onSelect, onClose }) {
  const [gifs, setGifs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const searchTimeoutRef = useRef(null);

  const fetchTrendingGifs = useCallback(async () => {
    setIsLoading(true);
    try {
      // --- DEĞİŞİKLİK BURADA ---
      // İstek artık tam sunucu adresine yapılıyor.
      const response = await fetch(`${API_URL}/api/tenor/trending`);
      
      if (!response.ok) {
        // Sunucudan gelen hatayı daha detaylı loglayalım
        const errorData = await response.text();
        console.error('Sunucu Hatası:', response.status, errorData);
        throw new Error('GIFler alınamadı');
      }
      const data = await response.json();
      setGifs(data.results);
    } catch (error) {
      console.error("Trend GIF hatası:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchGifs = useCallback(async (query) => {
    if (!query) {
      fetchTrendingGifs();
      return;
    }
    setIsLoading(true);
    try {
      // --- DEĞİŞİKLİK BURADA ---
      // İstek artık tam sunucu adresine yapılıyor.
      const response = await fetch(`${API_URL}/api/tenor/search?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Sunucu Arama Hatası:', response.status, errorData);
        throw new Error('GIF araması başarısız');
      }
      const data = await response.json();
      setGifs(data.results);
    } catch (error) {
      console.error("GIF arama hatası:", error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchTrendingGifs]);

  useEffect(() => {
    fetchTrendingGifs();
  }, [fetchTrendingGifs]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      searchGifs(searchTerm);
    }, 500); // Kullanıcı yazmayı bıraktıktan 500ms sonra ara

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, searchGifs]);

  const handleGifClick = (gif) => {
    const gifUrl = gif.media_formats?.gif?.url || gif.media_formats?.tinygif?.url;
    if (gifUrl) {
      onSelect(gifUrl);
      onClose();
    } else {
      console.error("Seçilen GIF için uygun format bulunamadı:", gif);
    }
  };
  
  return (
    <div className={styles.pickerOverlay} onClick={onClose}>
      <div className={styles.pickerContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>GIF Seç</h3>
          <button onClick={onClose} className={styles.closeBtn}><IoClose size={24} /></button>
        </div>
        <div className={styles.searchBar}>
          <IoSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Tenor'da ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>
        <div className={styles.gifGrid}>
          {isLoading && <p>Yükleniyor...</p>}
          {gifs.map((gif) => (
            <div key={gif.id} className={styles.gifItem} onClick={() => handleGifClick(gif)}>
              <img src={gif.media_formats.tinygif.url} alt={gif.content_description} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default GifPicker;