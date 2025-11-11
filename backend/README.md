# Novision Backend

Backend API servisi Novision chat uygulaması için.

## Özellikler

- **Agora Token Oluşturma**: Görüntülü ve sesli aramalar için güvenli token üretimi
- **Tenor GIF API**: GIF arama ve trend GIF'leri sunumu
- **Gemini AI**: Google Gemini AI entegrasyonu ile sohbet asistanı
- **Bildirim Yönetimi**: Push notification desteği
- **CORS Desteği**: Frontend ile güvenli iletişim

## Kurulum

### Yerel Geliştirme

```bash
cd backend
npm install
npm start
```

Backend http://localhost:3000 adresinde çalışacaktır.

### Render'a Deploy

1. Render.com'da yeni bir Web Service oluşturun
2. GitHub repository'nizi bağlayın
3. Root Directory'yi `backend` olarak ayarlayın
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Ortam değişkenlerini ekleyin:
   - `AGORA_APP_ID`
   - `AGORA_APP_CERTIFICATE`
   - `TENOR_API_KEY`
   - `GEMINI_API_KEY`

Alternatif olarak, `render.yaml` dosyası ile Infrastructure as Code kullanabilirsiniz.

## API Endpoints

### GET /
Backend durumunu kontrol eder.

**Response:**
```
Novision Backend Sunucusu Aktif!
```

### GET /api/tenor/trending
Trend olan GIF'leri getirir.

**Response:**
```json
{
  "results": [
    {
      "id": "...",
      "media_formats": {
        "gif": { "url": "..." },
        "tinygif": { "url": "..." }
      }
    }
  ]
}
```

### GET /api/tenor/search?q={query}
Belirtilen sorguya göre GIF arar.

**Parameters:**
- `q`: Arama sorgusu (required)

**Response:**
```json
{
  "results": [...]
}
```

### GET /api/agora/token/:channel/:uid
Agora RTC token oluşturur.

**Parameters:**
- `channel`: Kanal adı (required)
- `uid`: Kullanıcı ID'si (required, 0 olabilir)

**Response:**
```json
{
  "token": "006..."
}
```

### POST /api/gemini
Gemini AI ile sohbet yapar.

**Body:**
```json
{
  "prompt": "Soru veya mesaj"
}
```

**Response:**
```json
{
  "response": "AI yanıtı"
}
```

## Ortam Değişkenleri

| Variable | Description | Required |
|----------|-------------|----------|
| `AGORA_APP_ID` | Agora App ID | Yes |
| `AGORA_APP_CERTIFICATE` | Agora App Certificate | Yes |
| `TENOR_API_KEY` | Tenor API Key | Yes |
| `GEMINI_API_KEY` | Google Gemini API Key | Yes |
| `PORT` | Server port (default: 3000) | No |

## Güvenlik

- CORS tüm origin'ler için etkinleştirilmiştir (production'da belirli domain'lere kısıtlayın)
- Agora token'ları 1 saat geçerlidir
- API anahtarları environment variables ile korunur

## Notlar

- Free Spark plan ile uyumludur (Firebase)
- Render free tier ile çalışır
- `agora-access-token` paketi deprecated, gelecekte `agora-token` paketine geçiş yapılmalı
