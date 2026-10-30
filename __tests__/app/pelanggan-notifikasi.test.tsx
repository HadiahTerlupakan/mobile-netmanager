import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { renderDenganQuery, selesaikanJanji } from '../fixtures/portalPelanggan';

const mockGet = jest.fn<(url: string, config?: unknown) => Promise<{ data: unknown }>>();
const mockPost = jest.fn<(url: string, body?: unknown) => Promise<{ data: unknown }>>();
const mockPush = jest.fn();

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: (url: string, config?: unknown) => mockGet(url, config),
    post: (url: string, body?: unknown) => mockPost(url, body),
  },
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }), useFocusEffect: jest.fn() }));
jest.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'p-1', name: 'Budi', role: 'CUSTOMER' } }) }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import { DashboardHeader } from '@/components/organisms/dashboard/DashboardHeader';
import CustomerDashboardScreen from '../../app/(customer)/dashboard';
import NotifikasiPelangganScreen from '../../app/(customer)/notifikasi';

const PENGUMUMAN = [
  { id: 'a-1', title: 'Pemeliharaan jaringan', content: 'Jaringan Cariu dipelihara Sabtu malam.', isPinned: true, createdAt: '2026-10-29T00:00:00.000Z' },
  { id: 'a-2', title: 'Libur nasional', content: 'Layanan pelanggan tutup.', isPinned: false, createdAt: '2026-10-20T00:00:00.000Z' },
];
const NOTIFIKASI = {
  success: true,
  notifications: [
    {
      id: 'ticket-reply-r-9',
      type: 'TICKET_REPLY',
      title: 'Balasan Tiket',
      message: 'Tiket #001 telah dibalas',
      preview: 'Teknisi sudah dijadwalkan',
      ticketId: 't-1',
      createdAt: '2026-10-30T02:00:00.000Z',
      isRead: false,
      sender: 'Rina CS',
    },
    { id: 'n-1', type: 'INVOICE', title: 'Tagihan baru', message: 'Tagihan November terbit', preview: 'Tagihan November terbit', createdAt: '2026-10-28T00:00:00.000Z', isRead: true, sender: 'Sistem' },
  ],
  announcements: [{ id: 'a-1' }],
  unreadCount: 2,
};

function sajikanKabar() {
  mockGet.mockImplementation(async (url: string) => ({
    data: url === '/api/customer/announcements' ? PENGUMUMAN : NOTIFIKASI,
  }));
}

async function renderLayar() {
  const layar = renderDenganQuery(<NotifikasiPelangganScreen />);
  await selesaikanJanji();
  return layar;
}

describe('notifikasi & pengumuman pelanggan', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    sajikanKabar();
  });

  it('memuat pengumuman dan notifikasi, menandai pengumuman yang belum dibaca', async () => {
    const layar = await renderLayar();

    expect(mockGet).toHaveBeenCalledWith('/api/customer/notifications', { params: { limit: 30 } });
    expect(mockGet).toHaveBeenCalledWith('/api/customer/announcements', undefined);
    expect(layar.getByText('Pemeliharaan jaringan')).toBeTruthy();
    expect(layar.getAllByText('Baru')).toHaveLength(1);
    expect(layar.getByText('Tiket #001 telah dibalas')).toBeTruthy();
    expect(layar.getByText('Tagihan November terbit')).toBeTruthy();
  });

  it('membuka pengumuman yang belum dibaca menandainya dibaca', async () => {
    mockPost.mockResolvedValue({ data: { success: true } });
    const layar = await renderLayar();

    fireEvent.press(layar.getByLabelText('Pengumuman Pemeliharaan jaringan'));
    await selesaikanJanji();

    expect(mockPost).toHaveBeenCalledWith('/api/customer/announcements/a-1/read', undefined);
  });

  it('membuka pengumuman yang sudah dibaca tidak mengirim apa pun', async () => {
    const layar = await renderLayar();

    fireEvent.press(layar.getByLabelText('Pengumuman Libur nasional'));
    await selesaikanJanji();

    expect(mockPost).not.toHaveBeenCalled();
  });

  it('notifikasi balasan tiket membuka tiketnya', async () => {
    const layar = await renderLayar();

    fireEvent.press(layar.getByLabelText('Tiket #001 telah dibalas'));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/(customer)/tickets/[id]', params: { id: 't-1' } });
  });
});

describe('lonceng Beranda pelanggan', () => {
  it('menampilkan jumlah dari pemanggil dan memanggil tujuan pemanggil', () => {
    const onTekan = jest.fn();
    const layar = render(<DashboardHeader userName="Budi" notificationCount={3} onNotificationPress={onTekan} />);

    fireEvent.press(layar.getByLabelText('Notifikasi, 3 belum dibaca'));

    expect(layar.getByText('3')).toBeTruthy();
    expect(onTekan).toHaveBeenCalled();
  });
});

describe('Beranda pelanggan', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockImplementation(async (url: string) => ({
      data: url === '/api/customer/notifications/unread-count' ? { success: true, count: 2 } : { success: true, data: {} },
    }));
  });

  it('lonceng memakai jumlah unread-count pelanggan dan membuka layar notifikasi', async () => {
    const layar = renderDenganQuery(<CustomerDashboardScreen />);
    await selesaikanJanji();

    expect(mockGet).toHaveBeenCalledWith('/api/customer/notifications/unread-count', undefined);
    fireEvent.press(layar.getByLabelText('Notifikasi, 2 belum dibaca'));

    expect(mockPush).toHaveBeenCalledWith('/(customer)/notifikasi');
  });

  it('tile Upgrade membuka layar upgrade paket', async () => {
    const layar = renderDenganQuery(<CustomerDashboardScreen />);
    await selesaikanJanji();

    fireEvent.press(layar.getByLabelText('Upgrade - Tambah Kecepatan'));

    expect(mockPush).toHaveBeenCalledWith('/(customer)/upgrade-paket');
  });
});
