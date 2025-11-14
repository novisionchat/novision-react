// src/lib/presence.js
import { db } from './firebase.js';
import { 
    ref, 
    onValue, 
    set, 
    serverTimestamp, 
    onDisconnect 
} from "firebase/database";

// Bu fonksiyon, kullanıcı giriş yaptığında çağrılır.
// Kullanıcı bağlandığında durumunu 'online' yapar.
// Bağlantı koptuğunda (sekme kapatma vb.) ise otomatik olarak 'offline' yapar.
export function initializePresence(userId) {
    if (!userId) return;

    const userStatusRef = ref(db, `users/${userId}/presence`);
    const userLastSeenRef = ref(db, `users/${userId}/lastSeen`);

    const isOnlineData = {
        state: 'online',
        lastChanged: serverTimestamp()
    };
    const isOfflineData = {
        state: 'offline',
        lastChanged: serverTimestamp()
    };

    const connectedRef = ref(db, '.info/connected');
    onValue(connectedRef, (snapshot) => {
        if (snapshot.val() === false) {
            return; // Kullanıcı internetini kaybederse bir şey yapma
        }

        // Bağlantı koptuğunda çalışacak komutları ayarla
        onDisconnect(userStatusRef).set(isOfflineData);
        onDisconnect(userLastSeenRef).set(serverTimestamp());

        // Bağlantı kurulduğunda durumunu online yap
        set(userStatusRef, isOnlineData);
    });
}

// Belirli bir kullanıcının durumunu ve son görülme zamanını dinler.
export function listenToUserPresence(userId, callback) {
    if (!userId) return () => {};

    const userStatusRef = ref(db, `users/${userId}/presence`);
    const userLastSeenRef = ref(db, `users/${userId}/lastSeen`);

    let presenceData = { state: 'offline' };
    let lastSeenData = null;

    const combineAndCallback = () => {
        callback({ presence: presenceData, lastSeen: lastSeenData });
    };

    const unsubPresence = onValue(userStatusRef, (snapshot) => {
        presenceData = snapshot.exists() ? snapshot.val() : { state: 'offline' };
        combineAndCallback();
    });

    const unsubLastSeen = onValue(userLastSeenRef, (snapshot) => {
        lastSeenData = snapshot.exists() ? snapshot.val() : null;
        combineAndCallback();
    });

    // Bu dinleyicileri durdurmak için kullanılacak temizleme fonksiyonu
    return () => {
        unsubPresence();
        unsubLastSeen();
    };
}

// Durum metnini formatlar (Örn: "Çevrimiçi")
export function getPresenceText(state) {
    const texts = {
        'online': 'Çevrimiçi',
        'away': 'Uzakta',
        'busy': 'Meşgul',
        'offline': 'Çevrimdışı'
    };
    return texts[state] || texts.offline;
}

// Son görülme zamanını formatlar (Örn: "5 dakika önce görüldü")
export function formatLastSeen(timestamp) {
    if (!timestamp) return 'Çevrimdışı';

    const now = Date.now();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Az önce çevrimiçiydi';
    if (minutes < 60) return `${minutes} dakika önce görüldü`;
    if (hours < 24) return `${hours} saat önce görüldü`;
    if (days === 1) return 'Dün görüldü';
    
    return `${new Date(timestamp).toLocaleDateString('tr-TR')} tarihinde görüldü`;
}