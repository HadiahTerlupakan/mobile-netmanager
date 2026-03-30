import React from 'react';
import { act, render } from '@testing-library/react-native';

import { SocketProvider } from '@/context/SocketContext';

const mockIo = jest.fn();
const mockSocket = {
  connected: false,
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  removeAllListeners: jest.fn(),
};

const authState = {
  token: 'token-123',
  user: {
    id: 'user-1',
    role: 'USER',
    name: 'Initial Name',
    features: ['dashboard'],
  },
};

jest.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => mockIo(...args),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    token: authState.token,
    user: authState.user,
    isLoading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
    updateUser: jest.fn(),
  }),
}));

jest.mock('@/context/TenantContext', () => ({
  useTenant: () => ({
    tenantUrl: 'http://192.168.1.2:3000',
    isLoading: false,
    error: null,
    setTenant: jest.fn(),
    clearTenant: jest.fn(),
  }),
}));

jest.mock('@/lib/queryClient', () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
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

jest.mock('@/utils/EventManager', () => ({
  eventManager: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
}));

describe('SocketProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    authState.user = {
      id: 'user-1',
      role: 'USER',
      name: 'Initial Name',
      features: ['dashboard'],
    };
    mockIo.mockReturnValue(mockSocket);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('does not recreate the socket when non-identity user fields change', () => {
    const { rerender, unmount } = render(
      <SocketProvider>
        <></>
      </SocketProvider>
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockIo).toHaveBeenCalledTimes(1);

    authState.user = {
      ...authState.user,
      name: 'Updated Name',
      features: ['dashboard', 'profile'],
    };

    rerender(
      <SocketProvider>
        <></>
      </SocketProvider>
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockIo).toHaveBeenCalledTimes(1);

    unmount();
  });
});
