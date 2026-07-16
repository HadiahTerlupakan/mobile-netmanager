import { signInWithCustomToken, signOut as firebaseSignOut } from 'firebase/auth'
import { addDoc, collection, getFirestore, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { DeviceEventEmitter } from 'react-native'

import api from '@/services/api'
import { getMobileFirebaseApp, getMobileFirebaseAuth } from '@/services/firebaseApp'
import { logger } from '@/utils/logger'

/**
 * Event yang di-broadcast saat realtime di-disconnect (mis. signOut).
 * `subscribeToScope` listen event ini agar auto-cancel — tanpa ini,
 * listener yang owner-nya screen tertentu tetap hidup pakai auth lama
 * sampai screen unmount manual.
 */
const REALTIME_DISCONNECTED_EVENT = '__realtime:disconnected'

interface FirebaseTokenResponse {
  token?: string
}

async function fetchRealtimeCustomToken(): Promise<string> {
  const response = await api.post<FirebaseTokenResponse>('/api/mobile/auth/firebase-token')
  const token = response.data?.token

  if (!token) {
    throw new Error('Realtime custom token was not returned by backend')
  }

  return token
}

async function authenticateRealtimeClient(): Promise<void> {
  const auth = getMobileFirebaseAuth()

  // Cek expiry token sekarang, bukan cuma identitas user. Custom-token
  // signed-in tidak otomatis refresh ID token saat ID token mati — kalau
  // tidak dipaksa cek di sini, listener Firestore akan diam senyap setelah
  // ~1 jam dan user lihat data "frozen".
  if (auth.currentUser) {
    try {
      await auth.currentUser.getIdToken(false)
      return
    } catch (error) {
      logger.warn('[Realtime] Stored Firebase ID token expired/invalid, re-minting', error)
      try {
        await firebaseSignOut(auth)
      } catch (signOutError) {
        logger.warn('[Realtime] Firebase signOut during re-auth failed (non-fatal)', signOutError)
      }
    }
  }

  const customToken = await fetchRealtimeCustomToken()
  await signInWithCustomToken(auth, customToken)
}

let connectPromise: Promise<void> | null = null

function ensureRealtimeAuthenticated(): Promise<void> {
  if (!connectPromise) {
    connectPromise = authenticateRealtimeClient().catch((error) => {
      connectPromise = null
      throw error
    })
  }

  return connectPromise
}

function resetRealtimeAuthentication(): void {
  connectPromise = null
}

/**
 * Error code dari Firestore yang berarti sesi auth sudah tidak valid lagi
 * (token expired, permission rotated, user disabled). Re-auth diperlukan
 * sebelum retry, kalau tidak listener akan loop terus dengan token mati.
 */
function isAuthError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code
  return code === 'permission-denied' || code === 'unauthenticated'
}

// Note: 'chat' kind sengaja DIHAPUS dari union — backend (`contracts.ts`)
// tidak define `chat`, Firestore rules tidak ada match `/chats/{}/events`,
// dan tidak ada publisher di backend yang publish ke channel itu. Sebelum
// di-add kembali ke mobile, backend wajib: (1) tambahkan `chat` ke
// `RealtimeScope`, (2) implement publisher di chat send service, (3)
// tambahkan Firestore rule scoped per participant. Lihat H5 di laporan.
export type RealtimeScopeKind = 'user' | 'department' | 'workorder' | 'ticket' | 'admin'

export interface RealtimeScope {
  kind: RealtimeScopeKind
  id: string
}

export interface RealtimeStreamEvent<TPayload = unknown> {
  type: string
  payload: TPayload
  scope: RealtimeScope
  createdAt?: string
}

interface ConnectOptions {
  token: string
  userId: string
  userRole: string
  tenantUrl: string | null
}

function buildScopeChannel(scope: RealtimeScope): string {
  switch (scope.kind) {
    case 'user':
      return `users/${scope.id}/events`
    case 'department':
      return `departments/${scope.id}/events`
    case 'workorder':
      return `workorders/${scope.id}/events`
    case 'ticket':
      return `tickets/${scope.id}/events`
    case 'admin':
      return `admin/streams/${scope.id}/events`
  }
}

class RealtimeService {
  connect(_options: ConnectOptions): Promise<void> {
    try {
      getMobileFirebaseApp()
    } catch (err) {
      logger.warn('[Realtime] Firebase unavailable, realtime disabled', err)
    }
    return ensureRealtimeAuthenticated()
  }

  /**
   * Disconnect realtime: reset auth cache + sign out Firebase Auth.
   *
   * Tanpa Firebase signOut, listener yang masih hidup di screen tertentu
   * akan terus subscribe pakai UID user lama setelah logout — saat user
   * lain login di device sama, event lintas-akun bisa nyasar
   * (cross-account leak di shared device).
   *
   * Listener individual tetap di-cancel oleh komponen pemilik via
   * fungsi return dari `subscribeToScope`.
   */
  async disconnect(): Promise<void> {
    resetRealtimeAuthentication()
    try {
      await firebaseSignOut(getMobileFirebaseAuth())
    } catch (error) {
      logger.warn('[Realtime] Firebase signOut failed during disconnect (non-fatal)', error)
    }
    // Broadcast ke semua subscribeToScope yang masih aktif agar mereka
    // cancel diri sendiri — tanpa ini, listener owner-screen tetap hidup
    // pakai sesi auth yang sudah signed-out (cross-account leak risk).
    DeviceEventEmitter.emit(REALTIME_DISCONNECTED_EVENT)
  }

  subscribeToUserStream(
    userId: string,
    onEvent: (event: RealtimeStreamEvent) => void
  ): () => void {
    return this.subscribeToScope({ kind: 'user', id: userId }, onEvent)
  }

