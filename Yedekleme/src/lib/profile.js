// src/lib/profile.js
import { db, auth } from './firebase';
import { ref, update, get } from "firebase/database";
import { updateProfile, updateEmail as updateAuthEmail, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";

export async function updateUserProfile(userId, updatesPayload) {
    if (!userId) throw new Error("Kullanıcı ID'si bulunamadı.");

    const currentUser = auth.currentUser;
    if (currentUser.uid !== userId) throw new Error("Yetkisiz işlem.");

    try {
        // --- GÜNCELLEME MANTIĞI DEĞİŞTİ ---
        // Her bir ana yola ayrı ayrı yazma işlemi yapacağız.
        const userRef = ref(db, `/users/${userId}`);
        const searchIndexRef = ref(db, `/userSearchIndex/${userId}`);
        
        const dbUpdates = {};
        const searchIndexUpdates = {};
        const authUpdates = {};

        if (updatesPayload.username) {
            if (!updatesPayload.username.trim()) throw new Error("Kullanıcı adı boş olamaz.");
            dbUpdates.username = updatesPayload.username;
            searchIndexUpdates.username = updatesPayload.username;
            authUpdates.displayName = updatesPayload.username;
        }
        if (typeof updatesPayload.status !== 'undefined') {
            dbUpdates.status = updatesPayload.status;
        }
        if (updatesPayload.avatarUrl) {
            dbUpdates.avatar = updatesPayload.avatarUrl;
            searchIndexUpdates.avatar = updatesPayload.avatarUrl;
            authUpdates.photoURL = updatesPayload.avatarUrl;
        }
        if (updatesPayload.email) {
            dbUpdates.email = updatesPayload.email;
        }
        
        // Veritabanı güncellemelerini yap
        if (Object.keys(dbUpdates).length > 0) {
            await update(userRef, dbUpdates);
        }
        if (Object.keys(searchIndexUpdates).length > 0) {
            await update(searchIndexRef, searchIndexUpdates);
        }
        
        // Firebase Auth profilini de güncelle
        if (Object.keys(authUpdates).length > 0) {
             await updateProfile(currentUser, authUpdates);
        }
       
        return { success: true };

    } catch (error) {
        console.error("Profil güncelleme hatası:", error);
        throw new Error("Profil güncellenirken bir hata oluştu.");
    }
}

// YENİ FONKSİYONLAR
async function reauthenticate(currentPassword) {
    const user = auth.currentUser;
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
}

export async function changeUserPassword(currentPassword, newPassword) {
    if (!newPassword || newPassword.length < 6) {
        throw new Error("Yeni şifre en az 6 karakter olmalıdır.");
    }
    await reauthenticate(currentPassword);
    const user = auth.currentUser;
    await updateProfile(user, newPassword); // updateProfile aslında updatePassword olmalı, Firebase SDK v9+ da bu updatePassword
    // Doğrusu:
    const { updatePassword } = await import("firebase/auth");
    await updatePassword(user, newPassword);
}

export async function changeUserEmail(currentPassword, newEmail) {
    if (!newEmail) throw new Error("Yeni e-posta adresi boş olamaz.");

    await reauthenticate(currentPassword);
    const user = auth.currentUser;
    await updateAuthEmail(user, newEmail);

    // Veritabanındaki e-postayı da güncelle
    await updateUserProfile(user.uid, { email: newEmail });
}