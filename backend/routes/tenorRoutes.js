const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

// API anahtarını ortam değişkenlerinden al
const TENOR_API_KEY = process.env.TENOR_API_KEY;

// Trend olan GIF'leri getiren rota
router.get('/trending', async (req, res) => {
  if (!TENOR_API_KEY) {
    console.error('Tenor API anahtarı yapılandırılmamış');
    return res.status(500).json({ 
      error: 'Tenor servisi yapılandırılmamış',
      message: 'Tenor API anahtarı sunucuda eksik.' 
    });
  }
  
  try {
    const url = `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&limit=30`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Tenor API hatası: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Tenor trending GIF'leri başarıyla alındı: ${data.results?.length || 0} sonuç`);
    res.json(data);
  } catch (error) {
    console.error('Tenor trend hatası:', error.message);
    res.status(500).json({ 
      error: 'GIF servisi hatası',
      message: 'GIFler alınırken bir sunucu hatası oluştu.',
      details: error.message
    });
  }
});

// Arama sonuçlarını getiren rota
router.get('/search', async (req, res) => {
  if (!TENOR_API_KEY) {
    console.error('Tenor API anahtarı yapılandırılmamış');
    return res.status(500).json({ 
      error: 'Tenor servisi yapılandırılmamış',
      message: 'Tenor API anahtarı sunucuda eksik.' 
    });
  }
  
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ 
        error: 'Geçersiz istek',
        message: 'Arama sorgusu gerekli.' 
      });
    }
    
    const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=30`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Tenor API hatası: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Tenor arama başarılı: "${query}" - ${data.results?.length || 0} sonuç`);
    res.json(data);
  } catch (error) {
    console.error('Tenor arama hatası:', error.message);
    res.status(500).json({ 
      error: 'GIF arama hatası',
      message: 'GIF araması sırasında bir sunucu hatası oluştu.',
      details: error.message
    });
  }
});

// Bu rotaları dışa aktararak server.js'de kullanılabilir yap
module.exports = router;