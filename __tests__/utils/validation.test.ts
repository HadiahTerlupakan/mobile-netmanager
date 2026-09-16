import { describe, expect, it } from '@jest/globals';

import {
  CONTACT_NAME_MIN_LENGTH,
  RequestWorkOrderContactSchema,
  validateData,
} from '@/utils/validation';

// Kontak pelanggan Request WO mode Customer diketik manual oleh teknisi,
// jadi semua batas & pesan error datang dari schema ini.
describe('RequestWorkOrderContactSchema', () => {
  const parseErrorMessages = (input: unknown): string[] => {
    const result = RequestWorkOrderContactSchema.safeParse(input);
    return result.success ? [] : result.error.issues.map((issue) => issue.message);
  };

  it('menerima kontak lengkap dan memangkas spasi di tiap field', () => {
    const result = RequestWorkOrderContactSchema.safeParse({
      contactName: '  Budi Santoso  ',
      contactPhone: ' 081234567890 ',
      locationAddress: '  Jl. Mawar No. 1  ',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      contactName: 'Budi Santoso',
      contactPhone: '081234567890',
      locationAddress: 'Jl. Mawar No. 1',
    });
  });

  it('menerima kontak tanpa No. HP dan alamat karena keduanya opsional', () => {
    expect(RequestWorkOrderContactSchema.safeParse({ contactName: 'Budi' }).success).toBe(true);
    expect(
      RequestWorkOrderContactSchema.safeParse({
        contactName: 'Budi',
        contactPhone: '',
        locationAddress: '',
      }).success,
    ).toBe(true);
  });

  it('menerima batas panjang tepat di tiap field', () => {
    const result = RequestWorkOrderContactSchema.safeParse({
      contactName: 'a'.repeat(CONTACT_NAME_MIN_LENGTH),
      contactPhone: '1'.repeat(20),
      locationAddress: 'a'.repeat(500),
    });

    expect(result.success).toBe(true);
    expect(RequestWorkOrderContactSchema.safeParse({ contactName: 'a'.repeat(100) }).success).toBe(true);
  });

  it('menolak nama yang kurang dari 3 karakter setelah dipangkas', () => {
    expect(parseErrorMessages({ contactName: '  ab  ' })).toEqual(['Nama pelanggan minimal 3 karakter']);
    expect(parseErrorMessages({ contactName: '' })).toEqual(['Nama pelanggan minimal 3 karakter']);
  });

  it('menolak nama yang tidak dikirim dengan pesan berbahasa Indonesia', () => {
    expect(parseErrorMessages({})).toEqual(['Nama pelanggan wajib diisi']);
  });

  it.each([
    { field: 'contactName', value: 'a'.repeat(101), message: 'Nama pelanggan maksimal 100 karakter' },
    { field: 'contactPhone', value: '1'.repeat(21), message: 'No. HP maksimal 20 karakter' },
    { field: 'locationAddress', value: 'a'.repeat(501), message: 'Alamat maksimal 500 karakter' },
  ])('menolak $field yang melebihi batas panjang', ({ field, value, message }) => {
    expect(parseErrorMessages({ contactName: 'Budi', [field]: value })).toEqual([message]);
  });

  it('menggabungkan semua pesan error lewat validateData', () => {
    expect(
      validateData(RequestWorkOrderContactSchema, {
        contactName: 'ab',
        contactPhone: '1'.repeat(21),
      }),
    ).toEqual({
      success: false,
      error: 'Nama pelanggan minimal 3 karakter, No. HP maksimal 20 karakter',
    });
  });
});
