import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { useAuth } from './AuthContext';
import { getSocketConnectionState } from './socketConnection';
import { useTenant } from './TenantContext';
import { queryClient } from '@/lib/queryClient';
import { presenceService } from '@/services/PresenceService';
import { realtimeService, RealtimeScope, RealtimeStreamEvent } from '@/services/RealtimeService';
import { eventManager } from '@/utils/EventManager';
import { logger } from '../utils/logger';

type EventHandler<T = unknown> = (data: T) => void;

interface SocketContextType {
  socket: null;
  isConnected: boolean;
  lastError: string | null;
  reconnect: () => void;
  subscribeToEvent: <T>(event: string, handler: EventHandler<T>) => () => void;
  joinRoom: (room: string) => () => void;
  emitEvent: (event: string, payload: unknown) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  lastError: null,
  reconnect: () => {},
  subscribeToEvent: () => () => {},
  joinRoom: () => () => {},
  emitEvent: () => {},
});

interface SocketProviderProps {
  children: ReactNode;
}

const LEGACY_TO_CANONICAL_EVENT: Record<string, string> = {
  'notification:new': 'notification.new',
  'notification:count': 'notification.count',
  'workorder:new': 'workorder.new',
  'workorder:update': 'workorder.update',
  'workorder:assigned': 'workorder.assigned',
  'workorder:activity': 'workorder.activity',
  'profile:refresh': 'profile.refresh',
  'announcement:new': 'announcement.new',
  'ticket:new': 'ticket.new',
  'ticket:message': 'ticket.message',
  'ticket:reply': 'ticket.reply',
};

const CANONICAL_TO_LEGACY_EVENTS = Object.entries(LEGACY_TO_CANONICAL_EVENT).reduce<Record<string, string[]>>(
  (accumulator, [legacyEvent, canonicalEvent]) => {
    accumulator[canonicalEvent] = [...(accumulator[canonicalEvent] ?? []), legacyEvent];
    return accumulator;
  },
  {}
);

function getCanonicalEventName(event: string): string {
  return LEGACY_TO_CANONICAL_EVENT[event] ?? event;
}

export function getEventSubscriptionNames(event: string): string[] {
  const canonicalEvent = getCanonicalEventName(event);

  return Array.from(new Set([canonicalEvent, ...(CANONICAL_TO_LEGACY_EVENTS[canonicalEvent] ?? [])]));
}

function getEventDispatchNames(event: string): string[] {
  const canonicalEvent = getCanonicalEventName(event);

  return Array.from(
    new Set([event, canonicalEvent, ...(CANONICAL_TO_LEGACY_EVENTS[canonicalEvent] ?? [])])
  );
}

function parseRoomScope(room: string): RealtimeScope | null {
  const [kind, ...rest] = room.split(':');
  const id = rest.join(':');

  if (!kind || !id) {
    return null;
  }

  switch (kind) {
    case 'user':
    case 'department':
    case 'workorder':
    case 'ticket':
    case 'chat':
    case 'admin':
      return { kind, id };
    default:
      return null;
  }
}

