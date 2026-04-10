import { getDatabase, onDisconnect, ref, serverTimestamp, set } from 'firebase/database'

import { getMobileFirebaseApp } from '@/services/firebaseApp'

interface PresencePayload {
  role: string
  tenantId?: string | null
}

function buildPresencePath(userId: string): string {
  return `presence/users/${userId}`
}

class PresenceService {
  startPresence(userId: string, payload: PresencePayload): () => void {
    const database = getDatabase(getMobileFirebaseApp())
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
