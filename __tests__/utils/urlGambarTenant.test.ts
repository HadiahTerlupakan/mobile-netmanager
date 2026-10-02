import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@/services/TenantService', () => ({
  TenantService: { getTenantUrl: () => 'https://radpro.example.com/' },
}));

import { urlGambarTenant } from '@/utils/urlGambarTenant';

describe('urlGambarTenant', () => {
  it('menggabung jalur relatif dengan domain tenant', () => {
    expect(urlGambarTenant('uploads/a.jpg')).toBe('https://radpro.example.com/uploads/a.jpg');
    expect(urlGambarTenant('/uploads/a.jpg')).toBe('https://radpro.example.com/uploads/a.jpg');
  });

  it('URL absolut dipakai apa adanya, kosong jadi null', () => {
    expect(urlGambarTenant('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
    expect(urlGambarTenant(null)).toBeNull();
    expect(urlGambarTenant('')).toBeNull();
  });
});