  subscribeToScope(
    scope: RealtimeScope,
    onEvent: (event: RealtimeStreamEvent) => void
  ): () => void {
    let firestore: ReturnType<typeof getFirestore>
    try {
      firestore = getFirestore(getMobileFirebaseApp())
    } catch (err) {
      logger.warn('[Realtime] Firebase unavailable, scope subscription skipped', err)
      return () => { /* noop */ }
    }
    let unsubscribe: (() => void) | null = null
    let retryCount = 0
    let retryTimeout: ReturnType<typeof setTimeout> | null = null
    let cancelled = false
    const maxRetries = 5

    // seenDocIds harus hidup di luar `subscribe` closure agar tidak hilang
    // setiap retry. Tanpa ini, retry akan reset hydration → 20 doc terakhir
    // di-swallow lagi padahal mungkin sudah dideliver oleh listener
    // sebelumnya, atau sebaliknya: doc baru yang muncul saat downtime
    // terlewat karena dianggap bagian dari hydration.
    //
    // Di-cap pada SEEN_DOC_IDS_MAX agar tidak grow tanpa batas pada
    // long-lived listener (chat / WO detail screen yang dibuka berjam-jam).
    const SEEN_DOC_IDS_MAX = 500
    const seenDocIds = new Set<string>()
    const rememberDocId = (id: string) => {
      if (seenDocIds.size >= SEEN_DOC_IDS_MAX) {
        // Buang item terlama (FIFO) — Set iterator order = insertion order.
        const oldest = seenDocIds.values().next().value
        if (oldest !== undefined) seenDocIds.delete(oldest)
      }
      seenDocIds.add(id)
    }

    let isHydrated = false

    const subscribe = () => {
      const channelQuery = query(
        collection(firestore, buildScopeChannel(scope)),
        orderBy('createdAt', 'desc'),
        limit(20)
      )

      unsubscribe = onSnapshot(
        channelQuery,
        (snapshot) => {
          // Reset retry count on successful snapshot
          retryCount = 0

          if (!isHydrated) {
            snapshot.docs.forEach((doc) => {
              rememberDocId(doc.id)
            })
            isHydrated = true
            return
          }

          snapshot.docChanges().forEach((change) => {
            if (change.type !== 'added' || seenDocIds.has(change.doc.id)) {
              return
            }

            rememberDocId(change.doc.id)
            const data = change.doc.data() as Partial<RealtimeStreamEvent>

            if (!data.type) {
              return
            }

            onEvent({
              type: data.type,
              payload: data.payload,
              scope: (data.scope as RealtimeScope | undefined) ?? scope,
              createdAt: data.createdAt,
            })
          })
        },
        (error) => {
          logger.warn('[Realtime] Firestore subscription failed', {
            scope,
            message: error.message,
            code: (error as { code?: string }).code,
          })

          if (cancelled) return

          // Auth error → token mati / permission rotated. Reset auth cache
          // dan re-mint sebelum retry, kalau tidak listener akan loop terus
          // pakai token yang sama-sama mati.
          const needsReauth = isAuthError(error)
          if (needsReauth) {
            resetRealtimeAuthentication()
          }

          if (retryCount < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 30000)
            retryCount++
            logger.warn(`[Realtime] Reconnecting in ${delay}ms (attempt ${retryCount}/${maxRetries})${needsReauth ? ' [re-auth]' : ''}`)
            retryTimeout = setTimeout(() => {
              if (cancelled) return
              if (needsReauth) {
                ensureRealtimeAuthenticated()
                  .then(() => {
                    if (!cancelled) subscribe()
                  })
                  .catch((reauthError) => {
                    logger.error('[Realtime] Re-auth failed', reauthError)
                  })
              } else {
                subscribe()
              }
            }, delay)
          } else {
            logger.warn('[Realtime] Max retries reached, giving up', { scope })
          }
        }
      )
    }

    subscribe()

    // Listen broadcast disconnect → auto-cancel listener tanpa screen
    // perlu unmount manual. Combined dengan `cancelled` flag, ini guarantee
    // tidak ada listener nyasar pakai sesi auth yang sudah signed-out.
    const disconnectSubscription = DeviceEventEmitter.addListener(
      REALTIME_DISCONNECTED_EVENT,
      () => {
        cancelled = true
        if (retryTimeout) clearTimeout(retryTimeout)
        if (unsubscribe) unsubscribe()
        seenDocIds.clear()
      },
    )

    return () => {
      cancelled = true
      disconnectSubscription.remove()
      if (retryTimeout) {
        clearTimeout(retryTimeout)
      }
      if (unsubscribe) {
        unsubscribe()
      }
      // Bantu GC — listener bisa lifecycle panjang dan akumulasi 500 ID.
      seenDocIds.clear()
    }
  }

  async emitToRoom(room: string, type: string, payload: unknown): Promise<void> {
    const scope = this.parseRoom(room)

    if (!scope) {
      return
    }

    const firestore = getFirestore(getMobileFirebaseApp())
    await addDoc(collection(firestore, buildScopeChannel(scope)), {
      type,
      payload,
      scope,
      createdAt: new Date().toISOString(),
    })
  }

  parseRoom(room: string): RealtimeScope | null {
    const [kind, ...rest] = room.split(':')
    const id = rest.join(':')

    if (!kind || !id) {
      return null
    }

    switch (kind) {
      case 'user':
      case 'department':
      case 'workorder':
      case 'ticket':
      case 'admin':
        return { kind, id }
      default:
        return null
    }
  }
}

export const realtimeService = new RealtimeService()
