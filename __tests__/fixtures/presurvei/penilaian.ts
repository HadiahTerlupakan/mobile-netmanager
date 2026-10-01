import type {
  HasilPenilaian,
  IndikatorKepala,
  PenilaianKepala,
  PenilaianSales,
  PredikatPenilaian,
} from '@/types/penilaian';
import { predikatDariNilai } from '@/utils/presurvei/penilaianKinerja';

/** Pembuat data uji penilaian kinerja (bentuk respons `GET /api/presurvei/penilaian`). */

export const INDIKATOR_KEPALA_UJI: IndikatorKepala = {
  aktivitasTim: { nilai: 72, bobot: 30 },
  konversiTim: { nilai: 48, bobot: 30 },
  realisasiPenugasan: { nilai: null, bobot: 20 },
  cakupanPembinaan: { nilai: 90, bobot: 10 },
  kinerjaPribadi: { nilai: 65, bobot: 10 },
};

/** Satu baris sales; predikat diturunkan dari skor kecuali ditimpa. */
export const buatSalesUji = (salesId: string, skor: number | null, lain: Partial<PenilaianSales> = {}): PenilaianSales => ({
  salesId,
  nama: `Sales ${salesId}`,
  kepalaSalesId: 'k-1',
  skor,
  predikat: predikatDariNilai(skor),
  indikator: {
    aktivitas: { nilai: 80, bobot: 40 },
    konversi: { nilai: 60, bobot: 30 },
    realisasi: { nilai: null, bobot: 30 },
  },
  pencapaian: null,
  rencana: { tepatWaktu: 1, terlambat: 0, terlewat: 2 },
  ...lain,
});

/** Satu baris kepala sales. */
export const buatKepalaUji = (
  kepalaId: string,
  skor: number | null = 66,
  lain: Partial<PenilaianKepala> = {},
): PenilaianKepala => ({
  kepalaId,
  nama: `Kepala ${kepalaId}`,
  jumlahAnggota: 2,
  skor,
  predikat: predikatDariNilai(skor) as PredikatPenilaian | null,
  indikator: INDIKATOR_KEPALA_UJI,
  ...lain,
});

/** Respons penilaian lengkap. */
export const buatHasilUji = (kepala: PenilaianKepala[], sales: PenilaianSales[]): HasilPenilaian => ({
  periode: { tahun: 2026, bulan: 9 },
  dihitungSampai: '2026-09-26',
  kepala,
  sales,
});
