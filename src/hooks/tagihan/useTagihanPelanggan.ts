import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useCallback, useMemo } from 'react';

import { isMenungguPelunasan } from '@/hooks/usePembayaranLunas';
import { queryKeys } from '@/lib/queryClient';
import { TagihanPelangganService } from '@/services/TagihanPelangganService';
import type { TagihanPelanggan } from '@/types/portalPelanggan';
import { isTagihanHarusDibayar, isTagihanTerutang } from '@/utils/statusTagihanPelanggan';
import { isCheckoutKedaluwarsa, isTransferManual } from '@/utils/tagihan/checkoutPelanggan';

/** SSE status pembayaran bisa putus tanpa tersambung lagi; polling ini cadangannya. */
const INTERVAL_CEK_PEMBAYARAN_MS = 15_000;
const STATUS_MENUNGGU = 'PENDING';
const STATUS_GAGAL = 'FAILED';

export interface DataTagihanPelanggan {
  /** Semua tagihan yang masih harus dibayar. */
  terbuka: TagihanPelanggan[];
  /** Tagihan terbaru semua status; hanya dimuat selama ada checkout yang dipantau. */
  terbaru: TagihanPelanggan[];
}

export interface RingkasanTagihan {
  /**
   * Semua tagihan terbuka; seluruhnya dibayar dalam satu checkout, termasuk
   * yang bernominal Rp 0 (server melunasinya bersama checkout itu).
   */
  terutang: TagihanPelanggan[];
  /** Tagihan terbuka yang masih ada sisanya, untuk ditampilkan. */
  jumlahHarusDibayar: number;
  totalTerutang: number;
  jatuhTempoTerdekat: string | null;
  /** Tagihan yang checkout-nya menunggu dibayar. */
  tagihanMenunggu: TagihanPelanggan | undefined;
  /** Tagihan yang bukti transfer manual terakhirnya ditolak admin. */
  tagihanDitolak: TagihanPelanggan | undefined;
  /** Tagihan terbuka + terbaru, untuk membaca checkout yang lunas (usePembayaranLunas). */
  daftarPantauan: TagihanPelanggan[] | undefined;
}

function gabungkanTagihan({ terbuka, terbaru }: DataTagihanPelanggan): TagihanPelanggan[] {
  const idTerbuka = new Set(terbuka.map((tagihan) => tagihan.id));
  return [...terbuka, ...terbaru.filter((tagihan) => !idTerbuka.has(tagihan.id))];
}

function isAdaYangDipantau(data: DataTagihanPelanggan | undefined): boolean {
  return Boolean(data && gabungkanTagihan(data).some(isMenungguPelunasan));
}

/**
 * Polling cadangan SSE hanya selama checkout yang dipantau masih bisa lunas:
 * checkout yang lewat batas waktunya tidak bisa dibayar lagi.
 */
export function isPerluDipolling(data: DataTagihanPelanggan | undefined, sekarang = Date.now()): boolean {
  if (!data) return false;
  return gabungkanTagihan(data).some(
    (tagihan) => isMenungguPelunasan(tagihan) && !isCheckoutKedaluwarsa(tagihan.lastPayment!, sekarang),
  );
}

/**
 * Tagihan yang lunas keluar dari daftar terbuka, jadi selama data sebelumnya
 * memuat checkout yang dipantau, tagihan terbaru ikut dimuat agar pelunasan
 * (atau pembatalan) tagihan itu terbaca.
 */
async function ambilDataTagihan(sebelumnya: DataTagihanPelanggan | undefined): Promise<DataTagihanPelanggan> {
  const [terbuka, terbaru] = await Promise.all([
    TagihanPelangganService.tagihanTerbuka(),
    isAdaYangDipantau(sebelumnya) ? TagihanPelangganService.tagihanTerbaru() : Promise.resolve([]),
  ]);
  return { terbuka, terbaru };
}

/** Total, jatuh tempo terdekat, dan checkout yang menunggu dari data tagihan. */
export function ringkasTagihan(data: DataTagihanPelanggan | undefined): RingkasanTagihan {
  const terutang = (data?.terbuka ?? []).filter((tagihan) => isTagihanTerutang(tagihan.status));
  const harusDibayar = terutang.filter(isTagihanHarusDibayar);
  return {
    terutang,
    jumlahHarusDibayar: harusDibayar.length,
    totalTerutang: terutang.reduce((jumlah, tagihan) => jumlah + tagihan.remainingAmount, 0),
    jatuhTempoTerdekat: [...harusDibayar].sort((a, b) => dayjs(a.dueDate).diff(b.dueDate))[0]?.dueDate ?? null,
    tagihanMenunggu: terutang.find((tagihan) => tagihan.lastPayment?.gatewayStatus === STATUS_MENUNGGU),
    tagihanDitolak: terutang.find(
      ({ lastPayment }) => lastPayment?.gatewayStatus === STATUS_GAGAL && isTransferManual(lastPayment),
    ),
    daftarPantauan: data && gabungkanTagihan(data),
  };
}

/** Muat ulang data tagihan; hasilnya memuat data terbaru atau galatnya. */
export type MuatUlangTagihan = () => Promise<{ data?: DataTagihanPelanggan; error: Error | null }>;

/** Tagihan terbuka pelanggan, dipolling selama ada checkout yang dipantau. */
export function useTagihanPelanggan() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.portalPelanggan.tagihan(),
    queryFn: ({ client, queryKey }) => ambilDataTagihan(client.getQueryData<DataTagihanPelanggan>(queryKey)),
    refetchInterval: (kueri) => (isPerluDipolling(kueri.state.data) ? INTERVAL_CEK_PEMBAYARAN_MS : false),
  });
  const ringkasan = useMemo(() => ringkasTagihan(query.data), [query.data]);
  // Dibaca dari cache saat dipanggil: checkout yang baru dibuat sudah ada di
  // sana sebelum layar sempat dirender ulang dengan data itu.
  const ambilTagihanMenunggu = useCallback(
    () => ringkasTagihan(queryClient.getQueryData<DataTagihanPelanggan>(queryKeys.portalPelanggan.tagihan())).tagihanMenunggu,
    [queryClient],
  );
  return { ...query, ringkasan, ambilTagihanMenunggu };
}
