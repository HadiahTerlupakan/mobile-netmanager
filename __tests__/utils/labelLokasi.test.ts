import {
  LABEL_IZIN_LOKASI_DITOLAK,
  denganBatasWaktu,
  labelKoordinat,
  labelLokasi,
} from '@/utils/labelLokasi';

/**
 * Layar Lembur memasang "Mencari lokasi..." sebagai teks awal dan dulu hanya
 * menggantinya saat geocode mengembalikan alamat. Hasil kosong — bukan lemparan,
 * hanya array kosong — meninggalkan label itu selamanya.
 */

const KOORDINAT = { latitude: -6.1751, longitude: 106.8272 };

describe('labelLokasi', () => {
  it('memakai alamat ketika geocode memberi hasil', () => {
    expect(
      labelLokasi(
        [{ street: 'Jl. Melati', district: 'Tebet', city: 'Jakarta Selatan' }],
        KOORDINAT,
      ),
    ).toBe('Jl. Melati Tebet, Jakarta Selatan');
  });

  // Inti perbaikannya: daftar kosong bukan kegagalan yang melempar, jadi dulu
  // tidak ada satu pun cabang yang menanganinya.
  it('jatuh ke koordinat saat geocode mengembalikan daftar kosong', () => {
    expect(labelLokasi([], KOORDINAT)).toBe('-6.175100, 106.827200');
    expect(labelLokasi(undefined, KOORDINAT)).toBe('-6.175100, 106.827200');
    expect(labelLokasi(null, KOORDINAT)).toBe('-6.175100, 106.827200');
  });

  // Alamat yang semua bagiannya kosong dulu menghasilkan label " ," — terlihat
  // seperti data rusak dan tidak memberi tahu apa pun.
  it('jatuh ke koordinat saat semua bagian alamat kosong', () => {
    expect(
      labelLokasi([{ street: '', district: null, city: '   ' }], KOORDINAT),
    ).toBe('-6.175100, 106.827200');
  });

  it('menyusun label dari bagian yang tersedia saja', () => {
    expect(labelLokasi([{ city: 'Bandung' }], KOORDINAT)).toBe('Bandung');
    expect(labelLokasi([{ street: 'Jl. Mawar' }], KOORDINAT)).toBe('Jl. Mawar');
    expect(labelLokasi([{ district: 'Cicendo', city: 'Bandung' }], KOORDINAT)).toBe(
      'Cicendo, Bandung',
    );
  });
});

describe('labelKoordinat', () => {
  it('menulis enam angka di belakang koma', () => {
    expect(labelKoordinat({ latitude: 1, longitude: -2.5 })).toBe(
      '1.000000, -2.500000',
    );
  });
});

describe('label izin', () => {
  // Izin yang ditolak dulu hanya `return`, meninggalkan "Mencari lokasi...".
  it('menyebut sebab yang benar, bukan seolah masih mencari', () => {
    expect(LABEL_IZIN_LOKASI_DITOLAK).not.toMatch(/mencari/i);
    expect(LABEL_IZIN_LOKASI_DITOLAK).toMatch(/izin/i);
  });
});

describe('denganBatasWaktu', () => {
  // `getCurrentPositionAsync` tidak punya tenggat sendiri; tanpa pembungkus ini
  // layar menggantung di "Mencari lokasi..." selamanya saat GPS tak memberi fix.
  it('mengembalikan null ketika lewat tenggat', async () => {
    jest.useFakeTimers();
    const menggantung = new Promise<string>(() => {});
    const hasil = denganBatasWaktu(menggantung, 15_000);

    jest.advanceTimersByTime(15_000);
    await expect(hasil).resolves.toBeNull();
    jest.useRealTimers();
  });

  it('meneruskan hasil yang datang sebelum tenggat', async () => {
    await expect(
      denganBatasWaktu(Promise.resolve('posisi'), 15_000),
    ).resolves.toBe('posisi');
  });

  // Tenggat yang tidak dibatalkan menahan proses tetap hidup setelah selesai.
  it('membersihkan penanda waktu setelah selesai', async () => {
    const clear = jest.spyOn(global, 'clearTimeout');
    await denganBatasWaktu(Promise.resolve('x'), 1000);
    expect(clear).toHaveBeenCalled();
    clear.mockRestore();
  });
});
