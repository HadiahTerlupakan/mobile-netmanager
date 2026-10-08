import {
  labelNasibPengajuan,
  nasibPengajuan,
} from '@/utils/statusPengajuanWo';

/**
 * Status mentah tidak bisa langsung ditampilkan ke pengaju: penolakan disimpan
 * sebagai `CANCELLED` dengan `rejectionReason`, sedangkan `CANCELLED` tanpa
 * alasan berarti dibatalkan. Keduanya status yang sama di basis data tetapi
 * dua kejadian berbeda bagi orang yang mengajukan.
 */

describe('nasib pengajuan work order', () => {
  it('REQUESTED berarti masih menunggu', () => {
    expect(nasibPengajuan({ status: 'REQUESTED' })).toBe('menunggu');
  });

  it('penolakan dikenali dari adanya alasan', () => {
    expect(
      nasibPengajuan({ status: 'CANCELLED', rejectionReason: 'Bukan wilayah kita' }),
    ).toBe('ditolak');
  });

  // Tanpa pembeda ini, pembatalan biasa akan tampil sebagai penolakan dan
  // teknisi mencari-cari alasan yang tidak pernah ada.
  it('dibatalkan tanpa alasan bukan penolakan', () => {
    expect(nasibPengajuan({ status: 'CANCELLED' })).toBe('dibatalkan');
    expect(nasibPengajuan({ status: 'CANCELLED', rejectionReason: null })).toBe(
      'dibatalkan',
    );
  });

  // Persetujuan tidak punya status sendiri — pengajuan hanya berpindah ke alur
  // work order biasa, jadi status apa pun selain dua di atas berarti disetujui.
  it.each(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'])(
    '%s berarti sudah disetujui',
    (status) => {
      expect(nasibPengajuan({ status })).toBe('disetujui');
    },
  );
});

describe('label nasib', () => {
  it('memberi kalimat yang bisa dibaca pengaju', () => {
    expect(labelNasibPengajuan('menunggu')).toBe('Menunggu persetujuan');
    expect(labelNasibPengajuan('ditolak')).toBe('Ditolak');
  });
});
