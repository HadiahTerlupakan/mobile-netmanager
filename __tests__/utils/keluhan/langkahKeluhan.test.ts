import type { DetailKeluhan, WoKeluhan } from '@/types/keluhan';
import { pesanKabarKeluhan, susunLangkahKeluhan } from '@/utils/keluhan/langkahKeluhan';

const WO: WoKeluhan = {
  id: 'wo1',
  nomor: 'WO-20261002-0001',
  jenis: 'TROUBLESHOOT',
  status: 'ASSIGNED',
  namaTeknisi: 'Budi',
  jadwal: '2026-10-03T03:00:00.000Z',
  jamJadwal: '09:00',
  dimulaiPada: null,
  selesaiPada: null,
};

function keluhan(ubah: Partial<DetailKeluhan> = {}): DetailKeluhan {
  return {
    id: 'tk1',
    nomor: 'TKT-1',
    subjek: 'Internet mati',
    kategori: 'TECHNICAL',
    prioritas: 'HIGH',
    status: 'OPEN',
    dibuatPada: '2026-10-02T01:00:00.000Z',
    diperbaruiPada: '2026-10-02T01:00:00.000Z',
    namaSales: 'Ani',
    namaPelapor: 'Ani',
    deskripsi: 'LOS merah',
    selesaiPada: null,
    pelanggan: { id: 'p1', nama: 'Bu Sari', idPelanggan: '77001', noTelp: '0812', alamat: null },
    balasan: [],
    workOrders: [],
    ...ubah,
  };
}

const status = (langkah: ReturnType<typeof susunLangkahKeluhan>) => langkah.map((item) => [item.kunci, item.isSelesai]);

describe('susunLangkahKeluhan', () => {
  it('keluhan teknis baru: hanya "Dilaporkan" yang selesai, langkah teknisi tampil', () => {
    expect(status(susunLangkahKeluhan(keluhan()))).toEqual([
      ['DILAPORKAN', true],
      ['DITANGANI', false],
      ['DIJADWALKAN', false],
      ['DIKERJAKAN', false],
      ['SELESAI', false],
    ]);
  });

  it('WO dibuat: ditangani & dijadwalkan selesai, keterangan memuat nomor WO dan teknisi', () => {
    const langkah = susunLangkahKeluhan(keluhan({ status: 'IN_PROGRESS', workOrders: [WO] }));
    expect(status(langkah).slice(0, 4)).toEqual([
      ['DILAPORKAN', true],
      ['DITANGANI', true],
      ['DIJADWALKAN', true],
      ['DIKERJAKAN', false],
    ]);
    expect(langkah[2].keterangan).toContain('WO-20261002-0001 · Budi');
    expect(langkah[2].keterangan).toContain('09:00');
  });

  it('WO dimulai lalu tiket RESOLVED: semua langkah selesai', () => {
    const langkah = susunLangkahKeluhan(
      keluhan({ status: 'RESOLVED', selesaiPada: '2026-10-03T05:00:00.000Z', workOrders: [{ ...WO, status: 'COMPLETED', dimulaiPada: '2026-10-03T03:10:00.000Z' }] }),
    );
    expect(langkah.every((item) => item.isSelesai)).toBe(true);
  });

  it('keluhan tagihan tanpa WO tidak menampilkan langkah teknisi; balasan helpdesk = ditangani', () => {
    const langkah = susunLangkahKeluhan(
      keluhan({
        kategori: 'BILLING',
        balasan: [{ id: 'r1', pesan: 'Kami cek', dariHelpdesk: true, namaPengirim: 'CS', waktu: '2026-10-02T02:00:00.000Z', lampiran: [] }],
      }),
    );
    expect(status(langkah)).toEqual([
      ['DILAPORKAN', true],
      ['DITANGANI', true],
      ['SELESAI', false],
    ]);
  });
});

describe('pesanKabarKeluhan', () => {
  it('menyebut nomor tiket saat baru diteruskan, jadwal teknisi saat ada WO, dan selesai saat tuntas', () => {
    expect(pesanKabarKeluhan(keluhan(), 'Ani')).toContain('nomor TKT-1');
    expect(pesanKabarKeluhan(keluhan({ workOrders: [WO] }), 'Ani')).toContain('Teknisi dijadwalkan: WO-20261002-0001 · Budi');
    expect(pesanKabarKeluhan(keluhan({ status: 'RESOLVED' }), 'Ani')).toContain('sudah diselesaikan');
  });
});
