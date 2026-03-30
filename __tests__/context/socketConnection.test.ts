import type { User } from '@/context/AuthContext';
import { getSocketConnectionState, SOCKET_TRANSPORTS } from '@/context/socketConnection';

describe('socketConnection', () => {
  it('derives connection identity only from token, tenant, user id, and role', () => {
    const initialUser = {
      id: 'user-1',
      role: 'MITRA_SALES',
      name: 'Initial Name',
      features: ['dashboard'],
    } as User;

    const refreshedUser = {
      ...initialUser,
      name: 'Refreshed Name',
      features: ['dashboard', 'profile'],
      image: 'https://cdn.example.com/avatar.png',
    } as User;

    const initialState = getSocketConnectionState({
      token: 'token-123',
      tenantUrl: 'http://192.168.1.2:3000/',
      user: initialUser,
    });

    const refreshedState = getSocketConnectionState({
      token: 'token-123',
      tenantUrl: 'http://192.168.1.2:3000/',
      user: refreshedUser,
    });

    expect(initialState).toEqual({
      baseUrl: 'http://192.168.1.2:3000',
      canConnect: true,
      userId: 'user-1',
      userRole: 'MITRA_SALES',
    });
    expect(refreshedState).toEqual(initialState);
  });

  it('marks connection unavailable when auth identity is incomplete', () => {
    expect(
      getSocketConnectionState({
        token: 'token-123',
        tenantUrl: 'http://192.168.1.2:3000',
        user: null,
      })
    ).toEqual({
      baseUrl: 'http://192.168.1.2:3000',
      canConnect: false,
      userId: null,
      userRole: 'USER',
    });
  });

  it('prefers websocket before polling for mobile connections', () => {
    expect(SOCKET_TRANSPORTS).toEqual(['websocket', 'polling']);
  });
});