function getRoomFromPayload(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null || !('room' in payload)) {
    return null;
  }

  const room = (payload as { room?: unknown }).room;
  return typeof room === 'string' ? room : null;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const { token, user } = useAuth();
  const { tenantUrl } = useTenant();
  const userId = user?.id ?? null;
  const userRole = user?.role || 'USER';
  const connectionState = useMemo(
    () => getSocketConnectionState({ token, tenantUrl, user: userId ? { id: userId, role: userRole } : null }),
    [tenantUrl, token, userId, userRole]
  );

  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userUnsubscribeRef = useRef<(() => void) | null>(null);
  const presenceStopRef = useRef<(() => void) | null>(null);
  const listenerMapRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const joinedRoomCountsRef = useRef<Map<string, number>>(new Map());
  const roomUnsubscribersRef = useRef<Map<string, () => void>>(new Map());
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const setConnectionState = useCallback((nextValue: boolean) => {
    if (!isMountedRef.current) {
      return;
    }

    setIsConnected(nextValue);
  }, []);

  const setConnectionError = useCallback((message: string | null) => {
    if (!isMountedRef.current) {
      return;
    }

    setLastError(message);
  }, []);

  const dispatchEvent = useCallback((event: string, payload: unknown) => {
    getEventDispatchNames(event).forEach((eventName) => {
      const handlers = listenerMapRef.current.get(eventName);

      if (!handlers) {
        return;
      }

      handlers.forEach((handler) => {
        handler(payload);
      });
    });
  }, []);

  const handleRealtimeEvent = useCallback(
    (event: RealtimeStreamEvent) => {
      const eventName = getCanonicalEventName(event.type);

      if (eventName === 'notification.new') {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }

      dispatchEvent(eventName, event.payload);
    },
    [dispatchEvent]
  );

  const unsubscribeRoom = useCallback((room: string) => {
    const unsubscribe = roomUnsubscribersRef.current.get(room);

    if (!unsubscribe) {
      return;
    }

    unsubscribe();
    roomUnsubscribersRef.current.delete(room);
  }, []);

  const subscribeRoom = useCallback(
    (room: string) => {
      if (roomUnsubscribersRef.current.has(room)) {
        return;
      }

      const scope = parseRoomScope(room);

      if (!scope) {
        return;
      }

      logger.socket(`Joining room: ${room}`);

      const unsubscribe = realtimeService.subscribeToScope(scope, handleRealtimeEvent);
      roomUnsubscribersRef.current.set(room, () => {
        logger.socket(`Leaving room: ${room}`);
        unsubscribe();
      });
    },
    [handleRealtimeEvent]
  );

  const cleanupConnection = useCallback(() => {
    const hadActiveConnection = Boolean(
      userUnsubscribeRef.current || presenceStopRef.current || roomUnsubscribersRef.current.size > 0
    );

    userUnsubscribeRef.current?.();
    userUnsubscribeRef.current = null;

    presenceStopRef.current?.();
    presenceStopRef.current = null;

    roomUnsubscribersRef.current.forEach((unsubscribe) => {
      unsubscribe();
    });
    roomUnsubscribersRef.current.clear();

    if (hadActiveConnection) {
      realtimeService.disconnect();
    }

    setConnectionState(false);
  }, [setConnectionState]);

  const connect = useCallback(() => {
    if (!connectionState.canConnect || !token || !userId) {
      logger.socket('No token, user, or tenant, skipping connection');
      return;
    }

    try {
      realtimeService.connect({
        token,
        userId,
        userRole,
        tenantUrl,
      });

      userUnsubscribeRef.current = realtimeService.subscribeToUserStream(userId, handleRealtimeEvent);
      presenceStopRef.current = presenceService.startPresence(userId, { role: userRole });

      joinedRoomCountsRef.current.forEach((count, room) => {
        if (count > 0) {
          subscribeRoom(room);
        }
      });

      setConnectionState(true);
      setConnectionError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Realtime connection failed';
      logger.error('[WS] Connection error:', message);
      setConnectionError(message);
      setConnectionState(false);
    }
  }, [connectionState.canConnect, handleRealtimeEvent, setConnectionError, setConnectionState, subscribeRoom, tenantUrl, token, userId, userRole]);

  useEffect(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      cleanupConnection();
      connect();
    }, 500);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      cleanupConnection();
    };
  }, [cleanupConnection, connect]);

  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    cleanupConnection();
    connect();
  }, [cleanupConnection, connect]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && connectionState.canConnect && !userUnsubscribeRef.current) {
        logger.socket('App active, attempting reconnect...');
        reconnect();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    eventManager.addListener('socket', handleAppStateChange, () => subscription.remove());

    return () => {
      eventManager.removeListener('socket', handleAppStateChange);
    };
  }, [connectionState.canConnect, reconnect]);

  const subscribeToEvent = useCallback(<T,>(event: string, handler: EventHandler<T>) => {
    const handlers = listenerMapRef.current.get(event) ?? new Set<EventHandler>();
    handlers.add(handler as EventHandler);
    listenerMapRef.current.set(event, handlers);

    return () => {
      const currentHandlers = listenerMapRef.current.get(event);

      if (!currentHandlers) {
        return;
      }

      currentHandlers.delete(handler as EventHandler);

      if (currentHandlers.size === 0) {
        listenerMapRef.current.delete(event);
      }
    };
  }, []);

  const joinRoom = useCallback(
    (room: string) => {
      if (!room) {
        return () => {};
      }

      const nextCount = (joinedRoomCountsRef.current.get(room) ?? 0) + 1;
      joinedRoomCountsRef.current.set(room, nextCount);

      if (userUnsubscribeRef.current && nextCount === 1) {
        subscribeRoom(room);
      }

      return () => {
        const currentCount = joinedRoomCountsRef.current.get(room) ?? 0;

        if (currentCount <= 1) {
          joinedRoomCountsRef.current.delete(room);
          unsubscribeRoom(room);
          return;
        }

        joinedRoomCountsRef.current.set(room, currentCount - 1);
      };
    },
    [subscribeRoom, unsubscribeRoom]
  );

  const emitEvent = useCallback((event: string, payload: unknown) => {
    if (!userUnsubscribeRef.current) {
      return;
    }

    const room = getRoomFromPayload(payload);

    if (!room) {
      return;
    }

    void realtimeService.emitToRoom(room, event, payload);
  }, []);

  const value = useMemo(
    () => ({
      socket: null,
      isConnected,
      lastError,
      reconnect,
      subscribeToEvent,
      joinRoom,
      emitEvent,
    }),
    [emitEvent, isConnected, joinRoom, lastError, reconnect, subscribeToEvent]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

interface UseSocketEventOptions {
  enabled?: boolean;
}

export function subscribeToEventNames<T>(
  subscribeToEvent: <U>(event: string, handler: (data: U) => void) => () => void,
  event: string,
  handler: (data: T) => void,
) {
  const subscriptionNames = getEventSubscriptionNames(event);
  const unsubscribe = subscriptionNames.map((eventName) =>
    subscribeToEvent(eventName, (data: T) => {
      handler(data);
    })
  );

  return () => {
    unsubscribe.forEach((cleanup) => cleanup());
  };
}

export function useSocketEvent<T>(event: string, handler: (data: T) => void, options: UseSocketEventOptions = {}) {
  const { subscribeToEvent } = useSocket();
  const handlerRef = useRef(handler);
  const enabled = options.enabled ?? true;

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    return subscribeToEventNames(subscribeToEvent, event, (data: T) => {
      handlerRef.current(data);
    });
  }, [enabled, event, subscribeToEvent]);
}

export function useSocketRoom(room: string) {
  const { joinRoom } = useSocket();

  useEffect(() => {
    if (!room) {
      return;
    }

    return joinRoom(room);
  }, [joinRoom, room]);
}

export function useSocketEmit() {
  const { emitEvent } = useSocket();

  return useCallback(
    (event: string, payload: unknown) => {
      emitEvent(event, payload);
    },
    [emitEvent]
  );
}
