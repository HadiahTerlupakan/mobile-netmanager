import "expo-router/entry";

// Reanimated must be imported first to avoid startup crash
import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { initializeAppCheckService } from '@/services/AppCheckService';

// Custom entry point for expo-router
// This ensures LocationTrackingService is loaded at app cold start
// so that TaskManager.defineTask() is registered before any navigation

import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { Platform } from 'react-native';

// Initialize App Check sebelum apa pun yang akses Firebase services.
// Async fire-and-forget — bila gagal, Firebase tetap bisa diakses
// (hanya akan ditolak kalau service di-Enforce di Firebase Console).
// Semua import di atas tetap dievaluasi lebih dulu (import di-hoist), jadi
// memindahkan panggilan ini ke bawah blok import tidak mengubah urutan eksekusi.
initializeAppCheckService();

/**
 * Background FCM handler.
 *
 * Untuk message dengan field `notification`, OS render heads-up otomatis —
 * handler ini hanya log + invalidate cache (hooks akan refresh saat user
 * buka app). Untuk data-only message, handler WAJIB display manual via
 * notifee, kalau tidak user tidak akan lihat notifikasi sama sekali.
 */
setBackgroundMessageHandler(getMessaging(), async remoteMessage => {
    const hasNotificationField = !!(remoteMessage.notification?.title || remoteMessage.notification?.body);

    if (hasNotificationField) {
        // OS sudah render heads-up — handler tidak perlu display lagi.
        return;
    }

    // Data-only message → display manual agar user tetap ter-notify.
    const data = remoteMessage.data ?? {};
    const title = typeof data.title === 'string' ? data.title : 'Notifikasi Baru';
    const body = typeof data.body === 'string' ? data.body : 'Anda menerima notifikasi.';

    try {
        if (Platform.OS === 'android') {
            const channelId = await notifee.createChannel({
                id: 'high-priority',
                name: 'High Priority Notifications',
                importance: AndroidImportance.HIGH,
            });
            await notifee.displayNotification({
                title,
                body,
                data: data,
                android: {
                    channelId,
                    importance: AndroidImportance.HIGH,
                    pressAction: { id: 'default' },
                    smallIcon: 'ic_notification',
                },
            });
        } else {
            await notifee.displayNotification({
                title,
                body,
                data: data,
            });
        }
    } catch (error) {
        // Last resort log — handler dijalankan saat app di background, jadi
        // logger services mungkin belum aktif.
        console.warn('[FCM BG] Failed to display data-only notification:', error);
    }
});
