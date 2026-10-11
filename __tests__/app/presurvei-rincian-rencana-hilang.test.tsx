import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';

/**
 * Rencana yang ditunjuk notifikasi penugasan tapi sudah tidak ada.
 *
 * Layar ini adalah tujuan deep-link notifikasi "Penugasan kunjungan baru", dan
 * rencana bisa dibatalkan sebelum sales sempat membukanya. Dulu cabang
 * galatnya mengembalikan `QueryErrorState` telanjang: tanpa kepala layar
 * (jadi tanpa tombol kembali), tanpa tab bar, dan satu-satunya tombol
 * "Coba Lagi" mengulang 404 yang tidak akan pernah sembuh — jalan buntu.
 * Terlihat di QA perangkat persona SALES.
 */

const mockBack = jest.fn();
const mockRefetch = jest.fn();
const mockHasilRincian: { data: unknown; isPending: boolean; error: unknown } = {
  data: undefined,
  isPending: false,
  error: null,
};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'rencana-hilang' }),
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
}));
jest.mock('@/hooks/useFeatureGuard', () => ({ useFeatureGuard: () => true }));
jest.mock('@/hooks/queries/usePresurveiRencana', () => ({
  useRincianRencana: () => ({ ...mockHasilRincian, refetch: mockRefetch }),
}));
jest.mock('@/hooks/queries/usePresurveiKegiatan', () => ({
  useKegiatanMenungguKirim: () => ({ data: [] }),
}));
jest.mock('@/hooks/useIsOnline', () => ({ useIsOnline: () => true }));
jest.mock('@/hooks/presurvei/useLingkupRencana', () => ({
  useLingkupRencana: () => ({ isPemberiTugas: false }),
}));
jest.mock('@/hooks/presurvei/useMutasiRencana', () => ({
  useBatalkanRencana: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('lucide-react-native', () => ({
  AlertTriangle: 'AlertTriangle',
  ChevronLeft: 'ChevronLeft',
  RefreshCw: 'RefreshCw',
}));
jest.mock('twrnc', () => require('twrnc-kosong'));

const galatHttp = (status: number) => ({ isAxiosError: true, response: { status } });

const renderLayar = (error: unknown) => {
  mockHasilRincian.error = error;
  const RincianRencanaScreen = require('../../app/(app)/presurvei/rencana/[id]/index').default;
  return render(<RincianRencanaScreen />);
};

describe('rincian rencana yang gagal dimuat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tetap memberi tombol kembali, bukan layar buntu', () => {
    const { getByLabelText } = renderLayar(galatHttp(404));

    expect(getByLabelText('Kembali')).toBeTruthy();
  });

  it('mengatakan rencananya sudah tidak ada dan tidak menawarkan muat ulang', () => {
    const { getByText, queryByLabelText } = renderLayar(galatHttp(404));

    expect(
      getByText('Rencana ini sudah tidak ada — mungkin sudah dibatalkan atau dihapus.'),
    ).toBeTruthy();
    expect(queryByLabelText('Coba lagi')).toBeNull();
  });

  // Kegagalan jaringan berbeda: memuat ulang memang bisa menolong.
  it('menawarkan muat ulang untuk kegagalan selain 404', () => {
    const { getByText, getByLabelText } = renderLayar(galatHttp(500));

    expect(getByText('Rencana gagal dimuat.')).toBeTruthy();
    expect(getByLabelText('Coba lagi')).toBeTruthy();
  });
});
