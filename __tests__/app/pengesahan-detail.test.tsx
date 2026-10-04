import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import type { DetailPengesahanSaya } from '@/types/pengesahan';

const mockPush = jest.fn();
const mockDetail = jest.fn<(id: string) => unknown>();
const mockLihat = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'd-1' }),
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: { children: unknown }) => children }));
jest.mock('@/hooks/queries/usePengesahan', () => ({ useDetailPengesahan: (id: string) => mockDetail(id) }));
jest.mock('@/hooks/pengesahan/useLihatDokumenPengesahan', () => ({
  useLihatDokumenPengesahan: () => ({ mutate: mockLihat, isPending: false }),
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import RuteDetailPengesahan from '../../app/(app)/pengesahan/[id]';

const SURAT: DetailPengesahanSaya = {
  id: 'd-1',
  number: 'SP/2026/001',
  title: 'Surat tugas instalasi',
  status: 'SENT',
  mySignerStatus: 'VIEWED',
  canSign: true,
  signerCount: 2,
  signedCount: 1,
  expiresAt: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  description: 'Penugasan tim lapangan',
  sourceFileName: 'surat-tugas.pdf',
  hasSignedFile: false,
  canViewDocument: true,
  cancelReason: null,
  signers: [
    { id: 's-1', name: 'Direktur', role: 'Direktur', status: 'SIGNED', signedAt: '2026-10-02T03:00:00.000Z', isMe: false },
    { id: 's-2', name: 'Budi', role: 'Staff', status: 'VIEWED', signedAt: null, isMe: true },
  ],
};

const kueri = (surat: DetailPengesahanSaya | undefined, error: unknown = null) => ({
  data: surat,
  error,
  isPending: false,
  isError: error !== null,
  isRefetching: false,
  refetch: jest.fn(),
});

describe('Detail pengesahan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('menampilkan ringkasan, kemajuan, penanda "Anda", dan aksi bila giliran saya', () => {
    mockDetail.mockReturnValue(kueri(SURAT));
    const { getByText } = render(<RuteDetailPengesahan />);

    expect(mockDetail).toHaveBeenCalledWith('d-1');
    expect(getByText('Surat tugas instalasi')).toBeTruthy();
    expect(getByText('1 dari 2 sudah tanda tangan')).toBeTruthy();
    expect(getByText('Anda')).toBeTruthy();

    fireEvent.press(getByText('Tanda tangani'));
    expect(mockPush).toHaveBeenCalledWith('/(app)/pengesahan/tanda-tangan/d-1');
    fireEvent.press(getByText('Tolak'));
    expect(mockPush).toHaveBeenCalledWith('/(app)/pengesahan/tolak/d-1');
    fireEvent.press(getByText('Lihat dokumen'));
    expect(mockLihat).toHaveBeenCalledTimes(1);
  });

  it('surat sah: tanpa tombol tanda tangan / tolak, tombol dokumen menjadi dokumen sah', () => {
    mockDetail.mockReturnValue(kueri({ ...SURAT, status: 'COMPLETED', canSign: false, mySignerStatus: 'SIGNED', hasSignedFile: true }));
    const { getByText, queryByText } = render(<RuteDetailPengesahan />);

    expect(queryByText('Tanda tangani')).toBeNull();
    expect(queryByText('Tolak')).toBeNull();
    expect(getByText('Lihat dokumen sah')).toBeTruthy();
    expect(getByText('Surat sah. Semua pihak sudah tanda tangan.')).toBeTruthy();
  });

  // Server menolak dokumen surat yang gugur; tombolnya tidak boleh ditawarkan.
  it('surat dibatalkan: tanpa tombol dokumen maupun tanda tangan', () => {
    mockDetail.mockReturnValue(kueri({ ...SURAT, status: 'CANCELLED', canSign: false, canViewDocument: false, mySignerStatus: 'DECLINED' }));
    const { queryByText } = render(<RuteDetailPengesahan />);

    expect(queryByText('Lihat dokumen')).toBeNull();
    expect(queryByText('Tanda tangani')).toBeNull();
  });

  // Surat ditarik saat layar terbuka: data lama di cache tidak boleh tetap tampil.
  it('404 saat memuat ulang: data lama disembunyikan, tampil surat tidak ditemukan', () => {
    mockDetail.mockReturnValue(kueri(SURAT, { response: { status: 404 } }));
    const { getByText, queryByText } = render(<RuteDetailPengesahan />);

    expect(getByText('Surat tidak ditemukan')).toBeTruthy();
    expect(queryByText('Surat tugas instalasi')).toBeNull();
    expect(queryByText('Tanda tangani')).toBeNull();
  });

  it('gangguan jaringan tanpa data: pesan gagal memuat', () => {
    mockDetail.mockReturnValue(kueri(undefined, new Error('Network Error')));
    const { getByText } = render(<RuteDetailPengesahan />);

    expect(getByText('Gagal memuat surat')).toBeTruthy();
  });

  it('surat tidak ditemukan (404 / bukan milik saya): keadaan kosong', () => {
    mockDetail.mockReturnValue(kueri(undefined));
    const { getByText } = render(<RuteDetailPengesahan />);

    expect(getByText('Surat tidak ditemukan')).toBeTruthy();
  });
});
