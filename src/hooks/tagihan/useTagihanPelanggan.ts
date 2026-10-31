import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useMemo } from 'react';

import { isMenungguPelunasan } from '@/hooks/usePembayaranLunas';
import { queryKeys } from '@/lib/queryClient';
import { TagihanPelangganService } from '@/services/TagihanPelangganService';
import type { TagihanPelanggan } from '@/types/portalPelanggan';
import { isTagihanTerutang } from '@/utils/statusTagihanPelanggan';

/** SSE status pembayaran bisa putus tanpa tersambung lagi; polling ini cadangannya. */
const INTERVAL_CEK_PEMBAYARAN_MS = 15_000;
const STATUS_MENUNGGU = 'PENDING';

export interface DataTagihanPelanggan {
  /** Semua tagihan yang masih harus dibayar. */
  terbuka: TagihanPelanggan[];
  /** Tagihan terbaru semua status; hanya dimuat selama ada checkout yang dipantau. */
  terbaru: TagihanPelanggan[];
}

export interface RingkasanTagihan {
  /** Semua tagihan terbuka; seluruhnya dibayar dalam satu checkout. */
  terutang: TagihanPelanggan[];
  totalTerutang: number;
  jatuhTempoTerdekat: string | null;
  /** Tagihan yang checkout-nya menunggu dibayar. */
  tagihanMenunggu: TagihanPelanggan | undefined;
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
  return {
    terutang,
    totalTerutang: terutang.reduce((jumlah, tagihan) => jumlah + tagihan.remainingAmount, 0),
    jatuhTempoTerdekat: [...terutang].sort((a, b) => dayjs(a.dueDate).diff(b.dueDate))[0]?.dueDate ?? null,
    tagihanMenunggu: terutang.find((tagihan) => tagihan.lastPayment?.gatewayStatus === STATUS_MENUNGGU),
    daftarPantauan: data && gabungkanTagihan(data),
  };
}

/** Tagihan terbuka pelanggan, dipolling selama ada checkout yang dipantau. */
export function useTagihanPelanggan() {
  const query = useQuery({
    queryKey: queryKeys.portalPelanggan.tagihan(),
    queryFn: ({ client, queryKey }) => ambilDataTagihan(client.getQueryData<DataTagihanPelanggan>(queryKey)),
    refetchInterval: (kueri) => (isAdaYangDipantau(kueri.state.data) ? INTERVAL_CEK_PEMBAYARAN_MS : false),
  });
  const ringkasan = useMemo(() => ringkasTagihan(query.data), [query.data]);
  return { ...query, ringkasan };
}
