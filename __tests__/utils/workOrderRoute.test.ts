import {
  normalizeWorkOrderRouteParam,
  resolveCanonicalWorkOrderId,
} from '@/utils/workOrderRoute';

describe('workOrderRoute utils', () => {
  it('menormalkan route param string tunggal', () => {
    expect(normalizeWorkOrderRouteParam('wo-123')).toBe('wo-123');
  });

  it('mengambil elemen pertama dari route param array', () => {
    expect(normalizeWorkOrderRouteParam(['wo-123', 'wo-999'])).toBe('wo-123');
  });

  it('mengembalikan null untuk route param kosong', () => {
    expect(normalizeWorkOrderRouteParam(undefined)).toBeNull();
    expect(normalizeWorkOrderRouteParam('')).toBeNull();
    expect(normalizeWorkOrderRouteParam([''])).toBeNull();
  });

  it('memprioritaskan id canonical dari detail work order bila tersedia', () => {
    expect(resolveCanonicalWorkOrderId('wo-param', 'wo-detail')).toBe('wo-detail');
  });

  it('fallback ke route param yang valid bila detail belum tersedia', () => {
    expect(resolveCanonicalWorkOrderId('wo-param', null)).toBe('wo-param');
  });
});
