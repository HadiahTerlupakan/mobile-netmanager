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
}

const STATUS_LUNAS = 'PAID';
const STATUS_MENUNGGU = 'PENDING';

/**
 * Tagihan yang tadinya menunggu pembayaran lalu terbaca lunas, dari SSE,
 * polling, maupun cek status manual: semuanya berakhir di refetch daftar
 * tagihan, jadi perubahan dibaca dari daftar itu, bukan dari tiap sumber.
 */
export function usePembayaranLunas(daftar: TagihanDipantau[] | undefined) {
  const menungguRef = useRef(new Map<string, PembayaranLunas>());
  const [lunas, setLunas] = useState<PembayaranLunas | null>(null);

  useEffect(() => {
    if (!daftar) return;
    const baruLunas = daftar.find((tagihan) => tagihan.status === STATUS_LUNAS && menungguRef.current.has(tagihan.id));
    if (baruLunas) setLunas(menungguRef.current.get(baruLunas.id) ?? null);

    menungguRef.current = new Map(
      daftar
        .filter((tagihan) => tagihan.lastPayment?.gatewayStatus === STATUS_MENUNGGU)
        .map((tagihan) => [tagihan.id, { nomorTagihan: tagihan.invoiceNumber, nominal: tagihan.lastPayment!.amount }]),
    );
  }, [daftar]);

  return { lunas, tutup: () => setLunas(null) };
}
