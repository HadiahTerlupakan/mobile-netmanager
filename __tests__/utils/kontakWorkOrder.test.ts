import { describe, expect, it } from '@jest/globals';

import { nomorWhatsApp } from '@/utils/kontakWorkOrder';

describe('nomorWhatsApp', () => {
  it('menormalkan nomor lokal ke format 62', () => {
    expect(nomorWhatsApp('0812-3456-7890')).toBe('6281234567890');
    expect(nomorWhatsApp('81234567890')).toBe('6281234567890');
    expect(nomorWhatsApp('+62 812 3456 7890')).toBe('6281234567890');
  });
});
