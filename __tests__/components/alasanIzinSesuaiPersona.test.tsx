import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';

/**
 * Alasan yang dijanjikan dua dialog izin harus benar untuk pembacanya.
 *
 * Keduanya ditulis untuk teknisi dan tidak pernah menyesuaikan diri: staff
 * kantor dijanjikan "Work order baru yang ditugaskan ke Anda" sebelum dialog
 * notifikasi, dan diminta lokasi latar belakang dengan alasan "Penugasan work
 * order ke teknisi terdekat". Keduanya pemberitahuan yang tidak akan pernah ia
 * terima. Untuk pengungkapan lokasi ini juga soal kepatuhan: Google Play
 * menuntut alasan izin sensitif yang akurat.
 */

const mockUseAuth = jest.fn();

jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('twrnc', () => require('twrnc-kosong'));
jest.mock('@/theme', () => ({
  useTemaPersona: () => ({
    tw: require('twrnc-kosong'),
    warna: { utama: '#0f766e', utamaKuat: '#115e59', utamaGaris: '#99f6e4' },
  }),
}));
jest.mock('lucide-react-native', () => ({
  Bell: 'Bell',
  Clock: 'Clock',
  ClipboardList: 'ClipboardList',
  MessageCircle: 'MessageCircle',
  MapPin: 'MapPin',
  ShieldCheck: 'ShieldCheck',
}));

const FITUR_STAFF = ['m_dashboard', 'm_absensi', 'm_lembur', 'm_izin', 'm_holidays', 'm_chat'];
const FITUR_TEKNISI = [...FITUR_STAFF, 'm_work_order'];

const ALASAN_WORK_ORDER_NOTIFIKASI = 'Work order baru yang ditugaskan ke Anda';
const ALASAN_WORK_ORDER_LOKASI = 'Penugasan work order ke teknisi terdekat';

const renderDialogNotifikasi = (features: string[]) => {
  mockUseAuth.mockReturnValue({ user: { id: 'u1', role: 'STAFF', features } });
  const {
    PermintaanIzinNotifikasi,
  } = require('@/components/organisms/notifikasi/PermintaanIzinNotifikasi');
  return render(
    <PermintaanIzinNotifikasi visible onSetuju={jest.fn()} onTolak={jest.fn()} />,
  );
};

const renderDialogLokasi = (features: string[]) => {
  mockUseAuth.mockReturnValue({ user: { id: 'u1', role: 'STAFF', features } });
  const {
    LocationDisclosureModal,
  } = require('@/components/organisms/attendance/LocationDisclosureModal');
  return render(
    <LocationDisclosureModal visible onAccept={jest.fn()} onReject={jest.fn()} />,
  );
};

describe('alasan dialog izin mengikuti izin pengguna', () => {
  it('tidak menjanjikan notifikasi work order kepada staff kantor', () => {
    const { queryByText, getByText } = renderDialogNotifikasi(FITUR_STAFF);

    expect(queryByText(ALASAN_WORK_ORDER_NOTIFIKASI)).toBeNull();
    expect(getByText('Pengingat absensi dan persetujuan izin')).toBeTruthy();
  });

  it('tetap menjanjikannya kepada pemegang m_work_order', () => {
    const { getByText } = renderDialogNotifikasi(FITUR_TEKNISI);

    expect(getByText(ALASAN_WORK_ORDER_NOTIFIKASI)).toBeTruthy();
  });

  it('tidak meminta lokasi staff kantor atas nama penugasan work order', () => {
    const { queryByText, getByText } = renderDialogLokasi(FITUR_STAFF);

    expect(queryByText(ALASAN_WORK_ORDER_LOKASI)).toBeNull();
    expect(
      getByText('Verifikasi kehadiran di lokasi kerja saat check-in/check-out'),
    ).toBeTruthy();
  });

  it('menyebut penugasan work order kepada teknisi', () => {
    const { getByText } = renderDialogLokasi(FITUR_TEKNISI);

    expect(getByText(ALASAN_WORK_ORDER_LOKASI)).toBeTruthy();
  });

  // Pengguna tanpa satu pun izin yang cocok tidak boleh melihat kotak hampa.
  it('mengembalikan seluruh alasan notifikasi bila tak satu pun izin cocok', () => {
    const { getByText } = renderDialogNotifikasi(['m_dashboard']);

    expect(getByText(ALASAN_WORK_ORDER_NOTIFIKASI)).toBeTruthy();
  });
});
