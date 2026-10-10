import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';

import { tentukanPersona } from '@/utils/persona';
import { susunTabKaryawanStaff } from '@/utils/tabKaryawanStaff';

/**
 * Alur role "Staff Kantor" dari muatan login sampai permukaan yang terlihat.
 *
 * `jalurMasukStaff.test.ts` menguji penyusun menu & tab satu per satu, tetapi
 * selalu dengan `role: 'SALES'` — role STAFF yang sebenarnya belum pernah
 * dijalani aplikasi dalam pengujian. Berkas ini memasok muatan login apa adanya
 * lalu membiarkan rantai nyata bekerja: persona → multiplexer Beranda → layar
 * staff → QuickMenu, plus tab bar. Hanya batas jaringan yang dimock.
 *
 * `MUATAN_LOGIN_STAFF` wajib sama dengan yang dikirim server untuk role STAFF.
 * Sisi server dikunci `netmanager/tests/modules/users/MobileEmployeeAuthService.persona-staff.test.ts`
 * dan daftar izinnya berasal dari `staff-kantor` di `netmanager/lib/role-templates.ts`.
 */

const FITUR_STAFF: string[] = [
  'm_dashboard',
  'm_absensi',
  'm_lembur',
  'm_izin',
  'm_holidays',
  'm_chat',
];

const MUATAN_LOGIN_STAFF = {
  id: 'user-staff',
  name: 'Siti Nurhaliza',
  email: 'staff@example.com',
  role: 'STAFF',
  persona: 'STAFF' as const,
  employeeType: 'KARYAWAN' as const,
  isSales: false,
  isOnLeave: false,
  features: FITUR_STAFF,
};

const mockUseAuth = jest.fn();
const mockPush = jest.fn();

jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

// Batas jaringan: beranda staff tidak boleh menyentuh API dalam pengujian.
// `useBerandaStaff` sendiri tetap asli supaya `punyaFitur` benar-benar dijalani.
jest.mock('@/hooks/queries/useApiQuery', () => ({
  useApiQuery: () => ({ data: undefined }),
}));
jest.mock('@/hooks/useStatusAbsenHariIni', () => ({
  useStatusAbsenHariIni: () => ({ data: undefined }),
}));
// Pengesahan bergantung data server (ada surat untuk saya atau tidak); di sini
// diperlakukan "tidak ada surat" supaya tile-nya tidak ikut mengaburkan daftar.
jest.mock('@/hooks/useStatusMenuCepat', () => ({
  useStatusMenuCepat: () => ({ idTersembunyi: ['pengesahan'], lencana: {} }),
}));
jest.mock('@/hooks/useProfileSync', () => ({
  useProfileSync: () => ({ profileData: { startWorkTime: '08:00', endWorkTime: '17:00' }, refetch: jest.fn() }),
}));
// Layar persona lain dimock sebagai penanda: multiplexer Beranda mengimpor
// kelimanya, dan hanya jalur staff yang diuji di sini.
jest.mock('@/components/screens/KaryawanSalesDashboardScreen', () => {
  const { Text } = require('react-native');
  return { KaryawanSalesDashboardScreen: () => <Text>layar-karyawan-sales</Text> };
});
jest.mock('@/components/screens/KaryawanTeknisiDashboardScreen', () => {
  const { Text } = require('react-native');
  return { KaryawanTeknisiDashboardScreen: () => <Text>layar-karyawan-teknisi</Text> };
});
jest.mock('@/components/screens/MitraSalesDashboardScreen', () => {
  const { Text } = require('react-native');
  return { MitraSalesDashboardScreen: () => <Text>layar-mitra-sales</Text> };
});
jest.mock('@/components/screens/MitraTeknisiDashboardScreen', () => {
  const { Text } = require('react-native');
  return { MitraTeknisiDashboardScreen: () => <Text>layar-mitra-teknisi</Text> };
});

