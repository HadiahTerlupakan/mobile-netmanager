import {
  hitungSisaMaterial,
  sisaTersedia,
} from '@/utils/sisaPengembalian';

/**
 * Server menegakkan batas yang sama. Perhitungan di sisi layar ada supaya yang
 * ditawarkan persis yang akan diterima — kalau keduanya berselisih, teknisi
 * memilih jumlah yang terlihat sah lalu ditolak setelah menekan tombol.
 */

describe('hitungSisaMaterial', () => {
  it('menjumlahkan beberapa pengambilan barang yang sama', () => {
    const sisa = hitungSisaMaterial(
      [
        { barangId: 'kabel', jumlah: 4, nama: 'Kabel', satuan: 'meter' },
        { barangId: 'kabel', jumlah: 6 },
      ],
      [],
    );

    expect(sisa).toEqual([
      { barangId: 'kabel', nama: 'Kabel', satuan: 'meter', sisa: 10 },
    ]);
  });

  it('mengurangi yang sudah dikembalikan sebelumnya', () => {
    const sisa = hitungSisaMaterial(
      [{ barangId: 'kabel', jumlah: 10, nama: 'Kabel', satuan: 'meter' }],
      [{ barangId: 'kabel', jumlah: 7, asal: 'SISA_MATERIAL' }],
    );

    expect(sisa[0].sisa).toBe(3);
  });

  // Perangkat cabutan tidak pernah berasal dari pengambilan; memotongkannya ke
  // jatah sisa akan menutup pengembalian yang sah.
  it('tarikan pelanggan tidak memotong jatah sisa', () => {
    const sisa = hitungSisaMaterial(
      [{ barangId: 'ont', jumlah: 2, nama: 'ONT', satuan: 'unit' }],
      [{ barangId: 'ont', jumlah: 5, asal: 'TARIKAN_PELANGGAN' }],
    );

    expect(sisa[0].sisa).toBe(2);
  });

  it('barang yang sudah habis dikembalikan tidak ditawarkan lagi', () => {
    const sisa = hitungSisaMaterial(
      [{ barangId: 'kabel', jumlah: 5 }],
      [{ barangId: 'kabel', jumlah: 5, asal: 'SISA_MATERIAL' }],
    );

    expect(sisa).toEqual([]);
  });

  it('tanpa pengambilan, tidak ada yang bisa dikembalikan', () => {
    expect(hitungSisaMaterial(undefined, undefined)).toEqual([]);
  });
});

describe('sisaTersedia', () => {
  it('mengurangi yang sudah masuk keranjang', () => {
    const keranjang = [
      { barangId: 'kabel', jumlah: 3, asal: 'SISA_MATERIAL' as const },
    ];

    expect(sisaTersedia(10, keranjang, 'kabel')).toBe(7);
  });

  // Satu barang bisa masuk keranjang dua kali dengan kondisi berbeda, dan
  // jatahnya tetap satu.
  it('menjumlahkan baris berbeda untuk barang yang sama', () => {
    const keranjang = [
      { barangId: 'kabel', jumlah: 3, asal: 'SISA_MATERIAL' as const },
      { barangId: 'kabel', jumlah: 4, asal: 'SISA_MATERIAL' as const },
    ];

    expect(sisaTersedia(10, keranjang, 'kabel')).toBe(3);
  });

  // Saat jumlah sebuah baris diubah, baris itu tidak boleh menghitung dirinya
  // sendiri — kalau tidak, menaikkan 1 akan terus ditolak sejak angka kedua.
  it('mengabaikan baris yang sedang diubah', () => {
    const keranjang = [
      { barangId: 'kabel', jumlah: 9, asal: 'SISA_MATERIAL' as const },
    ];

    expect(sisaTersedia(10, keranjang, 'kabel', 0)).toBe(10);
  });

  it('tarikan pelanggan di keranjang tidak memotong jatah sisa', () => {
    const keranjang = [
      { barangId: 'ont', jumlah: 5, asal: 'TARIKAN_PELANGGAN' as const },
    ];

    expect(sisaTersedia(2, keranjang, 'ont')).toBe(2);
  });
});
