import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { useUserLocationWatcher } from '@/hooks/useUserLocationWatcher';

type FocusEffect = () => void | (() => void);

type PermissionFixture = {
  status: string;
  granted: boolean;
  canAskAgain: boolean;
  expires: string;
};

type PositionFixture = ReturnType<typeof positionAt>;

type WatcherFixture = { remove: () => void };

const mockRequestPermission = jest.fn<() => Promise<PermissionFixture>>();
const mockGetPermission = jest.fn<() => Promise<PermissionFixture>>();
const mockGetCurrentPosition = jest.fn<(options: unknown) => Promise<PositionFixture>>();
const mockWatchPosition =
  jest.fn<(options: unknown, onUpdate: (position: PositionFixture) => void) => Promise<WatcherFixture>>();
const mockRemoveWatcher = jest.fn();

// useFocusEffect asli butuh navigator. Tiruan ini mengikuti kontrak
// expo-router/build/useFocusEffect.js: efek jalan saat fokus, cleanup saat blur
// atau unmount, dan efek dijalankan ulang bila identitas fungsinya berganti.
// Fokus/blur dipicu tanpa unmount — kondisi layar tab yang tetap ter-mount.
const mockNavigationListeners = { focus: new Set<() => void>(), blur: new Set<() => void>() };
let mockIsFocused = false;

jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useFocusEffect: (effect: FocusEffect) => {
      useEffect(() => {
        let cleanup: void | (() => void);
        const onFocus = () => {
          cleanup = effect();
        };
        const onBlur = () => {
          cleanup?.();
          cleanup = undefined;
        };
        if (mockIsFocused) onFocus();
        mockNavigationListeners.focus.add(onFocus);
        mockNavigationListeners.blur.add(onBlur);
        return () => {
          cleanup?.();
          mockNavigationListeners.focus.delete(onFocus);
          mockNavigationListeners.blur.delete(onBlur);
        };
      }, [effect]);
    },
  };
});

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: () => mockRequestPermission(),
  getForegroundPermissionsAsync: () => mockGetPermission(),
  getCurrentPositionAsync: (options: unknown) => mockGetCurrentPosition(options),
  watchPositionAsync: (options: unknown, onUpdate: (position: PositionFixture) => void) =>
    mockWatchPosition(options, onUpdate),
}));

const GRANTED: PermissionFixture = { status: 'granted', granted: true, canAskAgain: true, expires: 'never' };
const DENIED: PermissionFixture = { status: 'denied', granted: false, canAskAgain: true, expires: 'never' };

const watcher: WatcherFixture = { remove: () => mockRemoveWatcher() };

function positionAt(latitude: number, longitude: number) {
  return {
    coords: {
      latitude,
      longitude,
      altitude: null,
      accuracy: 12,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: 1_760_000_000_000,
    mocked: false,
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

const flushPromises = () => new Promise<void>((resolve) => setImmediate(resolve));

async function focusScreen() {
  await act(async () => {
    mockIsFocused = true;
    mockNavigationListeners.focus.forEach((listener) => listener());
    await flushPromises();
  });
}

function blurScreen() {
  act(() => {
    mockIsFocused = false;
    mockNavigationListeners.blur.forEach((listener) => listener());
  });
}

describe('useUserLocationWatcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFocused = false;
    mockNavigationListeners.focus.clear();
    mockNavigationListeners.blur.clear();
    mockRequestPermission.mockResolvedValue(GRANTED);
    mockGetPermission.mockResolvedValue(GRANTED);
    mockGetCurrentPosition.mockResolvedValue(positionAt(-6.2, 106.8));
    mockWatchPosition.mockResolvedValue(watcher);
  });

  it('returns the current position as [longitude, latitude] once the screen is focused', async () => {
    const { result } = renderHook(() => useUserLocationWatcher());

    await focusScreen();

    expect(result.current).toEqual([106.8, -6.2]);
  });

  it('follows position updates while the screen stays focused', async () => {
    const { result } = renderHook(() => useUserLocationWatcher());
    await focusScreen();
    expect(mockWatchPosition).toHaveBeenCalledTimes(1);

    const onPositionUpdate = mockWatchPosition.mock.calls[0][1];
    act(() => onPositionUpdate(positionAt(-6.3, 106.9)));

    expect(result.current).toEqual([106.9, -6.3]);
  });

  it('keeps a single watcher while position updates re-render the screen', async () => {
    renderHook(() => useUserLocationWatcher());
    await focusScreen();
    expect(mockWatchPosition).toHaveBeenCalledTimes(1);

    const onPositionUpdate = mockWatchPosition.mock.calls[0][1];
    await act(async () => {
      onPositionUpdate(positionAt(-6.3, 106.9));
      await flushPromises();
    });

    expect(mockRemoveWatcher).not.toHaveBeenCalled();
    expect(mockWatchPosition).toHaveBeenCalledTimes(1);
  });

  it('stops watching when the screen loses focus even though it stays mounted', async () => {
    renderHook(() => useUserLocationWatcher());
    await focusScreen();

    blurScreen();

    expect(mockRemoveWatcher).toHaveBeenCalledTimes(1);
  });

  it('releases a watcher that finishes starting after the screen already lost focus', async () => {
    const pendingWatch = createDeferred<WatcherFixture>();
    mockWatchPosition.mockReturnValue(pendingWatch.promise);
    renderHook(() => useUserLocationWatcher());
    await focusScreen();

    blurScreen();
    await act(async () => {
      pendingWatch.resolve(watcher);
      await flushPromises();
    });

    expect(mockRemoveWatcher).toHaveBeenCalledTimes(1);
  });

  it('asks for permission and does not watch location when it is denied', async () => {
    mockRequestPermission.mockResolvedValue(DENIED);
    const { result } = renderHook(() => useUserLocationWatcher());

    await focusScreen();

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(mockWatchPosition).not.toHaveBeenCalled();
    expect(result.current).toBeNull();
  });

  it('prompts for permission only once and resumes watching when the screen is focused again', async () => {
    renderHook(() => useUserLocationWatcher());
    await focusScreen();
    blurScreen();

    await focusScreen();

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(mockWatchPosition).toHaveBeenCalledTimes(2);
  });
});
