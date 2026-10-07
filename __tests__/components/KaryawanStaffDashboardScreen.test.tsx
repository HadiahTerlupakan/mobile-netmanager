import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

/**
 * Beranda staff: kartu Hari ini, pengajuan izin/lembur, libur berikutnya, dan
 * menu kepegawaian yang berizin saja. Staff bukan teknisi maupun sales — tidak
 * ada work order, statistik tiket, barang, topologi, isolir, kinerja tim sales.
 */

const mockUseAuth = jest.fn();
const mockPush = jest.fn();
const mockInvalidate = jest.fn(async (_opsi: unknown) => undefined);
const mockRefetchProfile = jest.fn(async () => undefined);
const mockBeranda = jest.fn();
let mockPropsHariIni: { onBukaAbsensi: (() => void) | null; jamKerja: string | null } | null = null;
let mockPropsPengajuan: { aksi: { label: string; onTekan: () => void }[]; onBukaBaris: (jenis: string) => void } | null = null;

jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual<typeof import('@tanstack/react-query')>('@tanstack/react-query'),
  useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
}));
jest.mock('@/hooks/useProfileSync', () => ({
  useProfileSync: () => ({ profileData: undefined, refetch: mockRefetchProfile }),
}));
jest.mock('@/hooks/useBerandaStaff', () => ({
  useBerandaStaff: () => mockBeranda(),
  KUNCI_BERANDA_STAFF: [['attendance'], ['leave'], ['overtime'], ['holidays']],
}));
jest.mock('@/components/organisms/staff/KartuHariIniStaff', () => {
  const { Text } = require('react-native');
  return {
    KartuHariIniStaff: (props: NonNullable<typeof mockPropsHariIni>) => {
      mockPropsHariIni = props;
      return <Text>kartu-hari-ini</Text>;
    },
  };
});
jest.mock('@/components/organisms/staff/KartuPengajuanSaya', () => {
  const { Text } = require('react-native');
  return {
    KartuPengajuanSaya: (props: NonNullable<typeof mockPropsPengajuan>) => {
      mockPropsPengajuan = props;
      return <Text>kartu-pengajuan</Text>;
    },
  };
});
jest.mock('@/components/organisms/staff/KartuLiburBerikutnya', () => {
  const { Text } = require('react-native');
  return { KartuLiburBerikutnya: (props: { libur: { name: string } }) => <Text>{`libur:${props.libur.name}`}</Text> };
});
jest.mock('@/components/organisms/dashboard/BerandaModeCuti', () => {
  const { Text } = require('react-native');
  return { BerandaModeCuti: () => <Text>mode-cuti</Text> };
});
jest.mock('@/components/molecules/NotificationBell', () => ({ __esModule: true, default: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: unknown }) => children,
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));
jest.mock('@/hooks/queries/usePengesahan', () => ({ useRingkasanPengesahan: () => ({ data: undefined }) }));

import { KaryawanStaffDashboardScreen } from '@/components/screens/KaryawanStaffDashboardScreen';

const SEMUA_FITUR = [
  'm_dashboard',
  'm_absensi',
  'm_izin',
  'm_lembur',
  'm_holidays',
  'm_chat',
  'm_work_order',
  'm_topology',
  'm_barang_keluar',
  'm_pelanggan',
  'm_canvasing',
  'm_presurvei',
];

// Permukaan teknisi/sales yang tetap tertutup bagi staff. 'Canvasing' tidak lagi
// di sini: role berpersona STAFF bisa memegang `m_canvasing`, dan dulu izin itu
// tidak punya pintu sama sekali. Yang dijaga sekarang bukan ketiadaannya,
// melainkan bahwa ia muncul hanya bila izinnya ada — lihat test di bawah.
const MENU_BUKAN_STAFF = ['Request WO', 'Topology Map', 'Barang Keluar', 'Isolir', 'Presurvei'];

const staff = (features: string[], tambahan: Record<string, unknown> = {}) => ({
  user: { id: 'u-1', name: 'Siti', role: 'STAFF', employeeType: 'KARYAWAN', persona: 'STAFF', features, ...tambahan },
});

/** Model tampilan `useBerandaStaff` sesuai fitur pengguna. */
function modelBeranda(features: string[], tambahan: Record<string, unknown> = {}) {
  return {
    fitur: {
      absensi: features.includes('m_absensi'),
      izin: features.includes('m_izin'),
      lembur: features.includes('m_lembur'),
      libur: features.includes('m_holidays'),
    },
    absen: null,
    jamKerja: '09:00 – 17:00',
    liburHariIni: null,
    liburBerikutnya: null,
    pengajuan: [],
    jumlahMenunggu: 0,
    ...tambahan,
  };
}

function siapkan(features: string[], tambahanBeranda: Record<string, unknown> = {}, tambahanUser: Record<string, unknown> = {}) {
  mockUseAuth.mockReturnValue(staff(features, tambahanUser));
  mockBeranda.mockReturnValue(modelBeranda(features, tambahanBeranda));
}

