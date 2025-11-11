const express = require('express');
const { getLinkPreview } = require('link-preview-js');
const router = express.Router();

router.get('/', async (req, res) => {
    const url = req.query.url;

    if (!url) {
        return res.status(400).json({ error: 'URL parametresi gerekli.' });
    }

    try {
        const previewData = await getLinkPreview(url, {
            // Gerekirse ek ayarlar burada yapılabilir
            timeout: 3000 // 3 saniye zaman aşımı
        });

        // Sadece ihtiyacımız olan verileri seçelim
        const responseData = {
            url: previewData.url,
            title: previewData.title,
            description: previewData.description,
            image: previewData.images ? previewData.images[0] : null,
            siteName: previewData.siteName
        };
        
        res.json(responseData);

    } catch (error) {
        console.error(`Link önizleme hatası (${url}):`, error.message);
        res.status(500).json({ 
            error: 'Önizleme alınamadı.',
            message: error.message
        });
    }
});

module.exports = router;