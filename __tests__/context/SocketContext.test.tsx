import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ token: null, user: null, isLoading: false }),
}));
jest.mock('@/context/TenantContext', () => ({
  useTenant: () => ({ tenantUrl: null, isLoading: false }),
}));
jest.mock('@/context/socketConnection', () => ({
  getSocketConnectionState: () => ({ canConnect: false }),
}));
jest.mock('@/lib/queryClient', () => ({
  queryClient: { invalidateQueries: jest.fn() },
}));
jest.mock('@/services/PresenceService', () => ({
  presenceService: { startPresence: jest.fn() },
}));
jest.mock('@/services/RealtimeService', () => ({
  realtimeService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    subscribeToUserStream: jest.fn(),
    subscribeToScope: jest.fn(),
    emitToRoom: jest.fn(),
  },
}));
jest.mock('@/utils/EventManager', () => ({
  eventManager: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
}));
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    socket: jest.fn(),
  },
}));

import {
  getEventSubscriptionNames,
  subscribeToEventNames,
} from '@/context/SocketContext';
import { SOCKET_EVENTS } from '@/context/socketTypes';

describe('SocketContext event aliases', () => {
  it('subscribes canonical socket events together with their legacy aliases', () => {
    expect(getEventSubscriptionNames(SOCKET_EVENTS.WORKORDER_UPDATE)).toEqual([
      'workorder.update',
      'workorder:update',
    ]);

    expect(getEventSubscriptionNames('ticket.reply')).toEqual([
      'ticket.reply',
      'ticket:reply',
    ]);

    expect(getEventSubscriptionNames('profile.refresh')).toEqual([
      'profile.refresh',
      'profile:refresh',
    ]);
  });

  it('unsubscribes the exact same canonical and legacy event names', () => {
    const subscribeToEvent = jest.fn().mockImplementation((_event: string, _handler: () => void) => {
      return jest.fn();
    });

    const cleanup = subscribeToEventNames(subscribeToEvent, SOCKET_EVENTS.NOTIFICATION_NEW, jest.fn());

    expect(subscribeToEvent).toHaveBeenCalledTimes(2);
    expect(subscribeToEvent).toHaveBeenCalledWith('notification.new', expect.any(Function));
    expect(subscribeToEvent).toHaveBeenCalledWith('notification:new', expect.any(Function));

    cleanup();

    const unsubscribeFns = subscribeToEvent.mock.results.map((result) => result.value as jest.Mock);
    expect(unsubscribeFns).toHaveLength(2);
    expect(unsubscribeFns[0]).toHaveBeenCalledTimes(1);
    expect(unsubscribeFns[1]).toHaveBeenCalledTimes(1);
  });
});
