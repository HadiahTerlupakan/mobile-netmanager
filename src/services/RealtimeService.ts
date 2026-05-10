import { addDoc, collection, getFirestore, limit, onSnapshot, orderBy, query } from 'firebase/firestore'

import { getMobileFirebaseApp } from '@/services/firebaseApp'
import { logger } from '@/utils/logger'

export type RealtimeScopeKind = 'user' | 'department' | 'workorder' | 'ticket' | 'chat' | 'admin'

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
    case 'chat':
      return `chats/${scope.id}/events`
    case 'admin':
      return `admin/streams/${scope.id}/events`
  }
}

class RealtimeService {
  connect(_options: ConnectOptions): void {
    getMobileFirebaseApp()
  }

  disconnect(): void {
    // Listener cleanup is owned by each subscription.
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
    const firestore = getFirestore(getMobileFirebaseApp())
    const channelQuery = query(
      collection(firestore, buildScopeChannel(scope)),
      orderBy('createdAt', 'desc'),
      limit(20)
    )
    const seenDocIds = new Set<string>()
    let isHydrated = false

    return onSnapshot(
      channelQuery,
      (snapshot) => {
        if (!isHydrated) {
          snapshot.docs.forEach((doc) => {
            seenDocIds.add(doc.id)
          })
          isHydrated = true
          return
        }

        snapshot.docChanges().forEach((change) => {
          if (change.type !== 'added' || seenDocIds.has(change.doc.id)) {
            return
          }

          seenDocIds.add(change.doc.id)
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
      }
    )
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
      case 'chat':
      case 'admin':
        return { kind, id }
      default:
        return null
    }
  }
}

export const realtimeService = new RealtimeService()
