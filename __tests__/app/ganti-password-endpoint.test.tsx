import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';

/**
 * Investor dan karyawan memakai form ganti password yang sama, tetapi token
 * investor beraudience sendiri sehingga endpoint profil karyawan menolaknya
 * dengan 401. Tes ini mengunci endpoint yang dipakai masing-masing layar.
 */

const mockPost = jest.fn();
const mockMutation = jest.fn();

jest.mock('@/services/api', () => ({ __esModule: true, default: { post: mockPost } }));
jest.mock('@/hooks/queries', () => ({
  useMutation: (opsi: { mutationFn: (data: unknown) => unknown }) => {
    mockMutation(opsi);
    return { mutate: jest.fn(), isPending: false };
  },
}));
jest.mock('@/hooks/useFormWithValidation', () => ({
  useFormWithValidation: () => ({
    control: {},
    handleValidatedSubmit: (fn: unknown) => fn,
    formState: { errors: {} },
  }),
}));
jest.mock('@/components/atoms/FormPasswordInput', () => ({ FormPasswordInput: 'FormPasswordInput' }));
jest.mock('@/components/atoms/ScreenErrorBoundary', () => ({
  ScreenErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('lucide-react-native', () => ({ ArrowLeft: 'ArrowLeft', Save: 'Save' }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@/theme', () => ({ useTemaPersona: () => ({ tw: require('twrnc-kosong') }) }));
jest.mock('twrnc', () => require('twrnc-kosong'));

function endpointYangDipakai(Layar: React.ComponentType) {
  mockMutation.mockClear();
  render(<Layar />);
  const opsi = mockMutation.mock.calls[0][0] as { mutationFn: (data: unknown) => unknown };
  opsi.mutationFn({ currentPassword: 'a', newPassword: 'b', confirmPassword: 'b' });
  return mockPost.mock.calls.at(-1)?.[0];
}

describe('endpoint layar ganti password', () => {
  it('investor memakai endpoint investor', () => {
    const Layar = require('@/../app/(investor)/ganti-password').default;

    expect(endpointYangDipakai(Layar)).toBe('/api/mobile/investor/password');
  });

  it('karyawan tetap memakai endpoint profil karyawan', () => {
    const Layar = require('@/../app/(app)/change-password').default;

    expect(endpointYangDipakai(Layar)).toBe('/api/mobile/profile/password');
  });
});
