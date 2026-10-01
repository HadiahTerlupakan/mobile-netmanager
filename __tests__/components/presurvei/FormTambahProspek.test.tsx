import React from 'react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { LocationResult } from '@/hooks/useLocationWithTimeout';
import type { MuatanBuatProspek, ProspekDetail } from '@/types/presurvei';

const mockBuatProspek = jest.fn<(muatan: MuatanBuatProspek) => Promise<ProspekDetail>>();
const mockRincianProspek = jest.fn<(id: string) => Promise<ProspekDetail>>();
const mockCariLokasi = jest.fn<() => Promise<LocationResult>>();
const mockSukses = jest.fn();
const mockGalat = jest.fn();
const mockPesanGalat = jest.fn();
let mockIsOnline = true;

jest.mock('@/services/PresurveiService', () => ({
  PresurveiService: {
    buatProspek: (muatan: MuatanBuatProspek) => mockBuatProspek(muatan),
    rincianProspek: (id: string) => mockRincianProspek(id),
  },
}));
jest.mock('@/hooks/useIsOnline', () => ({ useIsOnline: () => mockIsOnline }));
jest.mock('@/hooks/useLocationWithTimeout', () => ({
  useLocationWithTimeout: () => ({ getLocationWithTimeout: () => mockCariLokasi() }),
}));
jest.mock('@/hooks/presurvei/useLingkupRencana', () => ({
  useLingkupRencana: () => ({ isPemberiTugas: false, penggunaId: 's-1' }),
}));
jest.mock('@/utils/errorPresenter', () => ({
  presentSuccessMessage: (...a: unknown[]) => mockSukses(...a),
  presentAppError: (...a: unknown[]) => mockGalat(...a),
  presentErrorMessage: (...a: unknown[]) => mockPesanGalat(...a),
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import { FormTambahProspek, TEKS_ADA_ISIAN_SALAH, TEKS_PROSPEK_BUTUH_ONLINE } from '@/components/organisms/presurvei/FormTambahProspek';
import { PESAN_ISIAN_PROSPEK } from '@/utils/presurvei/isianProspek';
import { buatGalatDuplikatUji, buatProspekDetailUji } from '../../fixtures/presurvei/prospek';

/** Notifikasi batch TanStack berjalan lewat `setTimeout(0)`. */
const tungguNotifikasiBatch = () => new Promise((resolve) => setTimeout(resolve, 0));
const selesaikanJanji = () => act(async () => { await tungguNotifikasiBatch(); });

const daftarClient: QueryClient[] = [];

const renderForm = () => {
  const client = new QueryClient({ defaultOptions: { mutations: { gcTime: 0 }, queries: { retry: false, gcTime: 0 } } });
  daftarClient.push(client);
  const onBerhasil = jest.fn();
  const utilitas = render(
    <QueryClientProvider client={client}>
      <FormTambahProspek onBerhasil={onBerhasil} />
    </QueryClientProvider>,
  );
  return { ...utilitas, onBerhasil, client };
};

const isiWajib = (getByLabelText: (label: string) => unknown) => {
  fireEvent.changeText(getByLabelText('Nama calon pelanggan') as never, '  Pak Budi Santoso ');
  fireEvent.changeText(getByLabelText('Nomor HP') as never, '0812 3456 7890');
  fireEvent.changeText(getByLabelText('Alamat pemasangan') as never, 'Jl. Melati No. 5');
};

const MUATAN_DASAR = {
  nama: 'Pak Budi Santoso',
  noTelp: '0812 3456 7890',
  alamat: 'Jl. Melati No. 5',
  jenis: 'CALON_PELANGGAN',
  sumber: 'LAPANGAN',
  paketDiminati: null,
  catatan: null,
};

describe('FormTambahProspek', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Antrean nilai 'Once' tidak ikut dibersihkan clearAllMocks; jangan bocor antar tes.
    mockBuatProspek.mockReset();
    mockRincianProspek.mockReset();
    mockCariLokasi.mockReset();
    mockIsOnline = true;
  });

  afterEach(() => {
    daftarClient.splice(0).forEach((client) => client.clear());
  });

  it('menampilkan isian dengan tanda wajib dan contoh, serta pilihan sumber tanpa Iklan', () => {
    const { getAllByText, getByPlaceholderText, getByLabelText, queryByLabelText } = renderForm();

    expect(getAllByText('(wajib diisi)').length).toBe(5);
    expect(getByPlaceholderText('Contoh: Pak Budi Santoso')).toBeTruthy();
    expect(getByPlaceholderText('Contoh: 0812 3456 7890').props.keyboardType).toBe('phone-pad');
    expect(getByLabelText('Ketemu di lapangan').props.accessibilityState).toEqual({ selected: true });
    expect(getByLabelText('Datang sendiri')).toBeTruthy();
    expect(getByLabelText('Dari website')).toBeTruthy();
    expect(queryByLabelText('Iklan')).toBeNull();
    expect(queryByLabelText('Nama yang mengenalkan')).toBeNull();
  });

  it('simpan form kosong menampilkan pesan sederhana tanpa mengirim', () => {
    const { getByText } = renderForm();

    fireEvent.press(getByText('Simpan Prospek'));

    expect(getByText(PESAN_ISIAN_PROSPEK.namaKosong)).toBeTruthy();
    expect(getByText(PESAN_ISIAN_PROSPEK.telpKosong)).toBeTruthy();
    expect(getByText(PESAN_ISIAN_PROSPEK.alamatKosong)).toBeTruthy();
    expect(getByText(TEKS_ADA_ISIAN_SALAH)).toBeTruthy();
    expect(mockBuatProspek).not.toHaveBeenCalled();
  });

  it('mengirim isian terpangkas lalu memanggil onBerhasil dengan prospek baru', async () => {
    const prospekBaru = buatProspekDetailUji();
    mockBuatProspek.mockResolvedValue(prospekBaru);
    const { getByText, getByLabelText, onBerhasil, client } = renderForm();
    const invalidasi = jest.spyOn(client, 'invalidateQueries');

    isiWajib(getByLabelText);
    fireEvent.changeText(getByLabelText('Paket yang diminati'), '20 Mbps');
    fireEvent.press(getByText('Simpan Prospek'));
    await selesaikanJanji();

    expect(mockBuatProspek).toHaveBeenCalledWith({ ...MUATAN_DASAR, paketDiminati: '20 Mbps' });
    expect(invalidasi).toHaveBeenCalledWith({ queryKey: ['presurvei'] });
    expect(mockSukses).toHaveBeenCalledWith('Prospek tersimpan');
    expect(onBerhasil).toHaveBeenCalledWith(prospekBaru);
  });

  it('ketukan ganda hanya mengirim sekali', async () => {
    let selesaikan: (prospek: ProspekDetail) => void = () => undefined;
    mockBuatProspek.mockReturnValue(new Promise((resolve) => { selesaikan = resolve; }));
    const { getByText, getByLabelText } = renderForm();

    isiWajib(getByLabelText);
    const tombol = getByText('Simpan Prospek');
    fireEvent.press(tombol);
    fireEvent.press(tombol);
    await selesaikanJanji();

    expect(mockBuatProspek).toHaveBeenCalledTimes(1);
    expect(getByText('Menyimpan…')).toBeTruthy();
    selesaikan(buatProspekDetailUji());
    await selesaikanJanji();
  });

  it('"Dikenalkan orang lain" memunculkan isian wajib nama pengenal yang ikut terkirim', async () => {
    mockBuatProspek.mockResolvedValue(buatProspekDetailUji({ sumber: 'REFERRAL' }));
    const { getByText, getByLabelText } = renderForm();

    isiWajib(getByLabelText);
    fireEvent.press(getByLabelText('Dikenalkan orang lain'));
    fireEvent.press(getByText('Simpan Prospek'));
    expect(getByText('Tulis nama orang yang mengenalkan')).toBeTruthy();
    expect(mockBuatProspek).not.toHaveBeenCalled();

    fireEvent.changeText(getByLabelText('Nama yang mengenalkan'), 'Bu Siti');
    fireEvent.press(getByText('Simpan Prospek'));
    await selesaikanJanji();

    expect(mockBuatProspek).toHaveBeenCalledWith({ ...MUATAN_DASAR, sumber: 'REFERRAL', referralNama: 'Bu Siti' });
  });

  it('offline: tombol simpan nonaktif dan alasannya dijelaskan', () => {
    mockIsOnline = false;
    const { getByText, getByLabelText } = renderForm();

    isiWajib(getByLabelText);
    fireEvent.press(getByText('Simpan Prospek'));

    expect(getByText(TEKS_PROSPEK_BUTUH_ONLINE)).toBeTruthy();
    expect(mockBuatProspek).not.toHaveBeenCalled();
  });

  it('lokasi mengisi alamat kosong dan titik ikut terkirim', async () => {
    mockCariLokasi.mockResolvedValue({ latitude: '-6.2', longitude: '106.8', locationName: 'Jl. Sudirman Jakarta', accuracy: 10 });
    mockBuatProspek.mockResolvedValue(buatProspekDetailUji());
    const { getByText, getByLabelText } = renderForm();

    fireEvent.press(getByLabelText('Pakai lokasi saya sekarang'));
    expect(getByText('Mencari lokasi…')).toBeTruthy();
    await selesaikanJanji();

    expect(getByText('Lokasi tersimpan ✓')).toBeTruthy();
    expect(getByLabelText('Alamat pemasangan').props.value).toBe('Jl. Sudirman Jakarta');
    fireEvent.changeText(getByLabelText('Nama calon pelanggan'), 'Pak Budi Santoso');
    fireEvent.changeText(getByLabelText('Nomor HP'), '0812 3456 7890');
    fireEvent.press(getByText('Simpan Prospek'));
    await selesaikanJanji();

    expect(mockBuatProspek).toHaveBeenCalledWith(
      expect.objectContaining({ alamat: 'Jl. Sudirman Jakarta', latitude: -6.2, longitude: 106.8 }),
    );
  });

  it('lokasi tidak menimpa alamat yang sudah ditulis, dan gagal lokasi dijelaskan', async () => {
    mockCariLokasi.mockResolvedValueOnce({ latitude: '-6.2', longitude: '106.8', locationName: 'Jl. Sudirman', accuracy: null });
    mockCariLokasi.mockResolvedValueOnce({ latitude: '', longitude: '', locationName: '', accuracy: null });
    const { getByText, getByLabelText } = renderForm();

    fireEvent.changeText(getByLabelText('Alamat pemasangan'), 'Rumah Pak RT');
    fireEvent.press(getByLabelText('Pakai lokasi saya sekarang'));
    await selesaikanJanji();
    expect(getByLabelText('Alamat pemasangan').props.value).toBe('Rumah Pak RT');

    fireEvent.press(getByLabelText('Pakai lokasi saya sekarang'));
    await selesaikanJanji();
    expect(getByText('Lokasi tidak ditemukan, tulis alamat saja')).toBeTruthy();
  });

  describe('nomor HP ganda (409 DUPLIKAT)', () => {
    const DUPLIKAT_SENDIRI = { id: 'p-lama', nama: 'Budi Lama', status: 'DIHUBUNGI', pemilikId: 's-1' };

    const kirimSampaiDuplikat = async (duplikat: unknown[]) => {
      mockBuatProspek.mockRejectedValueOnce(buatGalatDuplikatUji(duplikat));
      const hasil = renderForm();
      isiWajib(hasil.getByLabelText);
      fireEvent.press(hasil.getByText('Simpan Prospek'));
      await selesaikanJanji();
      return hasil;
    };

    it('tanpa galat mentah: menampilkan nama pemilik nomor dan tiga pilihan', async () => {
      const { getByText, getByLabelText, queryByText } = await kirimSampaiDuplikat([DUPLIKAT_SENDIRI]);

      expect(getByText('Nomor HP ini sudah tercatat atas nama Budi Lama.')).toBeTruthy();
      expect(getByLabelText('Pakai yang sudah ada')).toBeTruthy();
      expect(getByText('Tetap simpan sebagai baru')).toBeTruthy();
      expect(getByText('Batal')).toBeTruthy();
      expect(queryByText('Simpan Prospek')).toBeNull();
      expect(mockGalat).not.toHaveBeenCalled();
    });

    it('"Pakai yang sudah ada" mengambil rinciannya lalu memanggil onBerhasil', async () => {
      const lama = buatProspekDetailUji({ id: 'p-lama', nama: 'Budi Lama' });
      mockRincianProspek.mockResolvedValue(lama);
      const { getByLabelText, onBerhasil } = await kirimSampaiDuplikat([DUPLIKAT_SENDIRI]);

      fireEvent.press(getByLabelText('Pakai yang sudah ada'));
      await selesaikanJanji();

      expect(mockRincianProspek).toHaveBeenCalledWith('p-lama');
      expect(onBerhasil).toHaveBeenCalledWith(lama);
    });

    it('"Pakai yang sudah ada" yang gagal dimuat dijelaskan dan pilihan tetap ada', async () => {
      mockRincianProspek.mockRejectedValue(new Error('403'));
      const { getByLabelText, onBerhasil } = await kirimSampaiDuplikat([DUPLIKAT_SENDIRI]);

      fireEvent.press(getByLabelText('Pakai yang sudah ada'));
      await selesaikanJanji();

      expect(mockPesanGalat).toHaveBeenCalledTimes(1);
      expect(onBerhasil).not.toHaveBeenCalled();
      expect(getByLabelText('Pakai yang sudah ada')).toBeTruthy();
    });

    it('"Tetap simpan sebagai baru" mengirim ulang dengan abaikanDuplikat', async () => {
      const prospekBaru = buatProspekDetailUji();
      const { getByText, onBerhasil } = await kirimSampaiDuplikat([DUPLIKAT_SENDIRI]);
      mockBuatProspek.mockResolvedValueOnce(prospekBaru);

      fireEvent.press(getByText('Tetap simpan sebagai baru'));
      await selesaikanJanji();

      expect(mockBuatProspek).toHaveBeenLastCalledWith({ ...MUATAN_DASAR, abaikanDuplikat: true });
      expect(onBerhasil).toHaveBeenCalledWith(prospekBaru);
    });

    it('"Batal" kembali ke tombol simpan tanpa mengirim', async () => {
      const { getByText } = await kirimSampaiDuplikat([DUPLIKAT_SENDIRI]);

      fireEvent.press(getByText('Batal'));

      expect(getByText('Simpan Prospek')).toBeTruthy();
      expect(mockBuatProspek).toHaveBeenCalledTimes(1);
    });

    it('mengubah nomor HP menutup pilihan nomor ganda', async () => {
      const { getByText, getByLabelText, queryByText } = await kirimSampaiDuplikat([DUPLIKAT_SENDIRI]);

      fireEvent.changeText(getByLabelText('Nomor HP'), '0812 0000 1111');

      expect(queryByText('Tetap simpan sebagai baru')).toBeNull();
      expect(getByText('Simpan Prospek')).toBeTruthy();
    });

    it('nomor milik sales lain: hanya diberitahukan, tanpa "Pakai yang sudah ada"', async () => {
      const { getByText, queryByLabelText } = await kirimSampaiDuplikat([{ ...DUPLIKAT_SENDIRI, pemilikId: 's-9' }]);

      expect(getByText('Nomor HP ini sudah tercatat atas nama Budi Lama. Data itu dipegang sales lain.')).toBeTruthy();
      expect(queryByLabelText('Pakai yang sudah ada')).toBeNull();
      expect(getByText('Tetap simpan sebagai baru')).toBeTruthy();
    });
  });

  describe('jenis prospek', () => {
    it('bawaannya calon pelanggan: "Orang ini siapa?" dengan keterangan kecil, tanpa isian peran', () => {
      const { getByText, getByLabelText, queryByText } = renderForm();

      expect(getByText(/^Orang ini siapa\?/)).toBeTruthy();
      expect(getByLabelText('Calon pelanggan').props.accessibilityState).toEqual({ selected: true });
      expect(getByText('Mau pasang internet')).toBeTruthy();
      expect(getByText('Bisa membawa pelanggan: ketua RT, tokoh, dll.')).toBeTruthy();
      expect(queryByText(/^Perannya apa\?/)).toBeNull();
      expect(getByLabelText('Paket yang diminati')).toBeTruthy();
    });

    it('perantara: peran wajib, alamat jadi "Alamat rumah/tempat", paket disembunyikan', () => {
      const { getByText, getByLabelText, queryByLabelText } = renderForm();

      fireEvent.press(getByLabelText('Perantara'));

      expect(getByText(/^Perannya apa\?/)).toBeTruthy();
      expect(getByLabelText('Nama perantara')).toBeTruthy();
      expect(getByLabelText('Alamat rumah/tempat')).toBeTruthy();
      expect(queryByLabelText('Alamat pemasangan')).toBeNull();
      expect(queryByLabelText('Paket yang diminati')).toBeNull();
      expect(getByText(/^Kenal dari mana\?/)).toBeTruthy();

      fireEvent.changeText(getByLabelText('Nama perantara'), 'Pak Slamet');
      fireEvent.changeText(getByLabelText('Nomor HP'), '0812 3456 7890');
      fireEvent.changeText(getByLabelText('Alamat rumah/tempat'), 'Jl. Melati No. 5');
      fireEvent.press(getByText('Simpan Prospek'));

      expect(getByText('Pilih perannya dulu')).toBeTruthy();
      expect(mockBuatProspek).not.toHaveBeenCalled();
    });

    it('perantara terkirim dengan jenis, peran gabungan, dan tanpa paket', async () => {
      mockBuatProspek.mockResolvedValue(buatProspekDetailUji({ jenis: 'PERANTARA', peran: 'Ketua RT/RW (RT 03)' }));
      const { getByText, getByLabelText, onBerhasil } = renderForm();

      fireEvent.changeText(getByLabelText('Paket yang diminati'), '20 Mbps');
      fireEvent.press(getByLabelText('Perantara'));
      fireEvent.press(getByLabelText('Ketua RT/RW'));
      fireEvent.changeText(getByLabelText('Keterangan'), ' RT 03 ');
      fireEvent.changeText(getByLabelText('Nama perantara'), 'Pak Slamet');
      fireEvent.changeText(getByLabelText('Nomor HP'), '0812 3456 7890');
      fireEvent.changeText(getByLabelText('Alamat rumah/tempat'), 'Jl. Melati No. 5');
      fireEvent.press(getByText('Simpan Prospek'));
      await selesaikanJanji();

      expect(mockBuatProspek).toHaveBeenCalledWith({
        ...MUATAN_DASAR,
        nama: 'Pak Slamet',
        jenis: 'PERANTARA',
        peran: 'Ketua RT/RW (RT 03)',
        paketDiminati: null,
      });
      expect(onBerhasil).toHaveBeenCalled();
    });

    it('"Lainnya" mewajibkan menulis perannya sendiri', async () => {
      mockBuatProspek.mockResolvedValue(buatProspekDetailUji({ jenis: 'PERANTARA', peran: 'Ketua karang taruna' }));
      const { getByText, getByLabelText } = renderForm();

      fireEvent.press(getByLabelText('Perantara'));
      fireEvent.press(getByLabelText('Lainnya'));
      fireEvent.changeText(getByLabelText('Nama perantara'), 'Mas Joko');
      fireEvent.changeText(getByLabelText('Nomor HP'), '0812 3456 7890');
      fireEvent.changeText(getByLabelText('Alamat rumah/tempat'), 'Jl. Melati No. 5');
      fireEvent.press(getByText('Simpan Prospek'));
      expect(getByText('Tulis perannya. Contoh: Ketua karang taruna')).toBeTruthy();
      expect(mockBuatProspek).not.toHaveBeenCalled();

      fireEvent.changeText(getByLabelText('Tulis perannya'), 'Ketua karang taruna');
      fireEvent.press(getByText('Simpan Prospek'));
      await selesaikanJanji();

      expect(mockBuatProspek).toHaveBeenCalledWith(
        expect.objectContaining({ jenis: 'PERANTARA', peran: 'Ketua karang taruna', paketDiminati: null }),
      );
    });

    it('kembali ke calon pelanggan menghapus tulisan merah peran dan tidak mengirim peran', async () => {
      mockBuatProspek.mockResolvedValue(buatProspekDetailUji());
      const { getByText, getByLabelText, queryByText } = renderForm();

      fireEvent.press(getByLabelText('Perantara'));
      fireEvent.press(getByText('Simpan Prospek'));
      expect(getByText('Pilih perannya dulu')).toBeTruthy();

      fireEvent.press(getByLabelText('Calon pelanggan'));
      expect(queryByText('Pilih perannya dulu')).toBeNull();
      isiWajib(getByLabelText);
      fireEvent.press(getByText('Simpan Prospek'));
      await selesaikanJanji();

      expect(mockBuatProspek).toHaveBeenCalledWith(MUATAN_DASAR);
    });
  });

  it('galat selain duplikat ditampilkan lewat presenter galat aplikasi', async () => {
    mockBuatProspek.mockRejectedValue(new Error('jaringan putus'));
    const { getByText, getByLabelText } = renderForm();

    isiWajib(getByLabelText);
    fireEvent.press(getByText('Simpan Prospek'));
    await selesaikanJanji();

    expect(mockGalat).toHaveBeenCalledWith(expect.any(Error), { screen: 'TambahProspek', source: 'mutation' });
    expect(getByText('Simpan Prospek')).toBeTruthy();
  });
});
