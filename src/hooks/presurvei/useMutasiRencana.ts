import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { queryKeys } from '@/lib/queryClient';
import { PresurveiService } from '@/services/PresurveiService';
import type { MuatanBuatRencana, MuatanTugaskanRencana, MuatanUbahRencana } from '@/types/presurvei';
import { presentAppError, presentErrorMessage, presentSuccessMessage } from '@/utils/errorPresenter';
import { isGalatKonflik } from '@/utils/galatIdempotensi';
import { createRequestId } from '@/utils/requestId';

/**
 * Mutasi rencana kunjungan. Sengaja online saja (tanpa antrean offline):
 * tanggal minimal "hari ini" dan status terbuka diputuskan server saat itu,
 * dan rencana yang diantre bisa sudah tidak sah saat terkirim.
 *
 * Semua mutasi `retry: false` (default aplikasi mengulang sekali) dan
 * meredam toast global karena `onError` di sini sudah menampilkan pesannya.
 */

const CAKUPAN_REQUEST_ID_RENCANA = 'rencana';
const JUDUL_RENCANA_DITUTUP = 'Rencana Sudah Ditutup';

/** Pesan 409: rencana sudah dilaporkan atau dibatalkan sejak layar dimuat. */
export const PESAN_RENCANA_DITUTUP =
  'Rencana ini sudah dilaporkan atau dibatalkan. Data terbaru sudah dimuat ulang.';

const OPSI_BERSAMA = { retry: false, meta: { skipGlobalErrorToast: true } } as const;

function useSegarkanPresurvei() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: queryKeys.presurvei.all });
}

/** Galat mutasi rencana: 409 dijelaskan dan data dimuat ulang, galat lain apa adanya. */
function useTanganiGalatRencana(layar: string) {
  const segarkan = useSegarkanPresurvei();
  return (error: unknown) => {
    if (isGalatKonflik(error)) {
      segarkan();
      presentErrorMessage(PESAN_RENCANA_DITUTUP, JUDUL_RENCANA_DITUTUP);
      return;
    }
    presentAppError(error, { screen: layar, source: 'mutation' });
  };
}

/**
 * Satu niat simpan = satu `requestId`. Kirim ulang dengan isian sama (mis.
 * setelah timeout) memakai kunci yang sama sehingga server men-dedupe; isian
 * yang berubah adalah niat baru dengan kunci baru.
 */
function useKunciPerNiat() {
  const niat = useRef<{ sidik: string; requestId: string } | null>(null);
  const kunciUntuk = (muatan: MuatanBuatRencana): string => {
    const sidik = JSON.stringify(muatan);
    if (niat.current?.sidik !== sidik) {
      niat.current = { sidik, requestId: createRequestId(CAKUPAN_REQUEST_ID_RENCANA) };
    }
    return niat.current.requestId;
  };
  const lupakan = () => {
    niat.current = null;
  };
  return { kunciUntuk, lupakan };
}

/** Muatan buat rencana: untuk diri sendiri, atau penugasan dari pemberi tugas. */
type MuatanRencanaBaru = MuatanBuatRencana | MuatanTugaskanRencana;

const PESAN_RENCANA_DIBUAT = 'Rencana dibuat';

/**
 * Buat rencana MANDIRI, atau tugaskan ke sales lain (muatan dengan
 * `salesId`). `pesanSukses` menyesuaikan toast, mis. "Penugasan terkirim ke …".
 */
export function useBuatRencana<M extends MuatanRencanaBaru = MuatanBuatRencana>(
  onSelesai: () => void,
  pesanSukses: (muatan: M) => string = () => PESAN_RENCANA_DIBUAT,
) {
  const segarkan = useSegarkanPresurvei();
  const tanganiGalat = useTanganiGalatRencana('BuatRencana');
  const kunci = useKunciPerNiat();
  return useMutation({
    ...OPSI_BERSAMA,
    mutationFn: (muatan: M) => PresurveiService.buatRencana(muatan, kunci.kunciUntuk(muatan)),
    onSuccess: (_rencana, muatan) => {
      kunci.lupakan();
      segarkan();
      presentSuccessMessage(pesanSukses(muatan));
      onSelesai();
    },
    onError: tanganiGalat,
  });
}

/** Ubah rencana yang masih terbuka (sales: MANDIRI miliknya; pemberi tugas: semua dalam lingkup). */
export function useUbahRencana(id: string, onSelesai: () => void) {
  const segarkan = useSegarkanPresurvei();
  const tanganiGalat = useTanganiGalatRencana('UbahRencana');
  return useMutation({
    ...OPSI_BERSAMA,
    mutationFn: (muatan: MuatanUbahRencana) => PresurveiService.ubahRencana(id, muatan),
    onSuccess: () => {
      segarkan();
      presentSuccessMessage('Rencana diperbarui');
      onSelesai();
    },
    onError: tanganiGalat,
  });
}

/** Batalkan rencana terbuka dengan alasan (hak sama dengan ubah). */
export function useBatalkanRencana(id: string, onSelesai: () => void) {
  const segarkan = useSegarkanPresurvei();
  const tanganiGalat = useTanganiGalatRencana('RincianRencana');
  return useMutation({
    ...OPSI_BERSAMA,
    mutationFn: (alasan: string) => PresurveiService.batalkanRencana(id, alasan),
    onSuccess: () => {
      segarkan();
      presentSuccessMessage('Rencana dibatalkan');
      onSelesai();
    },
    onError: tanganiGalat,
  });
}
