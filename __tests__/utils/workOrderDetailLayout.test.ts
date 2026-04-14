import { describe, expect, it } from '@jest/globals';
import {
  getWorkOrderDetailActionBarPaddingBottom,
  getWorkOrderDetailScrollPaddingBottom,
} from '@/utils/workOrderDetailLayout';

describe('workOrderDetailLayout utils', () => {
  it('menggunakan safe area normal untuk action bar saat tab bar disembunyikan', () => {
    expect(getWorkOrderDetailActionBarPaddingBottom(0)).toBe(16);
    expect(getWorkOrderDetailActionBarPaddingBottom(12)).toBe(16);
    expect(getWorkOrderDetailActionBarPaddingBottom(24)).toBe(24);
  });

  it('memberi ruang scroll yang cukup untuk action bar tanpa membuat area bawah berlebihan', () => {
    expect(getWorkOrderDetailScrollPaddingBottom(0)).toBe(120);
    expect(getWorkOrderDetailScrollPaddingBottom(24)).toBe(144);
  });
});
