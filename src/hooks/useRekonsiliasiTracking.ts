import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { LocationTrackingService } from '@/services/LocationTrackingService';
import api from '@/services/api';
import { harusHentikanTracking } from '@/services/rekonsiliasiTracking';
import type { AttendanceUiStatus } from '@/utils/attendanceStatus';
import { logger } from '@/utils/logger';

const ENDPOINT_STATUS_ABSEN = '/api/mobile/attendance/status';

/**
 * Matikan pelacakan yang tidak lagi beralasan, setiap aplikasi dibuka.
 *
 * Notifikasi "sedang melacak lokasi" bertahan selama layanan lokasi hidup,
 * termasuk saat aplikasi ditutup. Ketika itu terjadi, satu-satunya JS yang
 * berjalan adalah task background, sehingga perintah berhenti dari server baru
 * sampai pada tick lokasi berikutnya — dan tick itu bergantung pada gerakan.
 * HP yang diam di rumah sesudah check-out bisa menahan notifikasinya berjam-jam.
 *
 * Hook ini menutup celah itu dari sisi lain: begitu ada JS yang berjalan lagi,
 * keadaan dicocokkan ulang dengan status absen sebenarnya.
 */
export function useRekonsiliasiTracking() {
    const { token } = useAuth();
    const sedangMemeriksa = useRef(false);

    useEffect(() => {
        if (!token) return;

        const cocokkan = async () => {
            if (sedangMemeriksa.current) return;
            sedangMemeriksa.current = true;
            try {
                // Murah lebih dulu: tanpa pelacakan aktif, tidak ada yang perlu
                // dicocokkan dan server tidak perlu ditanya sama sekali.
                const sedangMelacak = await LocationTrackingService.isTrackingActive();
                if (!sedangMelacak) return;

                const statusAbsen = await ambilStatusAbsen();
                if (!harusHentikanTracking({ sedangMelacak, statusAbsen })) return;

                logger.info('[LocationTracking] Tidak sedang check-in, pelacakan dihentikan');
                await LocationTrackingService.stopTracking();
            } catch (error) {
                logger.warn('[LocationTracking] Rekonsiliasi gagal:', error);
            } finally {
                sedangMemeriksa.current = false;
            }
        };

        void cocokkan();

        const onAppState = (next: AppStateStatus) => {
            if (next === 'active') void cocokkan();
        };
        const langganan = AppState.addEventListener('change', onAppState);
        return () => langganan.remove();
    }, [token]);
}

/**
 * Status absen hari ini, atau `null` bila tidak terbaca.
 *
 * Galat jaringan sengaja menghasilkan `null`, bukan lemparan: status yang tidak
 * diketahui tidak boleh menghentikan pelacakan karyawan yang justru sedang
 * bekerja di daerah bersinyal buruk.
 */
async function ambilStatusAbsen(): Promise<AttendanceUiStatus | null> {
    try {
        const respons = await api.get(ENDPOINT_STATUS_ABSEN);
        const status = respons.data?.data?.status;
        return typeof status === 'string' ? (status as AttendanceUiStatus) : null;
    } catch (error) {
        logger.warn('[LocationTracking] Status absen tidak terbaca:', error);
        return null;
    }
}
