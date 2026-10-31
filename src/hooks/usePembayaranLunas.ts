import { useEffect, useRef, useState } from 'react';

import type { PembayaranTerakhir } from '@/types/portalPelanggan';
import { nominalCheckout, nomorTagihanCheckout } from '@/utils/tagihan/checkoutPelanggan';

export interface TagihanDipantau {
  id: string;
  invoiceNumber: string;
  status: string;
  lastPayment?: Pick<PembayaranTerakhir, 'amount' | 'gatewayStatus' | 'checkoutTotal' | 'checkoutInvoiceNumbers'> | null;
}

export interface PembayaranLunas {
  /** Semua tagihan yang dilunasi checkout ini. */
  daftarNomorTagihan: string[];
  /** Yang dibayar untuk seluruh checkout, sudah dipotong kupon. */
  nominal: number;
  /** Pelanggan isolir/nonaktif saat membayar: pelunasan ini yang memulihkan layanannya. */
  isLayananDipulihkan: boolean;
}

const STATUS_LUNAS = 'PAID';
const STATUS_MENUNGGU = 'PENDING';
/** Status pelanggan yang dipulihkan server menjadi AKTIF begitu tagihannya lunas. */
const STATUS_PELANGGAN_TERPUTUS = new Set(['ISOLIR', 'NONAKTIF']);

/**
 * Checkout yang belum selesai dari sisi pelanggan: masih menunggu dibayar, atau
 * sudah dibayar tetapi tagihannya belum ditandai lunas. Webhook melunasi
 * pembayaran sesaat sebelum tagihannya, jadi keadaan kedua memang terlihat.
 */
export function isMenungguPelunasan(tagihan: TagihanDipantau): boolean {
  const status = tagihan.lastPayment?.gatewayStatus;
  return status === STATUS_MENUNGGU || (status === STATUS_LUNAS && tagihan.status !== STATUS_LUNAS);
}

/** Checkout yang tercatat saat menunggu, diperbarui dari pembayaran yang benar-benar lunas. */
function pelunasanDari(tagihan: TagihanDipantau, tercatat: PembayaranLunas): PembayaranLunas {
  const pembayaran = tagihan.lastPayment;
  if (pembayaran?.gatewayStatus !== STATUS_LUNAS) return tercatat;
  return {
    ...tercatat,
    nominal: nominalCheckout(pembayaran),
    daftarNomorTagihan: nomorTagihanCheckout(pembayaran, tagihan.invoiceNumber),
  };
}

function catatMenunggu(tagihan: TagihanDipantau, isDipulihkan: boolean): PembayaranLunas {
  const pembayaran = tagihan.lastPayment!;
  return {
    daftarNomorTagihan: nomorTagihanCheckout(pembayaran, tagihan.invoiceNumber),
    nominal: nominalCheckout(pembayaran),
    isLayananDipulihkan: isDipulihkan,
  };
}

/**
 * Tagihan yang tadinya menunggu pembayaran lalu terbaca lunas, dari SSE,
 * polling, maupun cek status manual: semuanya berakhir di refetch daftar
 * tagihan, jadi perubahan dibaca dari daftar itu, bukan dari tiap sumber.
 *
 * Status pelanggan diingat sejak checkout menunggu: server memulihkan status
 * begitu tagihan lunas, jadi profil yang terbaca sesudahnya sudah AKTIF.
 */
export function usePembayaranLunas(daftar: TagihanDipantau[] | undefined, statusPelanggan?: string) {
  const menungguRef = useRef(new Map<string, PembayaranLunas>());
  const [lunas, setLunas] = useState<PembayaranLunas | null>(null);

  useEffect(() => {
    if (!daftar) return;
    const baruLunas = daftar.find((tagihan) => tagihan.status === STATUS_LUNAS && menungguRef.current.has(tagihan.id));
    if (baruLunas) setLunas(pelunasanDari(baruLunas, menungguRef.current.get(baruLunas.id)!));

    const isTerputus = STATUS_PELANGGAN_TERPUTUS.has(statusPelanggan ?? '');
    menungguRef.current = new Map(
      daftar
        .filter(isMenungguPelunasan)
        .map((tagihan) => [tagihan.id, catatMenunggu(tagihan, isTerputus || Boolean(menungguRef.current.get(tagihan.id)?.isLayananDipulihkan))]),
    );
  }, [daftar, statusPelanggan]);

  return { lunas, tutup: () => setLunas(null) };
}
