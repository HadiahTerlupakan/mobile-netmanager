import "expo-router/entry";

// Reanimated must be imported first to avoid startup crash
import 'react-native-gesture-handler';
import 'react-native-reanimated';

// Custom entry point for expo-router
// This ensures LocationTrackingService is loaded at app cold start
// so that TaskManager.defineTask() is registered before any navigation

import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';

// Registrasi handler background FCM
setBackgroundMessageHandler(getMessaging(), async remoteMessage => {
    console.log('FCM Message handled in the background!', remoteMessage);
});
