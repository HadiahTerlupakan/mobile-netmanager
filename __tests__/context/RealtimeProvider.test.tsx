import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act, render } from '@testing-library/react-native';

const mockAuthState = {
  token: null as string | null,
  user: null as { id: string; role: string } | null,
};
const mockTenantState = {
  tenantUrl: null as string | null,
};
const mockConnectionState = {
  canConnect: false,
};

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

jest.mock('@/context/TenantContext', () => ({
  useTenant: () => mockTenantState,
}));

jest.mock('@/context/socketConnection', () => ({
  getSocketConnectionState: () => mockConnectionState,
}));

jest.mock('@/services/PresenceService', () => ({
  presenceService: {
    startPresence: jest.fn(),
  },
}));

jest.mock('@/services/RealtimeService', () => ({
  realtimeService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
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

import { RealtimeProvider } from '@/context/RealtimeProvider';
import { presenceService } from '@/services/PresenceService';
import { realtimeService } from '@/services/RealtimeService';
import { logger } from '@/utils/logger';

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthState.token = null;
  mockAuthState.user = null;
  mockTenantState.tenantUrl = null;
  mockConnectionState.canConnect = false;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('RealtimeProvider', () => {
  it('connects realtime and starts presence when auth and tenant are ready', async () => {
    mockAuthState.token = 'token-1';
    mockAuthState.user = { id: 'user-1', role: 'USER' };
    mockTenantState.tenantUrl = 'https://tenant.test';
    mockConnectionState.canConnect = true;
    (presenceService.startPresence as jest.Mock).mockReturnValue(jest.fn());

    render(
      <RealtimeProvider>
        <React.Fragment />
      </RealtimeProvider>
    );

    await act(async () => {});

    expect(realtimeService.connect).toHaveBeenCalledWith({
      token: 'token-1',
      userId: 'user-1',
      userRole: 'USER',
      tenantUrl: 'https://tenant.test',
    });
    expect(presenceService.startPresence).toHaveBeenCalledWith('user-1', { role: 'USER' });
  });

  it('does not surface missing Firebase config as a startup error', async () => {
    mockAuthState.token = 'token-1';
    mockAuthState.user = { id: 'user-1', role: 'USER' };
    mockTenantState.tenantUrl = 'https://tenant.test';
    mockConnectionState.canConnect = true;
    (realtimeService.connect as jest.Mock).mockImplementation(() => {
      throw new Error('Firebase mobile config is incomplete');
    });

    render(
      <RealtimeProvider>
        <React.Fragment />
      </RealtimeProvider>
    );

    await act(async () => {});

    expect(realtimeService.connect).toHaveBeenCalledTimes(1);
    expect(presenceService.startPresence).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });
});
