import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';

import { AWALAN_ENDPOINT_PRESURVEI } from '@/constants/presurvei';
import { queryKeys } from '@/lib/queryClient';
import { DatabaseService } from '@/services/DatabaseService';
import { PresurveiService } from '@/services/PresurveiService';
import { ambilKegiatanMenunggu } from '@/utils/presurvei/antreanKegiatan';
import { rentangHariLokal } from '@/utils/presurvei/rentangHari';

/** Batas `limit` route (`kegiatan.validator.ts:24`); satu hari satu sales tidak melebihinya. */
const BATAS_KEGIATAN_SEHARI = 100;
const BATAS_RIWAYAT_PROSPEK = 20;
const WAKTU_SEGAR_MS = 60_000;
/** Halaman pertama; kegiatan harian & riwayat prospek di sini tidak pernah berhalaman lebih dari satu. */
const HALAMAN_PERTAMA = 1;
/**
 * Antrean offline dibaca langsung dari SQLite lokal, bukan server — cache
 * TanStack yang masih dianggap "segar" akan menyembunyikan kegiatan yang
 * baru saja disimpan atau baru saja tersinkron. 0 memaksa baca ulang tiap kali.
 */
const TANPA_STALE_TIME_MS = 0;

/** Event yang dipancarkan `SyncService` setelah satu item antrean terkirim (`SyncService.ts:431`). */
const EVENT_SINKRON_BERHASIL = 'sync:succeeded';

/** Kegiatan milik sendiri pada satu hari lokal. */
export function useKegiatanHarian(tanggal: Date) {
  const rentang = rentangHariLokal(tanggal);
  return useQuery({
    queryKey: queryKeys.presurvei.kegiatanHarian(rentang),
    queryFn: () =>
      PresurveiService.daftarKegiatan({ ...rentang, page: HALAMAN_PERTAMA, limit: BATAS_KEGIATAN_SEHARI }),
    staleTime: WAKTU_SEGAR_MS,
  });
}

/** Kegiatan yang tertaut ke satu prospek, terbaru lebih dulu. */
export function useKegiatanProspek(prospekId: string) {
  return useQuery({
    queryKey: queryKeys.presurvei.kegiatanProspek(prospekId),
    queryFn: () =>
      PresurveiService.daftarKegiatan({ prospekId, page: HALAMAN_PERTAMA, limit: BATAS_RIWAYAT_PROSPEK }),
    enabled: prospekId !== '',
  });
}

/**
 * Kegiatan yang masih di antrean offline: PENDING/RETRY ("Menunggu kirim")
 * maupun FAILED ("Gagal terkirim").
 *
 * Task 8 sempat memakai `DatabaseService.getPendingQueue()` (hanya
 * PENDING/RETRY) dan sengaja menyembunyikan FAILED. Ruling Task 14
 * membalik keputusan itu: kegiatan FAILED sudah berhenti dicoba ulang
 * tapi TIDAK boleh hilang dari pandangan sales, jadi dibaca lewat
 * `getAllQueueItems()` dan dibedakan lewat `KegiatanMenunggu.status` →
 * `BarisKegiatan.isGagal` (`daftarKegiatan.ts`).
 *
 * `getAllQueueItems()` melempar bila database antrean belum siap (dipakai
 * di tempat lain untuk membedakan "kosong" dari "tak tersedia"); di sini
 * kegagalan itu diredam jadi `[]`, sama seperti perilaku `getPendingQueue()`
 * sebelumnya — layar daftar kegiatan tidak boleh dianggap gagal-memuat
 * hanya karena antrean lokal belum siap.
 */
export function useKegiatanMenungguKirim() {
  return useQuery({
    queryKey: queryKeys.presurvei.antrean(),
    queryFn: async () => {
      try {
        return ambilKegiatanMenunggu(await DatabaseService.getAllQueueItems());
      } catch {
        return [];
      }
    },
    staleTime: TANPA_STALE_TIME_MS,
  });
}

/** Apakah endpoint antrean yang terkirim milik presurvei. */
export function isEndpointPresurvei(endpoint: unknown): boolean {
  return typeof endpoint === 'string' && endpoint.startsWith(AWALAN_ENDPOINT_PRESURVEI);
}

/** Segarkan data presurvei setiap kali antrean presurvei berhasil terkirim. */
export function useSegarkanPresurveiSetelahSinkron(): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    const langganan = DeviceEventEmitter.addListener(
      EVENT_SINKRON_BERHASIL,
      (muatan?: { endpoint?: unknown }) => {
        if (!isEndpointPresurvei(muatan?.endpoint)) return;
        void queryClient.invalidateQueries({ queryKey: queryKeys.presurvei.all });
      },
    );
    return () => langganan.remove();
  }, [queryClient]);
}
