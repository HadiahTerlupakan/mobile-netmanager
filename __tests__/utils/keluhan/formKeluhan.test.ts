import { keMuatanLaporKeluhan, NILAI_FORM_KELUHAN_BARU, periksaFormKeluhan } from '@/utils/keluhan/formKeluhan';

describe('periksaFormKeluhan', () => {
  it('menolak judul & cerita yang terlalu pendek', () => {
    expect(periksaFormKeluhan({ ...NILAI_FORM_KELUHAN_BARU, subjek: ' a ', deskripsi: 'mati' })).toEqual({
      subjek: expect.any(String),
      deskripsi: expect.any(String),
    });
  });

  it('menerima isian lengkap dan memangkas spasi di muatan', () => {
    const nilai = { ...NILAI_FORM_KELUHAN_BARU, subjek: ' Internet mati ', deskripsi: ' Sejak pagi LOS merah ' };
    expect(periksaFormKeluhan(nilai)).toEqual({});
    expect(keMuatanLaporKeluhan('p1', nilai)).toEqual({
      pelangganId: 'p1',
      kategori: 'TECHNICAL',
      prioritas: 'MEDIUM',
      subjek: 'Internet mati',
      deskripsi: 'Sejak pagi LOS merah',
    });
  });
});
