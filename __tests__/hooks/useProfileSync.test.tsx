import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

import type { User } from '@/context/AuthContext';
import { useAuth } from '@/context/AuthContext';
import { useProfileSync } from '@/hooks/useProfileSync';
import { useOfflineQuery } from '@/hooks/queries';
import { realtimeService } from '@/services/RealtimeService';

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/services/RealtimeService', () => ({
  realtimeService: {
    subscribeToUserStream: jest.fn(),
  },
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
  const mockUseOfflineQuery = useOfflineQuery as jest.MockedFunction<typeof useOfflineQuery>;
  const mockSubscribeToUserStream = realtimeService.subscribeToUserStream as jest.MockedFunction<
    typeof realtimeService.subscribeToUserStream
  >;

  let addEventListenerSpy: jest.SpiedFunction<typeof AppState.addEventListener>;
  const updateUser = jest.fn<() => Promise<void>>();
  const refetch = jest.fn();
  const unsubscribeRealtime = jest.fn();
  const signIn = jest.fn(async () => {});
  const signOut = jest.fn(async () => {});
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
      signIn,
      signOut,
    });

    mockSubscribeToUserStream.mockReturnValue(unsubscribeRealtime);

    mockUseOfflineQuery.mockReturnValue({
      data: profileData,
      isPending: false,
      refetch,
    } as unknown as ReturnType<typeof useOfflineQuery>);
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
  });

  it('keeps passive consumers free of background sync side effects by default', () => {
    const { result } = renderHook(() => useProfileSync());

    expect(result.current.profileData).toEqual(profileData);
    expect(result.current.hasFeature('profile')).toBe(true);
    expect(mockSubscribeToUserStream).not.toHaveBeenCalled();
    expect(addEventListenerSpy).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('subscribes the explicit owner to the realtime user stream', async () => {
    renderHook(() => useProfileSync({ enableBackgroundSync: true }));

    expect(mockSubscribeToUserStream).toHaveBeenCalledWith('user-1', expect.any(Function));

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

  it('refetches when the user stream receives profile.refresh', () => {
    renderHook(() => useProfileSync({ enableBackgroundSync: true }));

    const streamHandler = mockSubscribeToUserStream.mock.calls[0]?.[1];
    expect(streamHandler).toBeDefined();

    streamHandler?.({
      type: 'profile.refresh',
      payload: { timestamp: '2026-04-10T00:00:00.000Z' },
      scope: { kind: 'user', id: 'user-1' },
    });

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('does not register background listeners for multiple passive readers', () => {
    renderHook(() => useProfileSync());
    renderHook(() => useProfileSync());

    expect(mockSubscribeToUserStream).not.toHaveBeenCalled();
    expect(addEventListenerSpy).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('cleans up realtime and app-state listeners when background sync is enabled', async () => {
    const remove = jest.fn();
    addEventListenerSpy.mockReturnValueOnce({ remove } as ReturnType<typeof AppState.addEventListener>);

    const { unmount } = renderHook(() => useProfileSync({ enableBackgroundSync: true }));

    await waitFor(() => {
      expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
    });

    unmount();

    expect(remove).toHaveBeenCalledTimes(1);
    expect(unsubscribeRealtime).toHaveBeenCalledTimes(1);
  });
});
