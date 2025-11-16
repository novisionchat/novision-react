// DOSYA: electron.js (Projenin ana dizininde)

const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

// Uygulamanın canlı URL'si
const liveUrl = 'https://novision.netlify.app/';

function createWindow() {
  // Tarayıcı penceresini oluştur.
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Novision',
    icon: path.join(__dirname, 'public/assets/icon.png'),
    webPreferences: {
      // Güvenlik için nodeIntegration'ı kapalı tutuyoruz, çünkü
      // tüm işi web sayfamız yapıyor.
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Netlify'daki canlı siteyi yükle
  win.loadURL(liveUrl);

  // Menü çubuğunu kaldır
  win.setMenu(null);

  // Harici linklerin (örn: _blank) varsayılan tarayıcıda açılmasını sağla
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});