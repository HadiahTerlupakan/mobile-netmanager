import { describe, expect, it } from '@jest/globals';

import { isRuteNotifikasiDikenal } from '@/utils/ruteNotifikasi';

describe('isRuteNotifikasiDikenal', () => {
  it('menerima tautan surat pengesahan dari push', () => {
    expect(isRuteNotifikasiDikenal('/pengesahan/doc-1')).toBe(true);
    expect(isRuteNotifikasiDikenal('/pengesahan')).toBe(true);
    expect(isRuteNotifikasiDikenal('/(app)/pengesahan/doc-1')).toBe(true);
  });

  it('tetap menerima rute lama (WO, chat, investor, presurvei)', () => {
    expect(isRuteNotifikasiDikenal('/work-order-detail/wo-1')).toBe(true);
    expect(isRuteNotifikasiDikenal('/chat/c-1')).toBe(true);
    expect(isRuteNotifikasiDikenal('/(investor)/dashboard')).toBe(true);
    expect(isRuteNotifikasiDikenal('/presurvei/rencana/r-1')).toBe(true);
  });

  it('menolak rute tak dikenal maupun awalan yang hanya mirip', () => {
    expect(isRuteNotifikasiDikenal('/admin/pengesahan')).toBe(false);
    expect(isRuteNotifikasiDikenal('/pengesahanpalsu')).toBe(false);
    expect(isRuteNotifikasiDikenal('https://contoh.test/pengesahan')).toBe(false);
  });
});
