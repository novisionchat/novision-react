// public/firebase-messaging-sw.js

// Firebase SDK'larını import et (v9 compat sürümü service worker için daha stabil)
importScripts("https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging-compat.js");

// Firebase projenizin yapılandırma bilgileri (firebase.js dosyanızdaki ile aynı)
const firebaseConfig = {
  apiKey: "AIzaSyCHssHsg9yNrCNscn3P95ylkfJ-pRCSen4",
  authDomain: "novisionpro-aefde.firebaseapp.com",
  databaseURL: "https://novisionpro-aefde-default-rtdb.firebaseio.com",
  projectId: "novisionpro-aefde",
  storageBucket: "novisionpro-aefde.appspot.com",
  messagingSenderId: "784550739054",
  appId: "1:784550739054:web:23cc2c8776586f9c877a7f"
};

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);

// Messaging servisini al
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Arka plan mesajı alındı: ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/assets/icon.png',
  };

  // self.registration ile bildirimi göster
  self.registration.showNotification(notificationTitle, notificationOptions);
});