require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Diğer route'lar
const tenorRoutes = require('./routes/tenorRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const geminiRoutes = require('./routes/geminiRoutes');
const { generateToken } = require('./agora.js');
// YENİ EKLENDİ
const linkPreviewRoutes = require('./routes/linkPreviewRoutes');

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Novision Backend Sunucusu Aktif!');
});

app.use('/api/tenor', tenorRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/gemini', geminiRoutes);
// YENİ EKLENDİ
app.use('/api/link-preview', linkPreviewRoutes);

app.get('/api/agora/token/:channel/:uid', generateToken);

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`Sunucu ${HOST}:${PORT} adresinde başlatıldı.`);
});