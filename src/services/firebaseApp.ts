import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app'

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
}

function hasFirebaseConfig(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId)
}

export function getMobileFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp()
  }

  if (!hasFirebaseConfig()) {
    throw new Error('Firebase mobile config is incomplete')
  }

  return initializeApp(firebaseConfig)
}
