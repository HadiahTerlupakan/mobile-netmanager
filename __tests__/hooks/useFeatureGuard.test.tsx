import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useFeatureGuard } from '@/hooks/useFeatureGuard';
import { useAuth, type AuthContextType, type User } from '@/context/AuthContext';
import { AppFeature } from '@/constants/features';

const mockReplace = jest.fn();
const mockAlert = jest.fn();
const mockSignIn: AuthContextType['signIn'] = jest.fn(async () => undefined);
const mockSignOut: AuthContextType['signOut'] = jest.fn(async () => undefined);
const mockUpdateUser: AuthContextType['updateUser'] = jest.fn(async () => undefined);

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

function createAuthState(user: User | null): AuthContextType {
  return {
    user,
    token: user ? 'token' : null,
    isLoading: false,
    signIn: mockSignIn,
    signOut: mockSignOut,
    updateUser: mockUpdateUser,
  };
}

describe('useFeatureGuard', () => {
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

  beforeEach(() => {
    jest.clearAllMocks();
    Alert.alert = mockAlert;
  });

  it('melewatkan super admin tanpa redirect', async () => {
    mockUseAuth.mockReturnValue(createAuthState({
      id: 'user-1',
      tenantId: 'tenant-1',
      name: 'Super Admin',
      email: 'super@example.com',
      role: 'SUPER_ADMIN',
      features: [],
    }));

    renderHook(() => useFeatureGuard(AppFeature.BARANG));

    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
      expect(mockAlert).not.toHaveBeenCalled();
    });
  });

  it('mengizinkan mitra hanya jika feature tersedia', async () => {
    mockUseAuth.mockReturnValue(createAuthState({
      id: 'mitra-1',
      tenantId: 'tenant-1',
      name: 'Mitra Teknisi',
      email: 'mitra@example.com',
      role: 'MITRA',
      employeeType: 'MITRA_TEKNISI',
      features: [AppFeature.WORK_ORDER],
    }));

    renderHook(() => useFeatureGuard(AppFeature.WORK_ORDER));

    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
      expect(mockAlert).not.toHaveBeenCalled();
    });
  });

  it('menolak mitra tanpa feature yang dibutuhkan', async () => {
    mockUseAuth.mockReturnValue(createAuthState({
      id: 'mitra-1',
      tenantId: 'tenant-1',
      name: 'Mitra Teknisi',
      email: 'mitra@example.com',
      role: 'MITRA',
      employeeType: 'MITRA_TEKNISI',
      features: [AppFeature.WORK_ORDER],
    }));

    renderHook(() => useFeatureGuard(AppFeature.BARANG));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        'Akses Terbatas',
        'Anda tidak memiliki izin untuk mengakses halaman ini.',
        [{ text: 'OK', onPress: expect.any(Function) }]
      );
    });

    const alertButtons = mockAlert.mock.calls[0][2] as Array<{ onPress?: () => void }>;
    alertButtons[0].onPress?.();

    expect(mockReplace).toHaveBeenCalledWith('/(app)/dashboard');
  });

  it('redirect langsung ke dashboard app canonical saat pesan guard dimatikan', async () => {
    mockUseAuth.mockReturnValue(createAuthState({
      id: 'mitra-1',
      tenantId: 'tenant-1',
      name: 'Mitra Teknisi',
      email: 'mitra@example.com',
      role: 'MITRA',
      employeeType: 'MITRA_TEKNISI',
      features: [AppFeature.WORK_ORDER],
    }));

    renderHook(() => useFeatureGuard(AppFeature.BARANG, false));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(app)/dashboard');
    });
  });

  it('redirect ke login auth saat user belum login', async () => {
    mockUseAuth.mockReturnValue(createAuthState(null));

    renderHook(() => useFeatureGuard(AppFeature.BARANG, false));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
    });
  });
});
