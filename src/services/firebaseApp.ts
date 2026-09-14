import AsyncStorage from '@react-native-async-storage/async-storage'
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app'
import * as firebaseAuthModule from 'firebase/auth'
import { Auth, Persistence, getAuth, initializeAuth } from 'firebase/auth'
import { logger } from '@/utils/logger'

// getReactNativePersistence hanya ter-export di build RN (dist/rn/index.js)
// — tidak ada di public types `firebase/auth`, jadi diakses runtime via
// modul yang Metro resolve sesuai conditional export "react-native".
const { getReactNativePersistence } = firebaseAuthModule as unknown as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence
}

/**
 * Nilai bawaan: konfigurasi aplikasi *web* Firebase proyek netmanager-96742 —
 * nilai yang sama dengan yang dipakai build EAS dan yang sudah publik di bundle
 * radpro.id.
 *
 * Firebase JS SDK memanggil REST API Google dari JavaScript. Konfigurasi
 * *Android* (google-services.json) tidak bisa dipakai di sini: key-nya dibatasi
 * untuk aplikasi native dan Google menolak panggilan JS dengan
 * "403 Requests from this Android client application <empty> are blocked".
 * Nilai bawaan dulu memakai konfigurasi Android, sehingga setiap bundle yang
 * dibangun tanpa env tetap lolos build lalu mematikan chat dan realtime work
 * order di perangkat — tanpa satu pun laporan error ke backend.
 */
const KONFIGURASI_WEB_BAWAAN = {
  apiKey: 'AIzaSyDihrl023fOQnXf8oZ7A2rU7YxzJzQN5Lc',
  authDomain: 'netmanager-96742.firebaseapp.com',
  projectId: 'netmanager-96742',
  databaseURL: 'https://netmanager-96742-default-rtdb.asia-southeast1.firebasedatabase.app',
  storageBucket: 'netmanager-96742.firebasestorage.app',
  messagingSenderId: '43187781340',
  appId: '1:43187781340:web:461fc10875b35538e67e19',
}

type FirebaseEnv = Record<string, string | undefined>

// Setiap variabel ditulis sebagai `process.env.EXPO_PUBLIC_…` harfiah: Expo
// hanya menanam nilai build pada akses berbentuk itu. Membacanya lewat objek
// perantara membuat nilai build tidak pernah sampai ke perangkat.
const ENV_BUILD: FirebaseEnv = {
  EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  EXPO_PUBLIC_FIREBASE_DATABASE_URL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
}

/**
 * Susun konfigurasi Firebase JS: env build bila ada, nilai web bawaan bila
 * tidak. App id non-web ditolak keras — lebih baik build gagal daripada bundle
 * yang lolos lalu rusak di tangan teknisi.
 */
export function resolveFirebaseWebConfig(env: FirebaseEnv = ENV_BUILD) {
  const pilih = (nama: string, bawaan: string) => env[nama]?.trim() || bawaan

  const config = {
    apiKey: pilih('EXPO_PUBLIC_FIREBASE_API_KEY', KONFIGURASI_WEB_BAWAAN.apiKey),
    authDomain: pilih('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', KONFIGURASI_WEB_BAWAAN.authDomain),
    projectId: pilih('EXPO_PUBLIC_FIREBASE_PROJECT_ID', KONFIGURASI_WEB_BAWAAN.projectId),
    databaseURL: pilih('EXPO_PUBLIC_FIREBASE_DATABASE_URL', KONFIGURASI_WEB_BAWAAN.databaseURL),
    storageBucket: pilih('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', KONFIGURASI_WEB_BAWAAN.storageBucket),
    messagingSenderId: pilih(
      'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      KONFIGURASI_WEB_BAWAAN.messagingSenderId,
    ),
    appId: pilih('EXPO_PUBLIC_FIREBASE_APP_ID', KONFIGURASI_WEB_BAWAAN.appId),
  }

  if (!config.appId.includes(':web:')) {
    throw new Error(
      `EXPO_PUBLIC_FIREBASE_APP_ID harus app id web Firebase, menerima "${config.appId}". ` +
        'Konfigurasi Android ditolak Google untuk panggilan dari Firebase JS SDK.',
    )
  }

  return config
}

// Di tingkat modul, env yang salah tidak boleh menjatuhkan aplikasi: modul ini
// dimuat saat startup, dan crash di sini mengunci teknisi dari seluruh
// aplikasi — jauh lebih buruk daripada realtime yang mati. Nilai web bawaan
// selalu benar, jadi env yang ditolak diganti dengannya dan dicatat keras.
function susunKonfigurasiFirebase() {
  try {
    return resolveFirebaseWebConfig()
  } catch (error) {
    logger.error('[Firebase] Env build ditolak, memakai konfigurasi web bawaan', error)
    return resolveFirebaseWebConfig({})
  }
}

const firebaseConfig = susunKonfigurasiFirebase()

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
