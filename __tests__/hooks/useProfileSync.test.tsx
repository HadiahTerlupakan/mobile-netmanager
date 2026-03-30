import { renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

import type { User } from '@/context/AuthContext';
import { useAuth } from '@/context/AuthContext';
import { useSocketEvent } from '@/context/SocketContext';
import { SOCKET_EVENTS } from '@/context/socketTypes';
import { useProfileSync } from '@/hooks/useProfileSync';
import { useOfflineQuery } from '@/hooks/queries';

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/context/SocketContext', () => ({
  useSocketEvent: jest.fn(),
}));

jest.mock('@/hooks/queries', () => ({
  useOfflineQuery: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('useProfileSync', () => {
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
  const mockUseSocketEvent = useSocketEvent as jest.MockedFunction<typeof useSocketEvent>;
  const mockUseOfflineQuery = useOfflineQuery as jest.MockedFunction<typeof useOfflineQuery>;

  let addEventListenerSpy: jest.SpiedFunction<typeof AppState.addEventListener>;
  const updateUser = jest.fn();
  const refetch = jest.fn();
  const currentUser = {
    id: 'user-1',
    role: 'USER',
    name: 'Old Name',
    features: ['dashboard'],
    image: 'old-image',
    isOnLeave: false,
    requiresFaceVerification: false,
  } as User;
  const profileData = {
    name: 'New Name',
    email: 'user@example.com',
    image: 'new-image',
    features: ['dashboard', 'profile'],
    isOnLeave: true,
    requiresFaceVerification: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    addEventListenerSpy = jest.spyOn(AppState, 'addEventListener').mockImplementation(
      () => ({ remove: jest.fn() }) as ReturnType<typeof AppState.addEventListener>
    );

    mockUseAuth.mockReturnValue({
      user: currentUser,
      token: 'token-123',
      updateUser,
      isLoading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    const mockQueryResult = {
      data: profileData,
      isPending: false,
      refetch,
    };

    mockUseOfflineQuery.mockReturnValue(mockQueryResult as unknown as ReturnType<typeof useOfflineQuery>);
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
  });

  it('keeps passive consumers free of background sync side effects by default', () => {
    const { result } = renderHook(() => useProfileSync());

    expect(result.current.profileData).toEqual(profileData);
    expect(result.current.hasFeature('profile')).toBe(true);
    expect(mockUseSocketEvent).toHaveBeenCalledWith(
      SOCKET_EVENTS.PROFILE_REFRESH,
      expect.any(Function),
      { enabled: false }
    );
    expect(addEventListenerSpy).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('enables background sync only for the explicit owner', async () => {
    renderHook(() => useProfileSync({ enableBackgroundSync: true }));

    expect(mockUseSocketEvent).toHaveBeenCalledWith(
      SOCKET_EVENTS.PROFILE_REFRESH,
      expect.any(Function),
      { enabled: true }
    );

    await waitFor(() => {
      expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(updateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-1',
          name: 'New Name',
          image: 'new-image',
          features: ['dashboard', 'profile'],
          isOnLeave: true,
          requiresFaceVerification: true,
        })
      );
    });
  });

  it('does not register background listeners for multiple passive readers', () => {
    renderHook(() => useProfileSync());
    renderHook(() => useProfileSync());

    expect(mockUseSocketEvent).toHaveBeenCalledTimes(2);
    expect(mockUseSocketEvent).toHaveBeenNthCalledWith(
      1,
      SOCKET_EVENTS.PROFILE_REFRESH,
      expect.any(Function),
      { enabled: false }
    );
    expect(mockUseSocketEvent).toHaveBeenNthCalledWith(
      2,
      SOCKET_EVENTS.PROFILE_REFRESH,
      expect.any(Function),
      { enabled: false }
    );
    expect(addEventListenerSpy).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('registers and cleans up app-state listener when background sync is enabled', () => {
    const remove = jest.fn();
    addEventListenerSpy.mockReturnValueOnce({ remove } as ReturnType<typeof AppState.addEventListener>);

    const { unmount } = renderHook(() => useProfileSync({ enableBackgroundSync: true }));

    return waitFor(() => {
      expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
    }).then(() => {
      unmount();

      expect(remove).toHaveBeenCalledTimes(1);
    });
  });
});
