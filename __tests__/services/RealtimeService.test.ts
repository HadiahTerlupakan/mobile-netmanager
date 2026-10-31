import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'

type SnapshotDoc = {
  id: string
  data: () => {
    type?: string
    payload?: unknown
    scope?: { kind: string; id: string }
    createdAt?: unknown
  }
}

type SnapshotChange = {
  type: string
  doc: SnapshotDoc
}

type Snapshot = {
  metadata: { fromCache: boolean; hasPendingWrites: boolean }
  docs: SnapshotDoc[]
  docChanges: () => SnapshotChange[]
}

type SnapshotListener = (snapshot: Snapshot) => void

type ListenerError = {
  message: string
  code?: string
}

type ListenOptions = { includeMetadataChanges?: boolean }

type AttachedListener = {
  options: ListenOptions
  onNext: SnapshotListener
  onError?: (error: ListenerError) => void
}

const mockWarn = jest.fn<(message: string, meta: unknown) => void>()
const mockCollection = jest.fn<(firestore: unknown, path: string) => string>()
const mockGetFirestore = jest.fn<(app: unknown) => { name: string }>()
const mockLimit = jest.fn<(value: number) => string>()
const mockOnSnapshot = jest.fn<(queryRef: unknown, ...args: unknown[]) => () => void>()
const mockOrderBy = jest.fn<(field: string, direction: string) => string>()
const mockQuery = jest.fn<(...parts: unknown[]) => string>()
const mockSignInWithCustomToken = jest.fn<(auth: unknown, token: string) => Promise<void>>()
const mockPost = jest.fn<(path: string) => Promise<{ data?: { token?: string } }>>()
const mockGetMobileFirebaseApp = jest.fn(() => ({ name: 'mobile-app' }))
const mockAuth = {
  currentUser: null as null | { uid: string },
}

jest.mock('firebase/auth', () => ({
  signInWithCustomToken: mockSignInWithCustomToken,
}))

jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(),
  collection: mockCollection,
  getFirestore: mockGetFirestore,
  limit: mockLimit,
  onSnapshot: mockOnSnapshot,
  orderBy: mockOrderBy,
  query: mockQuery,
}))

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    post: mockPost,
  },
}))

jest.mock('@/services/firebaseApp', () => ({
  getMobileFirebaseApp: mockGetMobileFirebaseApp,
  getMobileFirebaseAuth: () => mockAuth,
}))

jest.mock('@/utils/logger', () => ({
  logger: {
    warn: mockWarn,
    error: jest.fn(),
  },
}))

const connectOptions = {
  token: 'token-1',
  userId: 'user-1',
  userRole: 'USER',
  tenantUrl: 'https://tenant.test',
}

function loadRealtimeService() {
  jest.resetModules()
  return require('../../src/services/RealtimeService').realtimeService
}

/** Snapshot dengan metadata lengkap seperti yang dikirim Firestore JS SDK. */
function snapshot(
  fromCache: boolean,
  docs: SnapshotDoc[],
  added: SnapshotDoc[] = docs,
): Snapshot {
  return {
    metadata: { fromCache, hasPendingWrites: false },
    docs,
    docChanges: () => added.map((doc) => ({ type: 'added', doc })),
  }
}

const fromServer = (docs: SnapshotDoc[], added?: SnapshotDoc[]) => snapshot(false, docs, added)
const fromCache = (docs: SnapshotDoc[], added?: SnapshotDoc[]) => snapshot(true, docs, added)

function eventDoc(id: string, createdAt: unknown = '2026-11-01T10:00:00.000Z'): SnapshotDoc {
  return {
    id,
    data: () => ({ type: 'inventory.update', payload: { id }, createdAt }),
  }
}

/**
 * Tangkap setiap listener yang dipasang. Firestore menerima dua bentuk
 * pemanggilan — `(query, onNext, onError)` dan `(query, options, onNext,
 * onError)` — jadi keduanya dikenali di sini.
 */
function captureListeners(): AttachedListener[] {
  const attached: AttachedListener[] = []
  mockOnSnapshot.mockImplementation((_queryRef, first, second, third) => {
    if (typeof first === 'function') {
      attached.push({
        options: {},
        onNext: first as SnapshotListener,
        onError: second as AttachedListener['onError'],
      })
    } else {
      attached.push({
        options: first as ListenOptions,
        onNext: second as SnapshotListener,
        onError: third as AttachedListener['onError'],
      })
    }
    return jest.fn()
  })
  return attached
}

