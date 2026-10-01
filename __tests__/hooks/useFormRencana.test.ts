import { describe, expect, it } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { useFormRencana } from '@/hooks/presurvei/useFormRencana';
import { nilaiFormRencanaBaru } from '@/utils/presurvei/formRencana';

const PROSPEK = { id: 'p-1', nama: 'Pak Budi', alamat: ' Jl. Melati 5 ' };

describe('useFormRencana — calon pelanggan', () => {
  it('memilih calon pelanggan mengisi alamat yang masih kosong', () => {
    const { result } = renderHook(() => useFormRencana(nilaiFormRencanaBaru('2026-09-26')));

    act(() => result.current.pilihProspek(PROSPEK));

    expect(result.current.nilai.prospekId).toBe('p-1');
    expect(result.current.nilai.alamat).toBe('Jl. Melati 5');
    expect(result.current.alamatProspek).toBe('Jl. Melati 5');
  });

  it('alamat yang sudah diketik tidak ditimpa; lepas menghapus alamat prospek', () => {
    const { result } = renderHook(() => useFormRencana(nilaiFormRencanaBaru('2026-09-26')));

    act(() => result.current.ubah({ alamat: 'Warung Bu Siti' }));
    act(() => result.current.pilihProspek(PROSPEK));
    expect(result.current.nilai.alamat).toBe('Warung Bu Siti');

    act(() => result.current.lepasProspek());
    expect(result.current.alamatProspek).toBeNull();
    expect(result.current.nilai.prospekId).toBeNull();
  });
});