// Ikon adalah daun render; dimock agar tidak menarik expo-modules-core.
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('@/hooks/useSegarkanBeranda', () => ({
  KUNCI_BERANDA_STAFF: [],
  useSegarkanBeranda: () => ({ isMenyegarkan: false, segarkan: jest.fn() }),
}));

const renderBeranda = (user: Record<string, unknown>) => {
  mockUseAuth.mockReturnValue({ user, token: 'token-uji' });
  const Dashboard = require('../../app/(app)/dashboard').default;
  return render(<Dashboard />);
};

/** Label tile menu cepat yang hanya milik teknisi/sales. */
const PERMUKAAN_BUKAN_STAFF = ['Work Order', 'Topologi', 'Barang Keluar', 'Canvasing', 'Presurvei'];

describe('alur role Staff Kantor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('memetakan muatan login role STAFF ke persona staff karyawan', () => {
    expect(tentukanPersona(MUATAN_LOGIN_STAFF)).toBe('KARYAWAN_STAFF');
  });

  it('membuka keempat tab staff tanpa ada yang terkunci', () => {
    const tab = susunTabKaryawanStaff(MUATAN_LOGIN_STAFF);

    expect(tab.map((t) => t.rute)).toEqual(['dashboard', 'absensi', 'chat/index', 'profile']);
    expect(tab.every((t) => t.isTerkunci === false)).toBe(true);
  });

  // Regresi: aturan tab pernah bisa dilonggarkan menjadi "selalu tampil",
  // dan muatan berizin penuh tidak akan memperlihatkannya. Absensi & Chat
  // wajib hilang begitu izinnya dicabut.
  it('menghilangkan tab Absensi dan Chat begitu izinnya dicabut', () => {
    const tab = susunTabKaryawanStaff({
      ...MUATAN_LOGIN_STAFF,
      features: ['m_dashboard', 'm_izin', 'm_lembur', 'm_holidays'],
    });

    expect(tab.map((t) => t.rute)).toEqual(['dashboard', 'profile']);
  });

  it('merender Beranda staff beserta kartu pengajuan dan jam kerja', () => {
    const { getByText, getByTestId } = renderBeranda({ ...MUATAN_LOGIN_STAFF });

    expect(getByTestId('beranda-staff-gulir')).toBeTruthy();
    expect(getByText('Siti Nurhaliza')).toBeTruthy();
    expect(getByText('Jam kerja 08:00 – 17:00')).toBeTruthy();
    expect(getByText('Ajukan izin')).toBeTruthy();
    expect(getByText('Ajukan lembur')).toBeTruthy();
  });

  it('menawarkan menu kepegawaian dan menutup permukaan teknisi', () => {
    const { getByText, queryByText } = renderBeranda({ ...MUATAN_LOGIN_STAFF });

    for (const label of ['Izin & Cuti', 'Lembur', 'Kalender Libur', 'Chat']) {
      expect(getByText(label)).toBeTruthy();
    }
    for (const label of PERMUKAAN_BUKAN_STAFF) {
      expect(queryByText(label)).toBeNull();
    }
  });

  // Regresi: izin yang tidak diberikan tidak boleh menyisakan tile atau kartu.
  it('menyembunyikan kartu pengajuan saat izin & lembur tidak diberikan', () => {
    const { queryByText } = renderBeranda({
      ...MUATAN_LOGIN_STAFF,
      features: ['m_dashboard', 'm_absensi', 'm_chat'],
    });

    expect(queryByText('Ajukan izin')).toBeNull();
    expect(queryByText('Ajukan lembur')).toBeNull();
    expect(queryByText('Izin & Cuti')).toBeNull();
    expect(queryByText('Lembur')).toBeNull();
  });

  it('menampilkan Beranda mode cuti saja ketika staff sedang cuti', () => {
    const { queryByTestId } = renderBeranda({ ...MUATAN_LOGIN_STAFF, isOnLeave: true });

    expect(queryByTestId('beranda-staff-gulir')).toBeNull();
  });
});
