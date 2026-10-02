import { describe, expect, it } from '@jest/globals';
import tw from 'twrnc';

import {
  ambilTemaPersona,
  ambilTwPersona,
  PALET_PERSONA,
  PERSONA_TEMA_BAWAAN,
  tentukanPersonaTema,
  type WarnaTemaPersona,
} from '@/theme';
import type { Persona } from '@/utils/persona';

const SEMUA_PERSONA = Object.keys(PALET_PERSONA) as Persona[];
const PERSONA_KARYAWAN: Persona[] = [
  'KARYAWAN_SALES',
  'KARYAWAN_TEKNISI',
  'KARYAWAN_STAFF',
  'KARYAWAN_FINANCE',
  'KARYAWAN_DIREKTUR',
];

/** Batas WCAG AA untuk teks berukuran normal. */
const KONTRAS_MINIMUM_TEKS = 4.5;

/** Luminans relatif sRGB (WCAG 2.x). */
function hitungLuminans(hex: string): number {
  const [merah, hijau, biru] = [1, 3, 5].map((awal) => {
    const kanal = parseInt(hex.slice(awal, awal + 2), 16) / 255;
    return kanal <= 0.03928 ? kanal / 12.92 : ((kanal + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * merah + 0.7152 * hijau + 0.0722 * biru;
}

/** Rasio kontras dua warna hex. */
function hitungRasioKontras(warnaA: string, warnaB: string): number {
  const [terang, gelap] = [hitungLuminans(warnaA), hitungLuminans(warnaB)].sort((a, b) => b - a);
  return (terang + 0.05) / (gelap + 0.05);
}

/** Tampilan sales hari ini: tailwind blue. Tidak boleh bergeser. */
const BIRU_SALES: WarnaTemaPersona = {
  utama: '#2563eb',
  utamaKuat: '#2563eb',
  utamaGelap: '#1d4ed8',
  utamaPekat: '#1e40af',
  utamaTerang: '#3b82f6',
  utamaLembut: '#60a5fa',
  utamaPucat: '#93c5fd',
  utamaGaris: '#bfdbfe',
  utamaMuda: '#dbeafe',
  utamaSangatMuda: '#eff6ff',
  teksDiAtasUtama: '#ffffff',
  gradienAwal: '#1e40af',
  gradienAkhir: '#0b1533',
};

describe('palet persona', () => {
  it('teks putih di atas gradien kartu sorotan tetap terbaca (≥ 4.5:1) untuk semua persona', () => {
    for (const warna of Object.values(PALET_PERSONA)) {
      expect(hitungRasioKontras('#ffffff', warna.gradienAwal)).toBeGreaterThanOrEqual(4.5);
      expect(hitungRasioKontras('#ffffff', warna.gradienAkhir)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('sales tetap biru tailwind persis seperti sebelum tema persona', () => {
    expect(PALET_PERSONA.KARYAWAN_SALES).toEqual(BIRU_SALES);
  });

  it('mitra memakai warna yang selama ini tampil di layar mitra (biru)', () => {
    expect(PALET_PERSONA.MITRA_SALES).toEqual(BIRU_SALES);
    expect(PALET_PERSONA.MITRA_TEKNISI).toEqual(BIRU_SALES);
  });

  it.each([
    ['KARYAWAN_TEKNISI', '#ea580c', '#c2410c', '#fff7ed', '#ffedd5'],
    ['KARYAWAN_STAFF', '#0d9488', '#0f766e', '#f0fdfa', '#ccfbf1'],
    ['KARYAWAN_FINANCE', '#7c3aed', '#6d28d9', '#f5f3ff', '#ede9fe'],
    ['KARYAWAN_DIREKTUR', '#4338ca', '#3730a3', '#eef2ff', '#e0e7ff'],
  ] as [Persona, string, string, string, string][])('%s memakai warna identitasnya sendiri', (persona, utama, gelap, sangatMuda, muda) => {
    expect(PALET_PERSONA[persona]).toMatchObject({ utama, utamaGelap: gelap, utamaSangatMuda: sangatMuda, utamaMuda: muda });
  });

  it('setiap persona karyawan punya warna utama yang berbeda', () => {
    const daftarUtama = PERSONA_KARYAWAN.map((persona) => PALET_PERSONA[persona].utama);
    expect(new Set(daftarUtama).size).toBe(PERSONA_KARYAWAN.length);
  });

  it('semua token berupa hex 6 digit', () => {
    for (const persona of SEMUA_PERSONA) {
      for (const nilai of Object.values(PALET_PERSONA[persona])) expect(nilai).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('kontras palet', () => {
  it.each(SEMUA_PERSONA)('%s: teks putih di atas latar utamaKuat ≥ 4.5:1', (persona) => {
    const warna = PALET_PERSONA[persona];
    expect(hitungRasioKontras(warna.teksDiAtasUtama, warna.utamaKuat)).toBeGreaterThanOrEqual(KONTRAS_MINIMUM_TEKS);
  });

  it.each(SEMUA_PERSONA)('%s: teks aksen utamaKuat di atas putih & latar sangat muda ≥ 4.5:1', (persona) => {
    const warna = PALET_PERSONA[persona];
    expect(hitungRasioKontras(warna.utamaKuat, '#ffffff')).toBeGreaterThanOrEqual(KONTRAS_MINIMUM_TEKS);
    expect(hitungRasioKontras(warna.utamaKuat, warna.utamaSangatMuda)).toBeGreaterThanOrEqual(KONTRAS_MINIMUM_TEKS);
  });

  it.each(SEMUA_PERSONA)('%s: teks utamaGelap di atas latar muda ≥ 4.5:1', (persona) => {
    const warna = PALET_PERSONA[persona];
    expect(hitungRasioKontras(warna.utamaGelap, warna.utamaMuda)).toBeGreaterThanOrEqual(KONTRAS_MINIMUM_TEKS);
    expect(hitungRasioKontras(warna.utamaGelap, warna.utamaSangatMuda)).toBeGreaterThanOrEqual(KONTRAS_MINIMUM_TEKS);
  });

  it('oranye-600 dan tosca-600 tidak cukup kontras untuk teks putih, jadi latarnya memakai 700', () => {
    expect(hitungRasioKontras('#ffffff', PALET_PERSONA.KARYAWAN_TEKNISI.utama)).toBeLessThan(KONTRAS_MINIMUM_TEKS);
    expect(PALET_PERSONA.KARYAWAN_TEKNISI.utamaKuat).toBe('#c2410c');
    expect(hitungRasioKontras('#ffffff', PALET_PERSONA.KARYAWAN_STAFF.utama)).toBeLessThan(KONTRAS_MINIMUM_TEKS);
    expect(PALET_PERSONA.KARYAWAN_STAFF.utamaKuat).toBe('#0f766e');
  });
});

describe('tentukanPersonaTema', () => {
  it('tanpa login memakai tema bawaan sales, bukan teknisi', () => {
    expect(PERSONA_TEMA_BAWAAN).toBe('KARYAWAN_SALES');
    expect(tentukanPersonaTema(null)).toBe('KARYAWAN_SALES');
    expect(tentukanPersonaTema(undefined)).toBe('KARYAWAN_SALES');
  });

  it('investor memakai tema zamrud sendiri walau membawa field karyawan', () => {
    expect(tentukanPersonaTema({ role: 'INVESTOR' })).toBe('INVESTOR');
    expect(tentukanPersonaTema({ role: 'INVESTOR', persona: 'SALES', isSales: true })).toBe('INVESTOR');
    expect(PALET_PERSONA.INVESTOR.utamaKuat).toBe('#047857');
  });

  it('kepala sales (lingkup rencana TIM/SEMUA) memakai tema fuchsia, sales tim tetap biru', () => {
    const sales = { role: 'KEPALA SALES', employeeType: 'KARYAWAN' as const, persona: 'SALES' as const };
    expect(tentukanPersonaTema({ ...sales, lingkupRencana: 'TIM' })).toBe('KEPALA_SALES');
    expect(tentukanPersonaTema({ ...sales, lingkupRencana: 'SEMUA' })).toBe('KEPALA_SALES');
    expect(tentukanPersonaTema({ ...sales, lingkupRencana: 'SENDIRI' })).toBe('KARYAWAN_SALES');
    expect(tentukanPersonaTema(sales)).toBe('KARYAWAN_SALES');
    expect(PALET_PERSONA.KEPALA_SALES.utamaKuat).not.toBe(PALET_PERSONA.KARYAWAN_SALES.utamaKuat);
  });

  it('lingkup TIM pada persona non-sales tidak mengubah warnanya (mis. direktur)', () => {
    expect(
      tentukanPersonaTema({ role: 'DIREKTUR', employeeType: 'KARYAWAN', persona: 'DIREKTUR', lingkupRencana: 'SEMUA' }),
    ).toBe('KARYAWAN_DIREKTUR');
  });

  it('pelanggan memakai tema bawaan', () => {
    expect(tentukanPersonaTema({ role: 'CUSTOMER' })).toBe('KARYAWAN_SALES');
  });

  it('karyawan mengikuti persona dari server', () => {
    expect(tentukanPersonaTema({ role: 'TEKNISI', employeeType: 'KARYAWAN', persona: 'TEKNISI' })).toBe('KARYAWAN_TEKNISI');
    expect(tentukanPersonaTema({ role: 'ADMIN', employeeType: 'KARYAWAN', persona: 'STAFF' })).toBe('KARYAWAN_STAFF');
    expect(tentukanPersonaTema({ role: 'FINANCE', employeeType: 'KARYAWAN', persona: 'FINANCE' })).toBe('KARYAWAN_FINANCE');
    expect(tentukanPersonaTema({ role: 'DIREKTUR', employeeType: 'KARYAWAN', persona: 'DIREKTUR' })).toBe('KARYAWAN_DIREKTUR');
  });

  it('server lama tanpa persona memakai aturan lama (isSales → sales, selain itu teknisi)', () => {
    expect(tentukanPersonaTema({ role: 'SALES', employeeType: 'KARYAWAN', isSales: true })).toBe('KARYAWAN_SALES');
    expect(tentukanPersonaTema({ role: 'TEKNISI', employeeType: 'KARYAWAN' })).toBe('KARYAWAN_TEKNISI');
  });

  it('mitra dibaca dari employeeType', () => {
    expect(tentukanPersonaTema({ role: 'MITRA', employeeType: 'MITRA_SALES' })).toBe('MITRA_SALES');
  });

  it('ambilTemaPersona memasangkan persona dengan paletnya', () => {
    expect(ambilTemaPersona('KARYAWAN_TEKNISI')).toEqual({ persona: 'KARYAWAN_TEKNISI', warna: PALET_PERSONA.KARYAWAN_TEKNISI });
  });
});

describe('ambilTwPersona', () => {
  it('memetakan kelas utama-* ke palet persona', () => {
    const twTeknisi = ambilTwPersona('KARYAWAN_TEKNISI');
    expect(twTeknisi`bg-utama-kuat`).toEqual({ backgroundColor: '#c2410c' });
    expect(twTeknisi`text-utama`).toEqual({ color: '#ea580c' });
    expect(twTeknisi`bg-utama-sangat-muda border-utama-garis`).toEqual({ backgroundColor: '#fff7ed', borderColor: '#fed7aa' });
    expect(twTeknisi.color('utama-gelap')).toBe('#c2410c');
  });

  it('sales menghasilkan gaya yang sama persis dengan kelas biru lama', () => {
    const twSales = ambilTwPersona('KARYAWAN_SALES');
    const pasangan: [string, string][] = [
      ['bg-utama-kuat', 'bg-blue-600'],
      ['text-utama-kuat', 'text-blue-600'],
      ['border-utama', 'border-blue-600'],
      ['text-utama-gelap', 'text-blue-700'],
      ['text-utama-pekat', 'text-blue-800'],
      ['bg-utama-terang', 'bg-blue-500'],
      ['border-utama-lembut', 'border-blue-400'],
      ['border-utama-pucat', 'border-blue-300'],
      ['border-utama-garis', 'border-blue-200'],
      ['bg-utama-muda', 'bg-blue-100'],
      ['bg-utama-sangat-muda', 'bg-blue-50'],
      ['bg-utama-terang/15', 'bg-blue-500/15'],
    ];
    for (const [kelasTema, kelasLama] of pasangan) expect(twSales.style(kelasTema)).toEqual(tw.style(kelasLama));
  });

  it('kelas tailwind biasa identik dengan tw bawaan', () => {
    expect(ambilTwPersona('KARYAWAN_STAFF')`px-4 py-3 rounded-xl bg-red-600`).toEqual(tw`px-4 py-3 rounded-xl bg-red-600`);
  });

  it('memakai ulang instans per persona supaya cache gaya tetap hangat', () => {
    expect(ambilTwPersona('KARYAWAN_FINANCE')).toBe(ambilTwPersona('KARYAWAN_FINANCE'));
    expect(ambilTwPersona('KARYAWAN_FINANCE')).not.toBe(ambilTwPersona('KARYAWAN_DIREKTUR'));
  });
});
