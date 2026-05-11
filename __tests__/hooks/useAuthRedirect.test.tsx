// @ts-nocheck
import { renderHook, act } from '@testing-library/react-native'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const mockAddBreadcrumb = jest.fn()
const mockReplace = jest.fn()
const mockRouter = { replace: mockReplace }

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}))

jest.mock('@/services/ErrorReportingService', () => ({
  errorReportingService: {
    addBreadcrumb: mockAddBreadcrumb,
  },
}))

jest.mock('@/utils/logger', () => ({
  logger: {
    auth: jest.fn(),
  },
}))

function loadUseAuthRedirect() {
  return require('@/hooks/useAuthRedirect').useAuthRedirect
}

describe('useAuthRedirect', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  it('redirects unauthenticated user from protected route to login', () => {
    const useAuthRedirect = loadUseAuthRedirect()

    renderHook(() => useAuthRedirect(null, ['(app)', 'dashboard'], false))

    act(() => {
      jest.advanceTimersByTime(150)
    })

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login')
  })

  it('redirects authenticated user from auth route to employee dashboard', () => {
    const useAuthRedirect = loadUseAuthRedirect()
    const user = {
      id: 'user-1',
      tenantId: 'tenant-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'USER',
    }

    renderHook(() => useAuthRedirect(user, ['(auth)', 'login'], false))

    act(() => {
      jest.advanceTimersByTime(150)
    })

    expect(mockReplace).toHaveBeenCalledWith('/(app)/dashboard')
  })

  it('does not redirect while loading', () => {
    const useAuthRedirect = loadUseAuthRedirect()

    renderHook(() => useAuthRedirect(null, ['(app)', 'dashboard'], true))

    act(() => {
      jest.advanceTimersByTime(150)
    })

    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('does not re-run redirect effect when the segments array changes but the top-level group stays the same', () => {
    const useAuthRedirect = loadUseAuthRedirect()
    const user = {
      id: 'user-1',
      tenantId: 'tenant-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'USER',
    }

    const { rerender } = renderHook(({ segments }) => useAuthRedirect(user, segments, false), {
      initialProps: { segments: ['(app)', 'dashboard'] },
    })

    act(() => {
      jest.advanceTimersByTime(150)
    })

    expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1)

    rerender({ segments: ['(app)', 'profile'] })

    act(() => {
      jest.advanceTimersByTime(150)
    })

    expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1)
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