describe('Beranda staff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPropsHariIni = null;
    mockPropsPengajuan = null;
  });

  it('menampilkan sapaan, kartu Hari ini, pengajuan, dan menu kepegawaian; menu teknisi/sales tidak ada', () => {
    siapkan(SEMUA_FITUR);

    const { getByText, queryByText } = render(<KaryawanStaffDashboardScreen />);

    expect(getByText('Siti')).toBeTruthy();
    expect(getByText('kartu-hari-ini')).toBeTruthy();
    expect(getByText('kartu-pengajuan')).toBeTruthy();
    for (const judul of ['Izin & Cuti', 'Lembur', 'Kalender Libur', 'Chat']) {
      expect(getByText(judul)).toBeTruthy();
    }
    for (const judul of MENU_BUKAN_STAFF) {
      expect(queryByText(judul)).toBeNull();
    }
    expect(queryByText('kartu-kinerja')).toBeNull();
  });

  it('Canvasing hanya muncul bila m_canvasing dimiliki', () => {
    siapkan(SEMUA_FITUR);
    expect(render(<KaryawanStaffDashboardScreen />).getByText('Canvasing')).toBeTruthy();

    siapkan(SEMUA_FITUR.filter((fitur) => fitur !== 'm_canvasing'));
    expect(render(<KaryawanStaffDashboardScreen />).queryByText('Canvasing')).toBeNull();
  });

  it('kartu Hari ini membuka Absensi bila berizin; tanpa m_absensi tombol absen tidak ada', () => {
    siapkan(SEMUA_FITUR);
    render(<KaryawanStaffDashboardScreen />);
    mockPropsHariIni?.onBukaAbsensi?.();
    expect(mockPush).toHaveBeenCalledWith('/(app)/absensi');

    siapkan(['m_izin']);
    render(<KaryawanStaffDashboardScreen />);
    expect(mockPropsHariIni?.onBukaAbsensi).toBeNull();
  });

  it('pengajuan: tombol hanya untuk fitur berizin, baris membuka layar jenisnya', () => {
    siapkan(['m_izin']);
    render(<KaryawanStaffDashboardScreen />);

    expect(mockPropsPengajuan?.aksi.map((a) => a.label)).toEqual(['Ajukan izin']);
    mockPropsPengajuan?.aksi[0].onTekan();
    mockPropsPengajuan?.onBukaBaris('LEMBUR');
    expect(mockPush.mock.calls).toEqual([['/(app)/izin/form'], ['/(app)/lembur']]);
  });

  it('tanpa izin & lembur kartu pengajuan tidak tampil', () => {
    siapkan(['m_absensi', 'm_chat']);

    const { queryByText } = render(<KaryawanStaffDashboardScreen />);

    expect(queryByText('kartu-pengajuan')).toBeNull();
  });

  it('libur berikutnya tampil bila ada', () => {
    siapkan(SEMUA_FITUR, {
      liburBerikutnya: { libur: { name: 'Hari Guru', date: '2026-11-25', isNational: false }, sisaHari: 54 },
    });

    const { getByText } = render(<KaryawanStaffDashboardScreen />);

    expect(getByText('libur:Hari Guru')).toBeTruthy();
  });

  it('menu tanpa izin disembunyikan (bukan dikunci)', () => {
    siapkan(['m_izin', 'm_chat']);

    const { getByText, queryByText } = render(<KaryawanStaffDashboardScreen />);

    expect(getByText('Izin & Cuti')).toBeTruthy();
    expect(getByText('Chat')).toBeTruthy();
    expect(queryByText('Lembur')).toBeNull();
    expect(queryByText('Kalender Libur')).toBeNull();
  });

  it('tanpa satu pun izin menu: bagian Menu Cepat tidak tampil', () => {
    siapkan(['m_dashboard']);

    const { queryByText } = render(<KaryawanStaffDashboardScreen />);

    expect(queryByText('Menu Cepat')).toBeNull();
  });

  it('menu berizin membuka layarnya', () => {
    siapkan(['m_lembur']);
    const { getByText } = render(<KaryawanStaffDashboardScreen />);

    fireEvent.press(getByText('Lembur'));

    expect(mockPush.mock.calls).toEqual([['/(app)/lembur']]);
  });

  it('sedang cuti: menampilkan Beranda mode cuti saja', () => {
    siapkan(SEMUA_FITUR, {}, { isOnLeave: true });

    const { getByText, queryByText } = render(<KaryawanStaffDashboardScreen />);

    expect(getByText('mode-cuti')).toBeTruthy();
    expect(queryByText('kartu-hari-ini')).toBeNull();
    expect(queryByText('Menu Cepat')).toBeNull();
  });

  it('tarik-untuk-segarkan memuat ulang absen, izin, lembur, libur, dan profil', async () => {
    siapkan(SEMUA_FITUR);
    const { getByTestId } = render(<KaryawanStaffDashboardScreen />);

    await act(async () => {
      await getByTestId('beranda-staff-gulir').props.refreshControl.props.onRefresh();
    });

    expect(mockInvalidate.mock.calls).toEqual([
      [{ queryKey: ['attendance'] }],
      [{ queryKey: ['leave'] }],
      [{ queryKey: ['overtime'] }],
      [{ queryKey: ['holidays'] }],
    ]);
    expect(mockRefetchProfile).toHaveBeenCalledTimes(1);
  });
});
