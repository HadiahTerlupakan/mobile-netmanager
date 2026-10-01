import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import { KartuKegiatan } from '@/components/organisms/presurvei/KartuKegiatan';
import { RingkasanLaporanRencana } from '@/components/organisms/presurvei/RingkasanLaporanRencana';
import type { KegiatanHasil, KegiatanJenis } from '@/constants/presurvei';
import type { RincianRencana } from '@/types/presurvei';
import type { BarisKegiatan } from '@/utils/presurvei/daftarKegiatan';
import { buatRencanaUji } from '../../fixtures/presurvei/rencana';

const WAKTU = '2026-09-26T03:00:00.000Z';

const baris = (jenis: KegiatanJenis, hasil: KegiatanHasil): BarisKegiatan => ({
  kunci: 'server-k-1', jenis, hasil, waktuMulai: WAKTU, tempat: null, ditemuiNama: null,
  jumlahFoto: 0, isMenunggu: false, isGagal: false,
});

const rencanaSelesai = (jenis: KegiatanJenis, hasil: KegiatanHasil) => ({
  ...buatRencanaUji('r-1', { status: 'SELESAI' }),
  laporan: {
    id: 'k-1', jenis, userId: 's-1', namaSales: null, peranPelaku: null, departemenPelaku: null,
    prospekId: null, waktuMulai: WAKTU, alamatDikunjungi: null, ditemuiNama: null, latitude: null, longitude: null,
    hasil, jumlahFoto: 0, iklanId: null, waktuSelesai: null, catatan: null, fotoUrls: [], dataTeknis: null, createdAt: WAKTU,
  },
}) as unknown as RincianRencana;

describe('label hasil kegiatan mengikuti jenisnya', () => {
  it('kartu kegiatan: telepon tanpa kontak tampil "Tidak diangkat / nomor tidak aktif"', () => {
    const { getByText } = render(<KartuKegiatan baris={baris('TELEPON', 'TIDAK_ADA_ORANG')} />);
    expect(getByText('Tidak diangkat / nomor tidak aktif')).toBeTruthy();
  });

  it('kartu kegiatan: survei lokasi tampil "Bisa dipasang"', () => {
    const { getByText } = render(<KartuKegiatan baris={baris('SURVEI_LOKASI', 'BISA_DIPASANG')} />);
    expect(getByText('Bisa dipasang')).toBeTruthy();
  });

  it('ringkasan laporan rencana: chat follow-up tampil "Masih tanya-tanya"', () => {
    const { getByText } = render(<RingkasanLaporanRencana rencana={rencanaSelesai('CHAT', 'PERLU_FOLLOWUP')} />);
    expect(getByText('Masih tanya-tanya')).toBeTruthy();
  });
});
