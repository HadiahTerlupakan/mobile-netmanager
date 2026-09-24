import { describe, expect, it } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { useFormKegiatan } from '@/hooks/presurvei/useFormKegiatan';
import { PESAN_FORM_KEGIATAN } from '@/utils/presurvei/formKegiatan';

const TITIK = { latitude: -6.2, longitude: 106.8, akurasiMeter: 12 };

describe('useFormKegiatan', () => {
  it('tidak menerima foto ketujuh', () => {
    const { result } = renderHook(() => useFormKegiatan());

    act(() => {
      for (let i = 1; i <= 7; i += 1) result.current.tambahFoto(`file:///cache/${i}.jpg`);
    });

    expect(result.current.fotoLokal).toHaveLength(6);
    expect(result.current.fotoLokal[5]).toBe('file:///cache/6.jpg');
  });

  // Amandemen preflight (task-12): mutasi `hapusFoto → lama.slice(1)` adalah
  // no-op terhadap test lama (hapus indeks pertama dari dua foto). Test ini
  // menghapus foto TENGAH dari tiga foto, sehingga `slice(1)` (hasil
  // [b, c]) berbeda dari `filter` yang benar (hasil [a, c]).
  it('menghapus hanya foto yang dipilih (foto tengah dari tiga foto)', () => {
    const { result } = renderHook(() => useFormKegiatan());
    act(() => {
      result.current.tambahFoto('file:///cache/a.jpg');
      result.current.tambahFoto('file:///cache/b.jpg');
      result.current.tambahFoto('file:///cache/c.jpg');
    });

    act(() => result.current.hapusFoto('file:///cache/b.jpg'));

    expect(result.current.fotoLokal).toEqual(['file:///cache/a.jpg', 'file:///cache/c.jpg']);
  });

  it('periksa menyimpan kesalahan dan mengembalikan false bila belum sah', () => {
    const { result } = renderHook(() => useFormKegiatan());
    act(() => result.current.ubah({ jenis: 'KUNJUNGAN', hasil: 'TERTARIK' }));

    let isSah = true;
    act(() => {
      isSah = result.current.periksa(null);
    });

    expect(isSah).toBe(false);
    expect(result.current.kesalahan).toEqual({
      lokasi: PESAN_FORM_KEGIATAN.lokasi,
      foto: PESAN_FORM_KEGIATAN.fotoKurang,
    });
  });

  it('periksa memakai foto yang sudah diambil', () => {
    const { result } = renderHook(() => useFormKegiatan());
    act(() => {
      result.current.ubah({ jenis: 'KUNJUNGAN', hasil: 'TERTARIK' });
      result.current.tambahFoto('file:///cache/a.jpg');
    });

    let isSah = false;
    act(() => {
      isSah = result.current.periksa(TITIK);
    });

    expect(isSah).toBe(true);
    expect(result.current.kesalahan).toEqual({});
  });

  it('ubahProspekBaru menggabungkan tanpa menghapus medan lain', () => {
    const { result } = renderHook(() => useFormKegiatan());

    act(() => result.current.ubahProspekBaru({ nama: 'Budi' }));
    act(() => result.current.ubahProspekBaru({ noTelp: '0812345678' }));

    expect(result.current.nilai.prospekBaru).toEqual({
      nama: 'Budi',
      noTelp: '0812345678',
      alamat: '',
      paketDiminati: '',
    });
  });

  it('reset mengosongkan nilai, kesalahan, dan foto lalu memakai nilai awal', () => {
    const { result } = renderHook(() => useFormKegiatan());
    act(() => {
      result.current.ubah({ jenis: 'KUNJUNGAN', catatan: 'lama' });
      result.current.tambahFoto('file:///cache/a.jpg');
      result.current.periksa(null);
    });

    act(() => result.current.reset({ prospekId: 'p-7' }));

    expect(result.current.nilai.jenis).toBeNull();
    expect(result.current.nilai.catatan).toBe('');
    expect(result.current.nilai.prospekId).toBe('p-7');
    expect(result.current.fotoLokal).toEqual([]);
    expect(result.current.kesalahan).toEqual({});
  });

  // Amandemen preflight (task-12): kestabilan `hapusFoto`/`ubahProspekBaru`
  // yang dijanjikan brief belum diuji sebelumnya — ditambahkan di sini.
  it('fungsi pengubah stabil antar render', () => {
    const { result, rerender } = renderHook(() => useFormKegiatan());
    const awal = result.current;

    rerender({});

    expect(result.current.ubah).toBe(awal.ubah);
    expect(result.current.reset).toBe(awal.reset);
    expect(result.current.tambahFoto).toBe(awal.tambahFoto);
    expect(result.current.hapusFoto).toBe(awal.hapusFoto);
    expect(result.current.ubahProspekBaru).toBe(awal.ubahProspekBaru);
  });
});
