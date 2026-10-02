import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

const mockHubungi = jest.fn();
const mockPeta = jest.fn();

jest.mock('twrnc', () => require('twrnc-kosong'));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/utils/kontakWorkOrder', () => ({
  hubungiKontak: (nomor: string) => mockHubungi(nomor),
  bukaAlamatDiPeta: (alamat: string) => mockPeta(alamat),
}));
jest.mock('@/utils/date', () => ({ formatDate: (tanggal: string) => `tgl:${tanggal}` }));

import { KartuWorkOrder } from '@/components/organisms/workOrder/KartuWorkOrder';

const WO = {
  id: 'wo-1',
  workOrderNumber: 'WO-001',
  title: 'Internet lambat',
  status: 'IN_PROGRESS',
  priority: 'URGENT',
  type: 'TROUBLESHOOT',
  contactName: 'Bu Sari',
  contactPhone: '081200000004',
  locationAddress: 'Jl. Kenanga No. 5',
  scheduledDate: '2026-10-02T09:00:00Z',
};

describe('KartuWorkOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('menampilkan status, tipe, dan prioritas berlabel Indonesia', () => {
    const { getByText } = render(<KartuWorkOrder item={WO} />);

    expect(getByText('WO-001')).toBeTruthy();
    expect(getByText('Internet lambat')).toBeTruthy();
    expect(getByText('Dikerjakan')).toBeTruthy();
    expect(getByText('Gangguan')).toBeTruthy();
    expect(getByText('Prioritas mendesak')).toBeTruthy();
    expect(getByText('tgl:2026-10-02T09:00:00Z')).toBeTruthy();
  });

  it('kode yang belum dikenal tampil apa adanya', () => {
    const { getByText } = render(<KartuWorkOrder item={{ ...WO, status: 'BARU_SEKALI', type: 'SURVEI_X' }} />);

    expect(getByText('BARU_SEKALI')).toBeTruthy();
    expect(getByText('SURVEI_X')).toBeTruthy();
  });

  it('telepon membuka WhatsApp, alamat membuka peta, kartu membuka detail', () => {
    const onBuka = jest.fn();
    const { getByLabelText } = render(<KartuWorkOrder item={WO} onBuka={onBuka} />);

    fireEvent.press(getByLabelText('081200000004'));
    fireEvent.press(getByLabelText('Jl. Kenanga No. 5'));
    fireEvent.press(getByLabelText('Work order WO-001, ketuk untuk detail'));

    expect(mockHubungi).toHaveBeenCalledWith('081200000004');
    expect(mockPeta).toHaveBeenCalledWith('Jl. Kenanga No. 5');
    expect(onBuka).toHaveBeenCalledWith('wo-1');
  });

  it('tab Tersedia: tombol Ambil tugas memanggil onAmbil', () => {
    const onAmbil = jest.fn();
    const { getByLabelText } = render(
      <KartuWorkOrder item={{ ...WO, status: 'PENDING' }} aksiAmbil={{ onAmbil, isMengambil: false }} />,
    );

    fireEvent.press(getByLabelText('Ambil WO-001'));

    expect(onAmbil).toHaveBeenCalledWith('wo-1');
  });

  it('undangan partner yang menunggu konfirmasi ditandai', () => {
    const { getByText } = render(
      <KartuWorkOrder
        item={{ ...WO, assignments: [{ userId: 'u-1', role: 'PARTNER', status: 'PENDING' }] }}
        userId="u-1"
      />,
    );

    expect(getByText('Undangan')).toBeTruthy();
    expect(getByText('Menunggu konfirmasi Anda')).toBeTruthy();
  });
});
