import { describe, expect, it } from '@jest/globals';

import {
  NILAI_FORM_PROSPEK_KOSONG,
  OPSI_SUMBER_PROSPEK,
  PESAN_FORM_PROSPEK,
  alamatSetelahLokasi,
  keMuatanBuatProspek,
  validasiFormProspek,
  type NilaiFormProspek,
} from '@/utils/presurvei/formProspek';
import { PESAN_ISIAN_PROSPEK } from '@/utils/presurvei/isianProspek';
import { PESAN_PERAN } from '@/utils/presurvei/jenisProspek';

const nilai = (ubahan: Partial<NilaiFormProspek> = {}): NilaiFormProspek => ({
  ...NILAI_FORM_PROSPEK_KOSONG,
  nama: ' Pak Budi ',
  noTelp: ' 0812 3456 7890 ',
  alamat: ' Jl. Melati No. 5 ',
  ...ubahan,
});

describe('formProspek', () => {
  it('pilihan "Kenal dari mana?" tidak menawarkan IKLAN dan bawaannya LAPANGAN', () => {
    expect(OPSI_SUMBER_PROSPEK.map((opsi) => opsi.nilai)).toEqual(['LAPANGAN', 'WALK_IN', 'REFERRAL', 'WEBSITE']);
    expect(NILAI_FORM_PROSPEK_KOSONG.sumber).toBe('LAPANGAN');
  });

  it('form kosong menandai tiga isian wajib', () => {
    expect(validasiFormProspek(NILAI_FORM_PROSPEK_KOSONG)).toEqual({
      nama: PESAN_ISIAN_PROSPEK.namaKosong,
      noTelp: PESAN_ISIAN_PROSPEK.telpKosong,
      alamat: PESAN_ISIAN_PROSPEK.alamatKosong,
    });
  });

  it('REFERRAL mewajibkan nama yang mengenalkan (refine server); sumber lain tidak', () => {
    expect(validasiFormProspek(nilai({ sumber: 'REFERRAL', referralNama: ' ' }))).toEqual({
      referralNama: PESAN_FORM_PROSPEK.referralKosong,
    });
    expect(validasiFormProspek(nilai({ sumber: 'REFERRAL', referralNama: 'a'.repeat(121) }))).toEqual({
      referralNama: PESAN_ISIAN_PROSPEK.terlaluPanjang,
    });
    expect(validasiFormProspek(nilai({ sumber: 'WALK_IN', referralNama: '' }))).toEqual({});
  });

  it('catatan dibatasi 1000 huruf', () => {
    expect(validasiFormProspek(nilai({ catatan: 'a'.repeat(1001) }))).toEqual({ catatan: PESAN_ISIAN_PROSPEK.terlaluPanjang });
  });

  it('muatan memangkas isian, opsional kosong menjadi null, tanpa referral/titik/abaikanDuplikat bila tidak berlaku', () => {
    expect(keMuatanBuatProspek(nilai({ referralNama: 'sisa ketikan', paketDiminati: '  ' }))).toEqual({
      nama: 'Pak Budi',
      noTelp: '0812 3456 7890',
      alamat: 'Jl. Melati No. 5',
      jenis: 'CALON_PELANGGAN',
      sumber: 'LAPANGAN',
      paketDiminati: null,
      catatan: null,
    });
  });

  it('muatan membawa nama pengenal, titik, dan abaikanDuplikat bila berlaku', () => {
    const muatan = keMuatanBuatProspek(
      nilai({
        sumber: 'REFERRAL',
        referralNama: ' Bu Siti ',
        paketDiminati: '20 Mbps',
        catatan: 'Sore saja',
        titik: { latitude: -6.2, longitude: 106.8 },
      }),
      true,
    );
    expect(muatan).toEqual({
      nama: 'Pak Budi',
      noTelp: '0812 3456 7890',
      alamat: 'Jl. Melati No. 5',
      jenis: 'CALON_PELANGGAN',
      sumber: 'REFERRAL',
      referralNama: 'Bu Siti',
      paketDiminati: '20 Mbps',
      catatan: 'Sore saja',
      latitude: -6.2,
      longitude: 106.8,
      abaikanDuplikat: true,
    });
  });

  describe('perantara', () => {
    const perantara = (ubahan: Partial<NilaiFormProspek> = {}) =>
      nilai({ jenis: 'PERANTARA', peranPilihan: 'KETUA_RT_RW', peranKeterangan: ' RT 03 ', ...ubahan });

    it('bawaan form adalah calon pelanggan tanpa peran', () => {
      expect(NILAI_FORM_PROSPEK_KOSONG.jenis).toBe('CALON_PELANGGAN');
      expect(NILAI_FORM_PROSPEK_KOSONG.peranPilihan).toBeNull();
    });

    it('peran wajib dipilih; alamat tetap wajib', () => {
      expect(validasiFormProspek(perantara({ peranPilihan: null, alamat: '' }))).toEqual({
        alamat: PESAN_ISIAN_PROSPEK.alamatKosong,
        peranPilihan: PESAN_PERAN.belumDipilih,
      });
    });

    it('paket tersembunyi tidak ikut diperiksa', () => {
      expect(validasiFormProspek(perantara({ paketDiminati: 'a'.repeat(500) }))).toEqual({});
      expect(validasiFormProspek(nilai({ paketDiminati: 'a'.repeat(500) }))).toEqual({
        paketDiminati: PESAN_ISIAN_PROSPEK.terlaluPanjang,
      });
    });

    it('muatan membawa jenis & peran gabungan, paket selalu null', () => {
      expect(keMuatanBuatProspek(perantara({ paketDiminati: '20 Mbps' }))).toEqual({
        nama: 'Pak Budi',
        noTelp: '0812 3456 7890',
        alamat: 'Jl. Melati No. 5',
        jenis: 'PERANTARA',
        peran: 'Ketua RT/RW (RT 03)',
        sumber: 'LAPANGAN',
        paketDiminati: null,
        catatan: null,
      });
    });

    it('calon pelanggan tidak mengirim peran walau sisa pilihan peran masih ada', () => {
      const muatan = keMuatanBuatProspek(nilai({ peranPilihan: 'KETUA_RT_RW', peranKeterangan: 'RT 03' }));
      expect(muatan).not.toHaveProperty('peran');
      expect(muatan.jenis).toBe('CALON_PELANGGAN');
    });
  });

  it('lokasi hanya mengisi alamat yang masih kosong', () => {
    expect(alamatSetelahLokasi('', ' Jl. Sudirman Jakarta ')).toBe('Jl. Sudirman Jakarta');
    expect(alamatSetelahLokasi('  ', 'Jl. Sudirman')).toBe('Jl. Sudirman');
    expect(alamatSetelahLokasi('Rumah Pak RT', 'Jl. Sudirman')).toBe('Rumah Pak RT');
  });
});
