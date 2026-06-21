import { beforeEach, describe, expect, it, jest } from '@jest/globals'

type SnapshotDoc = {
  id: string
  data: () => {
    type?: string
    payload?: unknown
    scope?: { kind: string; id: string }
    createdAt?: string
  }
}

type SnapshotChange = {
  type: string
  doc: SnapshotDoc
}

type Snapshot = {
  docs: SnapshotDoc[]
  docChanges: () => SnapshotChange[]
}

type SnapshotListener = (snapshot: Snapshot) => void

type ListenerError = {
  message: string
  code?: string
}

const mockWarn = jest.fn<(message: string, meta: unknown) => void>()
const mockCollection = jest.fn<(firestore: unknown, path: string) => string>()
const mockGetFirestore = jest.fn<(app: unknown) => { name: string }>()
const mockLimit = jest.fn<(value: number) => string>()
const mockOnSnapshot = jest.fn<(
  queryRef: unknown,
  onNext: SnapshotListener,
  onError?: (error: ListenerError) => void
) => () => void>()
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
    const unsubscribe = jest.fn()
    const handler = jest.fn()

    mockOnSnapshot.mockImplementation((_queryRef, onNext) => {
      onNext({
        docs: [
          {
            id: 'existing-event',
            data: () => ({
              type: 'inventory.update',
              payload: { type: 'masuk' },
            }),
          },
        ],
        docChanges: () => [
          {
            type: 'added',
            doc: {
              id: 'existing-event',
              data: () => ({
                type: 'inventory.update',
                payload: { type: 'masuk' },
              }),
            },
          },
        ],
      })

      return unsubscribe
    })

    const realtimeService = loadRealtimeService()
    const cleanup = realtimeService.subscribeToUserStream('user-1', handler)

    expect(handler).not.toHaveBeenCalled()
    cleanup()
    expect(unsubscribe).toHaveBeenCalled()
  })

  it('emits only newly added documents after hydration', () => {
    const handler = jest.fn()
    let snapshotListener: SnapshotListener | undefined

    mockOnSnapshot.mockImplementation((_queryRef, onNext) => {
      snapshotListener = onNext
      return jest.fn()
    })

    const realtimeService = loadRealtimeService()
    realtimeService.subscribeToUserStream('user-1', handler)

    snapshotListener?.({
      docs: [
        {
          id: 'existing-event',
          data: () => ({
            type: 'inventory.update',
            payload: { type: 'masuk' },
          }),
        },
      ],
      docChanges: () => [
        {
          type: 'added',
          doc: {
            id: 'existing-event',
            data: () => ({
              type: 'inventory.update',
              payload: { type: 'masuk' },
            }),
          },
        },
      ],
    })

    snapshotListener?.({
      docs: [],
      docChanges: () => [
        {
          type: 'added',
          doc: {
            id: 'new-event',
            data: () => ({
              type: 'inventory.update',
              payload: { type: 'keluar' },
            }),
          },
        },
        {
          type: 'added',
          doc: {
            id: 'new-event',
            data: () => ({
              type: 'inventory.update',
              payload: { type: 'keluar' },
            }),
          },
        },
      ],
    })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({
      type: 'inventory.update',
      payload: { type: 'keluar' },
      scope: { kind: 'user', id: 'user-1' },
      createdAt: undefined,
    })
  })

  it('logs Firestore listener errors without throwing', () => {
    const unsubscribe = jest.fn()

    mockOnSnapshot.mockImplementation((_queryRef, _onNext, onError) => {
      onError?.({
        message: 'Missing or insufficient permissions.',
        code: 'permission-denied',
      })

      return unsubscribe
    })

    const realtimeService = loadRealtimeService()
    const cleanup = realtimeService.subscribeToUserStream('user-1', jest.fn())

    cleanup()
    expect(unsubscribe).toHaveBeenCalled()
    expect(mockWarn).toHaveBeenCalledWith('[Realtime] Firestore subscription failed', {
      scope: { kind: 'user', id: 'user-1' },
      message: 'Missing or insufficient permissions.',
      code: 'permission-denied',
    })
  })
})
