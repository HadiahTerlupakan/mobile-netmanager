import { useEffect, useRef, useState } from 'react';

export interface TagihanDipantau {
  id: string;
  invoiceNumber: string;
  status: string;
  lastPayment?: { amount: number; gatewayStatus?: string | null } | null;
}

export interface PembayaranLunas {
  nomorTagihan: string;
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
    if (baruLunas) setLunas(menungguRef.current.get(baruLunas.id) ?? null);

    const isTerputus = STATUS_PELANGGAN_TERPUTUS.has(statusPelanggan ?? '');
    menungguRef.current = new Map(
      daftar.filter(isMenungguPelunasan).map((tagihan) => [
        tagihan.id,
        {
          nomorTagihan: tagihan.invoiceNumber,
          nominal: tagihan.lastPayment!.amount,
          isLayananDipulihkan: isTerputus || Boolean(menungguRef.current.get(tagihan.id)?.isLayananDipulihkan),
        },
      ]),
    );
  }, [daftar, statusPelanggan]);

  return { lunas, tutup: () => setLunas(null) };
}
