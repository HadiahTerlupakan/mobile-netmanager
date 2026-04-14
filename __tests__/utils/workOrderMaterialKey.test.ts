import { describe, expect, it } from '@jest/globals';
import { buildWorkOrderMaterialKey } from '@/utils/workOrderMaterialKey';
import type { UsedMaterial } from '@/types/work-order';

type MaterialWithFallbackIds = UsedMaterial & {
  barangId?: string;
  gudangId?: string;
  kondisi?: 'BARU' | 'BEKAS' | 'RUSAK';
};

describe('workOrderMaterialKey utils', () => {
  it('menghasilkan key berbeda saat dua material punya label dan jumlah sama tetapi id berbeda', () => {
    const firstMaterial: UsedMaterial = {
      id: 'used-1',
      name: 'ONT ZTE F609V3',
      quantity: 1,
    };
    const secondMaterial: UsedMaterial = {
      id: 'used-2',
      name: 'ONT ZTE F609V3',
      quantity: 1,
    };

    expect(buildWorkOrderMaterialKey(firstMaterial, 0, 'used')).toBe('used-used-1');
    expect(buildWorkOrderMaterialKey(secondMaterial, 1, 'used')).toBe('used-used-2');
  });

  it('fallback ke key yang tetap unik saat id material kosong dan labelnya sama', () => {
    const firstMaterial = {
      id: '',
      name: 'ONT ZTE F609V3',
      quantity: 1,
    } as MaterialWithFallbackIds;
    const secondMaterial = {
      id: '',
      name: 'ONT ZTE F609V3',
      quantity: 1,
    } as MaterialWithFallbackIds;

    expect(buildWorkOrderMaterialKey(firstMaterial, 0, 'used')).toBe('used-ONT ZTE F609V3-1-0');
    expect(buildWorkOrderMaterialKey(secondMaterial, 1, 'used')).toBe('used-ONT ZTE F609V3-1-1');
  });

  it('memakai identitas barang dan kondisi saat payload returned material tidak membawa id utama', () => {
    const returnedMaterial = {
      id: '',
      barangId: 'barang-1',
      gudangId: 'gudang-2',
      kondisi: 'BEKAS',
      barangName: 'ONT ZTE F609V3',
      jumlah: 1,
    } as MaterialWithFallbackIds;

    expect(buildWorkOrderMaterialKey(returnedMaterial, 0, 'returned')).toBe(
      'returned-barang-1-gudang-2-BEKAS-0',
    );
  });
});
