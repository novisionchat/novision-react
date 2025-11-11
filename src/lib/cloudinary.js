// src/lib/cloudinary.js

// DİKKAT: Bu bilgileri normalde bir .env dosyasında saklamalısınız.
// Bu projede basitlik adına doğrudan buraya yazıyoruz.
const CLOUDINARY_CLOUD_NAME = 'duihnffxg'; // Kendi Cloudinary Cloud Name'iniz
const CLOUDINARY_UPLOAD_PRESET = 'novision_unsigned'; // Kendi Unsigned Upload Preset'iniz

/**
 * Cloudinary'ye bir dosya yükler ve güvenli URL'ini döndürür.
 * @param {File} file Yüklenecek dosya nesnesi.
 * @param {object} options Ekstra seçenekler (örn: { folder: 'avatars' }).
 * @returns {Promise<object>} Yüklenen dosyanın Cloudinary'den dönen verileri (url, resource_type vb.).
 */
export async function uploadToCloudinary(file, options = {}) {
    if (!file) {
        throw new Error('Yüklenecek dosya seçilmedi.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    if (options.folder) {
        formData.append('folder', `novision/${options.folder}`); // Dosyaları klasörlemek için
    }

    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Cloudinary yüklemesi başarısız oldu.');
        }

        const data = await response.json();
        
        // Sadece ihtiyacımız olan bilgileri döndürelim
        return {
            url: data.secure_url,
            publicId: data.public_id,
            resourceType: data.resource_type, // 'image', 'video', 'raw'
            format: data.format,
            bytes: data.bytes,
            duration: data.duration, // video/ses için
        };

    } catch (error) {
        console.error('Cloudinary Yükleme Hatası:', error);
        // Hatayı tekrar fırlatarak çağıran bileşenin yakalamasını sağlıyoruz.
        throw error;
    }
}