import "expo-router/entry";

// Reanimated must be imported first to avoid startup crash
import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { initializeAppCheckService } from '@/services/AppCheckService';

// Custom entry point for expo-router
// This ensures LocationTrackingService is loaded at app cold start
// so that TaskManager.defineTask() is registered before any navigation

import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import { tanganiPushLatarBelakang } from '@/services/pushLatarBelakang';

// Initialize App Check sebelum apa pun yang akses Firebase services.
// Async fire-and-forget — bila gagal, Firebase tetap bisa diakses
// (hanya akan ditolak kalau service di-Enforce di Firebase Console).
// Semua import di atas tetap dievaluasi lebih dulu (import di-hoist), jadi
// memindahkan panggilan ini ke bawah blok import tidak mengubah urutan eksekusi.
initializeAppCheckService();

// Background FCM handler: push data saja ditampilkan lewat channel yang berlaku
// (lihat src/services/pushLatarBelakang.ts).
setBackgroundMessageHandler(getMessaging(), tanganiPushLatarBelakang);
