import { describe, expect, it } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { usePembayaranLunas, type TagihanDipantau } from '@/hooks/usePembayaranLunas';

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

    expect(result.current.lunas).toEqual({ nomorTagihan: 'INV-1', nominal: 11100 });
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
});
