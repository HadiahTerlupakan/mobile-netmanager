import { harusHentikanTracking } from '@/services/rekonsiliasiTracking';

/**
 * Notifikasi "sedang melacak lokasi" bertahan selama layanan lokasi hidup,
 * termasuk ketika aplikasi ditutup. Saat itu satu-satunya JS yang berjalan
 * adalah task background, jadi perintah berhenti dari server bergantung pada
 * tick lokasi — dan tick itu bergantung pada gerakan. HP yang diam sesudah
 * check-out bisa menahan notifikasinya berjam-jam.
 *
 * Yang dijaga di sini: pencocokan ulang berhenti pada kasus yang benar, dan
 * TIDAK berhenti ketika status absen belum diketahui.
 */

describe('harusHentikanTracking', () => {
    it('berhenti setelah check-out', () => {
        expect(
            harusHentikanTracking({ sedangMelacak: true, statusAbsen: 'checked-out' }),
        ).toBe(true);
    });

    it('berhenti bila belum absen sama sekali', () => {
        expect(
            harusHentikanTracking({ sedangMelacak: true, statusAbsen: 'idle' }),
        ).toBe(true);
    });

    it('tetap jalan selama masih check-in', () => {
        expect(
            harusHentikanTracking({ sedangMelacak: true, statusAbsen: 'checked-in' }),
        ).toBe(false);
    });

    // Status tak terbaca umumnya berarti offline, bukan berarti sudah pulang.
    it('status belum diketahui tidak menghentikan pelacakan', () => {
        expect(
            harusHentikanTracking({ sedangMelacak: true, statusAbsen: null }),
        ).toBe(false);
    });

    it('tanpa pelacakan aktif tidak ada yang perlu dihentikan', () => {
        for (const statusAbsen of ['idle', 'checked-in', 'checked-out', null] as const) {
            expect(harusHentikanTracking({ sedangMelacak: false, statusAbsen })).toBe(
                false,
            );
        }
    });
});
