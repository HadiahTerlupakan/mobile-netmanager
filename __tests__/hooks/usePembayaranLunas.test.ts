import { describe, expect, it } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { isMenungguPelunasan, usePembayaranLunas, type TagihanDipantau } from '@/hooks/usePembayaranLunas';

const tagihan = (status: string, gatewayStatus: string | null): TagihanDipantau => ({
  id: 'inv-1',
  invoiceNumber: 'INV-1',
  status,
  lastPayment: gatewayStatus ? { amount: 11100, gatewayStatus } : null,
});

describe('usePembayaranLunas', () => {
  it('melaporkan checkout yang menunggu lalu menjadi lunas', () => {
    const { result, rerender } = renderHook(({ daftar }: { daftar: TagihanDipantau[] }) => usePembayaranLunas(daftar), {
      initialProps: { daftar: [tagihan('OVERDUE', 'PENDING')] },
    });
    expect(result.current.lunas).toBeNull();

    rerender({ daftar: [tagihan('PAID', 'PAID')] });

    expect(result.current.lunas).toEqual({ nomorTagihan: 'INV-1', nominal: 11100, isLayananDipulihkan: false });
    act(() => result.current.tutup());
    expect(result.current.lunas).toBeNull();
  });

  it('tagihan yang sudah lunas saat layar dibuka tidak memunculkan lembar sukses', () => {
    const { result, rerender } = renderHook(({ daftar }: { daftar: TagihanDipantau[] }) => usePembayaranLunas(daftar), {
      initialProps: { daftar: [tagihan('PAID', 'PAID')] },
    });

    rerender({ daftar: [tagihan('PAID', 'PAID')] });

    expect(result.current.lunas).toBeNull();
  });

  // Webhook melunasi pembayaran sesaat sebelum tagihannya; polling yang
  // menangkap keadaan di antaranya dulu melepas tagihan dari pantauan, sehingga
  // lembar sukses tidak pernah muncul (PRORATE/1793404408844, 31 Okt 2026).
  it('tetap memantau tagihan yang pembayarannya lunas tetapi tagihannya belum', () => {
    const { result, rerender } = renderHook(({ daftar }: { daftar: TagihanDipantau[] }) => usePembayaranLunas(daftar), {
      initialProps: { daftar: [tagihan('OVERDUE', 'PENDING')] },
    });

    rerender({ daftar: [tagihan('OVERDUE', 'PAID')] });
    expect(result.current.lunas).toBeNull();
    rerender({ daftar: [tagihan('PAID', 'PAID')] });

    expect(result.current.lunas).toEqual({ nomorTagihan: 'INV-1', nominal: 11100, isLayananDipulihkan: false });
  });
});

describe('usePembayaranLunas — layanan yang dipulihkan', () => {
  type Props = { daftar: TagihanDipantau[]; status: string | undefined };
  const render = (initialProps: Props) =>
    renderHook(({ daftar, status }: Props) => usePembayaranLunas(daftar, status), { initialProps });

  it.each(['ISOLIR', 'NONAKTIF'])('pelanggan %s yang melunasi tagihan: layanannya dipulihkan', (status) => {
    const { result, rerender } = render({ daftar: [tagihan('OVERDUE', 'PENDING')], status });

    rerender({ daftar: [tagihan('PAID', 'PAID')], status });

    expect(result.current.lunas?.isLayananDipulihkan).toBe(true);
  });

  // Server memulihkan status begitu tagihan lunas; profil yang dimuat ulang
  // sebelum daftar tagihan membaca lunas sudah berstatus AKTIF.
  it('status yang sudah pulih sebelum tagihan terbaca lunas tetap dihitung dipulihkan', () => {
    const { result, rerender } = render({ daftar: [tagihan('OVERDUE', 'PENDING')], status: 'ISOLIR' });

    rerender({ daftar: [tagihan('OVERDUE', 'PAID')], status: 'AKTIF' });
    rerender({ daftar: [tagihan('PAID', 'PAID')], status: 'AKTIF' });

    expect(result.current.lunas?.isLayananDipulihkan).toBe(true);
  });

  it('status yang baru terbaca setelah checkout dibuat tetap diperhitungkan', () => {
    const daftarMenunggu = [tagihan('OVERDUE', 'PENDING')];
    const { result, rerender } = render({ daftar: daftarMenunggu, status: undefined });

    rerender({ daftar: daftarMenunggu, status: 'ISOLIR' });
    rerender({ daftar: [tagihan('PAID', 'PAID')], status: 'ISOLIR' });

    expect(result.current.lunas?.isLayananDipulihkan).toBe(true);
  });

  it('pelanggan AKTIF: layanannya tidak disebut dipulihkan', () => {
    const { result, rerender } = render({ daftar: [tagihan('OVERDUE', 'PENDING')], status: 'AKTIF' });

    rerender({ daftar: [tagihan('PAID', 'PAID')], status: 'AKTIF' });

    expect(result.current.lunas?.isLayananDipulihkan).toBe(false);
  });
});

describe('isMenungguPelunasan', () => {
  it.each([
    ['checkout menunggu dibayar', tagihan('OVERDUE', 'PENDING'), true],
    ['pembayaran lunas, tagihan belum dilunasi server', tagihan('OVERDUE', 'PAID'), true],
    ['tagihan sudah lunas', tagihan('PAID', 'PAID'), false],
    ['checkout gagal', tagihan('OVERDUE', 'FAILED'), false],
    ['belum pernah dibayar', tagihan('OVERDUE', null), false],
  ])('%s', (_kasus, data, harapan) => {
    expect(isMenungguPelunasan(data)).toBe(harapan);
  });
});
