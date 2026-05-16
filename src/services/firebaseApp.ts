import AsyncStorage from '@react-native-async-storage/async-storage'
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app'
import * as firebaseAuthModule from 'firebase/auth'
import { Auth, Persistence, getAuth, initializeAuth } from 'firebase/auth'

// getReactNativePersistence hanya ter-export di build RN (dist/rn/index.js)
// — tidak ada di public types `firebase/auth`, jadi diakses runtime via
// modul yang Metro resolve sesuai conditional export "react-native".
const { getReactNativePersistence } = firebaseAuthModule as unknown as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence
}

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

let firebaseAuth: Auth | null = null

export function getMobileFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp()
  }

  if (!hasFirebaseConfig()) {
    throw new Error('Firebase mobile config is incomplete')
  }

  return initializeApp(firebaseConfig)
}

export function getMobileFirebaseAuth(): Auth {
  if (firebaseAuth) {
    return firebaseAuth
  }

  const app = getMobileFirebaseApp()

  try {
    firebaseAuth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    })
  } catch {
    firebaseAuth = getAuth(app)
  }

  return firebaseAuth
}