describe('RealtimeService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.currentUser = null
    mockGetFirestore.mockImplementation(() => ({ name: 'firestore' }))
    mockCollection.mockImplementation((_firestore, path) => path)
    mockOrderBy.mockImplementation(() => 'order-by')
    mockLimit.mockImplementation(() => 'limit')
    mockQuery.mockImplementation(() => 'query-ref')
    mockPost.mockImplementation(async () => ({
      data: { token: 'custom-token-123' },
    }))
    mockSignInWithCustomToken.mockImplementation(async () => undefined)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('authenticates with a backend custom token before realtime use', async () => {
    const realtimeService = loadRealtimeService()

    await realtimeService.connect(connectOptions)

    expect(mockGetMobileFirebaseApp).toHaveBeenCalled()
    expect(mockPost).toHaveBeenCalledWith('/api/mobile/auth/firebase-token')
    expect(mockSignInWithCustomToken).toHaveBeenCalledWith(mockAuth, 'custom-token-123')
  })

  it('reuses the same in-flight authentication for concurrent connect calls', async () => {
    const realtimeService = loadRealtimeService()

    await Promise.all([
      realtimeService.connect(connectOptions),
      realtimeService.connect(connectOptions),
    ])

    expect(mockPost).toHaveBeenCalledTimes(1)
    expect(mockSignInWithCustomToken).toHaveBeenCalledTimes(1)
  })

  it('resets authentication state after disconnect', async () => {
    const realtimeService = loadRealtimeService()

    await realtimeService.connect(connectOptions)
    realtimeService.disconnect()
    await realtimeService.connect(connectOptions)

    expect(mockPost).toHaveBeenCalledTimes(2)
    expect(mockSignInWithCustomToken).toHaveBeenCalledTimes(2)
  })

  it('surfaces a missing backend custom token', async () => {
    const realtimeService = loadRealtimeService()
    mockPost.mockImplementation(async () => ({ data: {} }))

    await expect(realtimeService.connect(connectOptions)).rejects.toThrow(
      'Realtime custom token was not returned by backend'
    )
  })

  it('retries authentication after a failed sign-in attempt', async () => {
    const realtimeService = loadRealtimeService()
    mockSignInWithCustomToken.mockImplementationOnce(async () => {
      throw new Error('auth failed')
    })

    await expect(realtimeService.connect(connectOptions)).rejects.toThrow('auth failed')
    await realtimeService.connect(connectOptions)

    expect(mockPost).toHaveBeenCalledTimes(2)
    expect(mockSignInWithCustomToken).toHaveBeenCalledTimes(2)
  })

  it('ignores replayed documents from the initial Firestore snapshot', () => {
    const listeners = captureListeners()
    const handler = jest.fn()

    const realtimeService = loadRealtimeService()
    const cleanup = realtimeService.subscribeToUserStream('user-1', handler)
    listeners[0].onNext(fromServer([eventDoc('existing-event')]))

    expect(handler).not.toHaveBeenCalled()
    cleanup()
    expect(mockOnSnapshot.mock.results[0].value).toHaveBeenCalled()
  })

  it('emits only newly added documents after hydration', () => {
    const listeners = captureListeners()
    const handler = jest.fn()

    const realtimeService = loadRealtimeService()
    realtimeService.subscribeToUserStream('user-1', handler)

    const existing = eventDoc('existing-event', '2026-11-01T10:00:00.000Z')
    const fresh = eventDoc('new-event', '2026-11-01T10:05:00.000Z')
    listeners[0].onNext(fromServer([existing]))
    listeners[0].onNext(fromServer([fresh, existing], [fresh, fresh]))

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({
      type: 'inventory.update',
      payload: { id: 'new-event' },
      scope: { kind: 'user', id: 'user-1' },
      createdAt: '2026-11-01T10:05:00.000Z',
    })
  })

  it('logs Firestore listener errors without throwing', () => {
    const listeners = captureListeners()

    const realtimeService = loadRealtimeService()
    const cleanup = realtimeService.subscribeToUserStream('user-1', jest.fn())
    listeners[0].onError?.({
      message: 'Missing or insufficient permissions.',
      code: 'permission-denied',
    })

    cleanup()
    expect(mockOnSnapshot.mock.results[0].value).toHaveBeenCalled()
    expect(mockWarn).toHaveBeenCalledWith('[Realtime] Firestore subscription failed', {
      scope: { kind: 'user', id: 'user-1' },
      message: 'Missing or insufficient permissions.',
      code: 'permission-denied',
    })
  })

  describe('riwayat tidak diputar ulang sebagai event', () => {
    it('snapshot cache kosong lalu snapshot server: dokumen riwayat tidak dikirim', () => {
      const listeners = captureListeners()
      const handler = jest.fn()

      loadRealtimeService().subscribeToUserStream('user-1', handler)
      listeners[0].onNext(fromCache([]))
      listeners[0].onNext(fromServer([eventDoc('lama-2'), eventDoc('lama-1')]))

      expect(handler).not.toHaveBeenCalled()
    })

    it('snapshot cache yang hanya memuat sebagian riwayat: sisanya dari server tetap riwayat', () => {
      const listeners = captureListeners()
      const handler = jest.fn()
      const lama1 = eventDoc('lama-1')
      const lama2 = eventDoc('lama-2')
      const lama3 = eventDoc('lama-3')

      loadRealtimeService().subscribeToUserStream('user-1', handler)
      listeners[0].onNext(fromCache([lama1]))
      listeners[0].onNext(fromServer([lama3, lama2, lama1], [lama3, lama2]))

      expect(handler).not.toHaveBeenCalled()
    })

    it('server yang membenarkan cache tanpa perubahan tetap menuntaskan hidrasi', () => {
      // Tanpa includeMetadataChanges, Firestore tidak pernah mengirim snapshot
      // yang hanya mengubah fromCache, sehingga listener tidak tahu kapan
      // riwayatnya lengkap.
      const listeners = captureListeners()
      const handler = jest.fn()
      const lama = eventDoc('lama', '2026-11-01T10:00:00.000Z')
      const baru = eventDoc('baru', '2026-11-01T10:01:00.000Z')

      loadRealtimeService().subscribeToUserStream('user-1', handler)
      listeners[0].onNext(fromCache([lama]))
      listeners[0].onNext(fromServer([lama], []))
      listeners[0].onNext(fromServer([baru, lama], [baru]))

      expect(listeners[0].options).toEqual({ includeMetadataChanges: true })
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ payload: { id: 'baru' } }))
    })
  })

  describe('langganan ulang setelah galat', () => {
    it('snapshot pertama listener baru adalah riwayat, termasuk event yang terlewat selama putus', () => {
      jest.useFakeTimers()
      const listeners = captureListeners()
      const handler = jest.fn()
      const lama1 = eventDoc('lama-1')
      const lama2 = eventDoc('lama-2')
      const selamaPutus = eventDoc('selama-putus', '2026-11-01T10:02:00.000Z')

      loadRealtimeService().subscribeToUserStream('user-1', handler)
      listeners[0].onNext(fromServer([lama2, lama1]))
      listeners[0].onError?.({ message: 'Stream dropped', code: 'unavailable' })
      jest.advanceTimersByTime(1000)
      listeners[1].onNext(fromServer([selamaPutus, lama2, lama1]))

      expect(listeners).toHaveLength(2)
      expect(handler).not.toHaveBeenCalled()
    })

    it('listener yang gagal sebelum sempat sinkron ke server tidak membuat langganan ulang memutar riwayat', () => {
      jest.useFakeTimers()
      const listeners = captureListeners()
      const handler = jest.fn()

      loadRealtimeService().subscribeToUserStream('user-1', handler)
      listeners[0].onNext(fromCache([]))
      listeners[0].onError?.({ message: 'Stream dropped', code: 'unavailable' })
      jest.advanceTimersByTime(1000)
      listeners[1].onNext(fromServer([eventDoc('lama-2'), eventDoc('lama-1')]))

      expect(handler).not.toHaveBeenCalled()
    })

    it('event yang benar-benar baru tetap tiba tepat sekali, sebelum dan sesudah langganan ulang', () => {
      jest.useFakeTimers()
      const listeners = captureListeners()
      const handler = jest.fn()
      const lama = eventDoc('lama', '2026-11-01T10:00:00.000Z')
      const baru1 = eventDoc('baru-1', '2026-11-01T10:01:00.000Z')
      const baru2 = eventDoc('baru-2', '2026-11-01T10:03:00.000Z')

      loadRealtimeService().subscribeToUserStream('user-1', handler)
      listeners[0].onNext(fromServer([lama]))
      listeners[0].onNext(fromServer([baru1, lama], [baru1]))
      listeners[0].onError?.({ message: 'Stream dropped', code: 'unavailable' })
      jest.advanceTimersByTime(1000)
      listeners[1].onNext(fromServer([baru1, lama]))
      listeners[1].onNext(fromServer([baru2, baru1, lama], [baru2]))
      listeners[1].onNext(fromServer([baru2, baru1, lama], [baru2]))

      expect(handler.mock.calls.map(([event]) => (event as { payload: { id: string } }).payload.id)).toEqual([
        'baru-1',
        'baru-2',
      ])
    })
  })

  describe('dokumen lama yang masuk ke jendela 20 terbaru setelah hidrasi', () => {
    const TERBARU = '2026-11-01T10:00:00.000Z'
    const SEPULUH_MENIT_SEBELUMNYA = '2026-11-01T09:50:00.000Z'
    const DUA_DETIK_SEBELUMNYA = '2026-11-01T09:59:58.000Z'
    const ms = (iso: string) => Date.parse(iso)

    const bentukCreatedAt: [string, (iso: string) => unknown][] = [
      ['string ISO', (iso) => iso],
      ['angka epoch ms', (iso) => ms(iso)],
      [
        'Timestamp Firestore',
        // Seperti Timestamp asli, toMillis membaca field-nya lewat `this`.
        (iso) => ({
          seconds: Math.floor(ms(iso) / 1000),
          nanoseconds: (ms(iso) % 1000) * 1_000_000,
          toMillis(this: { seconds: number; nanoseconds: number }) {
            return this.seconds * 1000 + this.nanoseconds / 1_000_000
          },
        }),
      ],
    ]

    it.each(bentukCreatedAt)('createdAt berbentuk %s: dokumen lama diabaikan', (_bentuk, ubah) => {
      const listeners = captureListeners()
      const handler = jest.fn()
      const terbaru = eventDoc('terbaru', ubah(TERBARU))
      const lama = eventDoc('lama-masuk-jendela', ubah(SEPULUH_MENIT_SEBELUMNYA))

      loadRealtimeService().subscribeToUserStream('user-1', handler)
      listeners[0].onNext(fromServer([terbaru]))
      listeners[0].onNext(fromServer([terbaru, lama], [lama]))

      expect(handler).not.toHaveBeenCalled()
    })

    it.each(bentukCreatedAt)('createdAt berbentuk %s: event yang tiba sedikit tidak berurutan tetap dikirim', (_bentuk, ubah) => {
      // Server menulis event berkelompok (batch 2 detik), jadi event yang dibuat
      // lebih dulu bisa tiba setelah event yang lebih baru.
      const listeners = captureListeners()
      const handler = jest.fn()
      const terbaru = eventDoc('terbaru', ubah(TERBARU))
      const terlambat = eventDoc('terlambat', ubah(DUA_DETIK_SEBELUMNYA))

      loadRealtimeService().subscribeToUserStream('user-1', handler)
      listeners[0].onNext(fromServer([terbaru]))
      listeners[0].onNext(fromServer([terbaru, terlambat], [terlambat]))

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ payload: { id: 'terlambat' } }))
    })
  })

  describe('indikator Live', () => {
    it('menyala begitu snapshot server pertama tiba, walau belum ada event baru', () => {
      const listeners = captureListeners()

      loadRealtimeService().subscribeToUserStream('user-1', jest.fn())
      const { statusRealtimeSaatIni } = require('../../src/services/statusRealtime')
      listeners[0].onNext(fromServer([eventDoc('lama')]))

      expect(statusRealtimeSaatIni()).toBe('terhubung')
    })

    it('tidak dinyalakan snapshot cache listener pengganti; snapshot servernya yang menyalakan', () => {
      jest.useFakeTimers()
      const listeners = captureListeners()

      loadRealtimeService().subscribeToUserStream('user-1', jest.fn())
      const { statusRealtimeSaatIni } = require('../../src/services/statusRealtime')
      listeners[0].onNext(fromServer([eventDoc('lama')]))
      listeners[0].onError?.({ message: 'Stream dropped', code: 'unavailable' })
      jest.advanceTimersByTime(1000)
      listeners[1].onNext(fromCache([eventDoc('lama')]))
      const statusSaatCache = statusRealtimeSaatIni()
      listeners[1].onNext(fromServer([eventDoc('lama')], []))

      expect(statusSaatCache).toBe('mencoba')
      expect(statusRealtimeSaatIni()).toBe('terhubung')
    })
  })
})
