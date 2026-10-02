import { keMuatanLaporKeluhan, NILAI_FORM_KELUHAN_BARU, periksaFormKeluhan } from '@/utils/keluhan/formKeluhan';

const FOTO_LOKAL = ['file:///cache/modem.jpg'];

describe('periksaFormKeluhan', () => {
  it('menolak judul & cerita yang terlalu pendek', () => {
    expect(periksaFormKeluhan({ ...NILAI_FORM_KELUHAN_BARU, subjek: ' a ', deskripsi: 'mati', fotoLokal: FOTO_LOKAL })).toEqual({
      subjek: expect.any(String),
      deskripsi: expect.any(String),
    });
  });

  it('foto wajib minimal satu', () => {
    const nilai = { ...NILAI_FORM_KELUHAN_BARU, subjek: 'Internet mati', deskripsi: 'Sejak pagi LOS merah' };
    expect(periksaFormKeluhan(nilai)).toEqual({ foto: expect.stringContaining('minimal satu foto') });
    expect(periksaFormKeluhan({ ...nilai, fotoLokal: FOTO_LOKAL })).toEqual({});
  });

  it('muatan memakai URL foto terunggah dan memangkas spasi', () => {
    const nilai = { ...NILAI_FORM_KELUHAN_BARU, subjek: ' Internet mati ', deskripsi: ' Sejak pagi LOS merah ', fotoLokal: FOTO_LOKAL };
    expect(keMuatanLaporKeluhan('p1', nilai, ['https://isp.example/uploads/tickets/a.webp'])).toEqual({
      pelangganId: 'p1',
      kategori: 'TECHNICAL',
      prioritas: 'MEDIUM',
      subjek: 'Internet mati',
      deskripsi: 'Sejak pagi LOS merah',
      foto: ['https://isp.example/uploads/tickets/a.webp'],
    });
  });
});
