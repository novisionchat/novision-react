// src/lib/chessSounds.js

// Lichess.org'un açık kaynaklı, yüksek kaliteli ses dosyalarını kullanıyoruz.
const sounds = {
  move: new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3'),
  capture: new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3'),
  check: new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-check.mp3'),
  end: new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-end.mp3'), // Galibiyet/Yenilgi/Beraberlik için
};

// Sesleri tekrar tekrar çalabilmek için bu fonksiyonu kullanacağız.
export const playSound = (soundName) => {
  try {
    const sound = sounds[soundName];
    if (sound) {
      sound.currentTime = 0; // Sesi başa sar
      sound.play();
    }
  } catch (error) {
    console.error(`Ses dosyası çalınamadı: ${soundName}`, error);
  }
};