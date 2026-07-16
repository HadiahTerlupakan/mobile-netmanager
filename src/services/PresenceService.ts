import { getDatabase, onDisconnect, ref, serverTimestamp, set } from 'firebase/database'

import { getMobileFirebaseApp } from '@/services/firebaseApp'
import { logger } from '@/utils/logger'

interface PresencePayload {
  role: string
  tenantId?: string | null
}

function buildPresencePath(userId: string): string {
  return `presence/users/${userId}`
}

class PresenceService {
  startPresence(userId: string, payload: PresencePayload): () => void {
    let database: ReturnType<typeof getDatabase>
    try {
      database = getDatabase(getMobileFirebaseApp())
    } catch (err) {
      logger.warn('[Presence] Firebase unavailable, presence disabled', err)
      return () => { /* noop */ }
    }
    const presenceRef = ref(database, buildPresencePath(userId))

    void set(presenceRef, {
      userId,
      isOnline: true,
      role: payload.role,
      tenantId: payload.tenantId ?? null,
      source: 'mobile',
      updatedAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
    })

    void onDisconnect(presenceRef).set({
      userId,
      isOnline: false,
      role: payload.role,
      tenantId: payload.tenantId ?? null,
      source: 'mobile',
      updatedAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
    })

    return () => {
      void set(presenceRef, {
        userId,
        isOnline: false,
        role: payload.role,
        tenantId: payload.tenantId ?? null,
        source: 'mobile',
        updatedAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
      })
    }
  }
}

export const presenceService = new PresenceService()
