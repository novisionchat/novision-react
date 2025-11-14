// src/lib/mediaFormatter.js

/**
 * Cloudinary'den gelen yanıta göre bir mesaj payload'u oluşturur.
 * @param {object} cloudinaryResult `uploadToCloudinary` fonksiyonundan dönen obje.
 * @returns {object} `sendMessage` fonksiyonuna gönderilecek payload.
 */
export function formatMediaMessage(cloudinaryResult) {
    const { url, resourceType, format, duration } = cloudinaryResult;
    
    const payload = {
        type: 'media',
        mediaType: resourceType, // 'image', 'video', 'raw' (diğer dosyalar için)
        mediaUrl: url,
        format: format,
    };

    if (duration) {
        payload.duration = duration;
    }

    return payload;
}