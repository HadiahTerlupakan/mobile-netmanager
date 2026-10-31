import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';

/**
 * Pelanggan yang sesinya dicabut server (mis. DISMANTLE) dulu jatuh ke layar
 * login tanpa penjelasan. Kini layar login menampilkan alasannya di spanduk.
 */

const mockPost = jest.fn<(url: string, body: unknown, config: unknown) => Promise<unknown>>();
const mockPresentAppError = jest.fn();

jest.mock('@/components/atoms/FormInput', () => ({ FormInput: () => null }));
jest.mock('@/context/AuthContext', () => ({ useAuth: () => ({ signIn: jest.fn() }) }));
jest.mock('@/hooks/useFormWithValidation', () => ({
  useFormWithValidation: () => ({
    control: {},
    handleValidatedSubmit: (callback: (data: unknown) => unknown) => () => callback({ email: 'budi', password: 'rahasia' }),
    formState: { errors: {} },
  }),
}));
jest.mock('@/services/BiometricService', () => ({
  biometricService: {
    isAvailable: jest.fn(() => Promise.resolve(false)),
    isBiometricEnabled: jest.fn(() => Promise.resolve(false)),
    getSupportedTypes: jest.fn(() => Promise.resolve([])),
  },
}));
jest.mock('@/services/CredentialStorageService', () => ({
  credentialStorageService: { saveCredentials: jest.fn(), clearCredentials: jest.fn(), hasStoredCredentials: jest.fn() },
}));
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { post: (url: string, body: unknown, config: unknown) => mockPost(url, body, config) },
}));
jest.mock('@/utils/errorPresenter', () => ({
  presentAppError: (...args: unknown[]) => mockPresentAppError(...args),
  presentErrorMessage: jest.fn(),
}));
jest.mock('@/utils/logger', () => ({ logger: { auth: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('@/constants/appVersion', () => ({ CURRENT_VERSION_CODE: 35, CURRENT_VERSION_NAME: '1.0.34', getOtaUpdateId: () => null }));
jest.mock('expo-router', () => ({ Link: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));
jest.mock('@assets/images/icon.png', () => 1, { virtual: true });

import { PESAN_SESI_BERAKHIR_BAWAAN, PesanSesiBerakhir } from '@/services/PesanSesiBerakhir';
import LoginScreen from '../../app/(auth)/login';

function galatLogin(status: number, data: unknown) {
  return Object.assign(new AxiosError(`status ${status}`), { response: { status, data } });
}

describe('pesan sesi di layar login', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockPresentAppError.mockReset();
    PesanSesiBerakhir.hapus();
  });

  it('tanpa sesi yang diakhiri tidak ada spanduk', () => {
    const layar = render(<LoginScreen />);

    expect(layar.queryByText(PESAN_SESI_BERAKHIR_BAWAAN)).toBeNull();
  });

  it('sesi yang diakhiri server menampilkan alasannya dan bisa ditutup', () => {
    PesanSesiBerakhir.tandaiBerakhir();
    const layar = render(<LoginScreen />);

    expect(layar.getByText(PESAN_SESI_BERAKHIR_BAWAAN)).toBeTruthy();
    fireEvent.press(layar.getByLabelText('Tutup pesan'));

    expect(layar.queryByText(PESAN_SESI_BERAKHIR_BAWAAN)).toBeNull();
    expect(PesanSesiBerakhir.baca()).toBeNull();
  });

  it('login yang ditolak 403 menampilkan pesan server di spanduk', async () => {
    const alasan = 'Layanan Anda sudah diberhentikan. Hubungi customer service.';
    mockPost.mockRejectedValue(galatLogin(403, { success: false, error: alasan, code: 'UNAUTHORIZED' }));
    const layar = render(<LoginScreen />);

    fireEvent.press(layar.getByLabelText('Tombol masuk'));

    await waitFor(() => expect(layar.getByText(alasan)).toBeTruthy());
    expect(mockPresentAppError).not.toHaveBeenCalled();
  });
});
