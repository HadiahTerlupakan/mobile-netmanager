import { useEffect, useState } from 'react';

import type { TampilanRencana } from '@/utils/presurvei/timRencana';
import { useLingkupRencana } from './useLingkupRencana';

/** Permintaan membuka tampilan Tim dari luar tab (kartu "Tim hari ini" di Beranda). */
export interface FokusTimRencana {
  /** null = semua anggota. */
  salesId: string | null;
  /** Berbeda tiap ketukan; permintaan yang sama diterapkan ulang. */
  kunci: string;
}

/**
 * Tampilan sub-tab Rencana. Bawaan "saya": kepala sales tetap sales lapangan
 * dan agendanya sendiri yang paling sering dibuka; tim dipantau dari kartu
 * "Tim hari ini" yang langsung membuka tampilan Tim. Sales biasa (bukan
 * pemberi tugas) selalu "saya".
 */
export function useTampilanRencana(fokusTim: FokusTimRencana | null) {
  const lingkup = useLingkupRencana();
  const [tampilan, setTampilan] = useState<TampilanRencana>('saya');
  const [salesIdTim, setSalesIdTim] = useState<string | null>(null);

  useEffect(() => {
    if (fokusTim === null) return;
    setTampilan('tim');
    setSalesIdTim(fokusTim.salesId);
  }, [fokusTim]);

  return {
    lingkup,
    tampilan: lingkup.isPemberiTugas ? tampilan : ('saya' as const),
    ubahTampilan: setTampilan,
    salesIdTim,
    ubahSalesIdTim: setSalesIdTim,
  };
}
