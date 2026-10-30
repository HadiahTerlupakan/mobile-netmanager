import { useEffect, useState } from 'react';

const DETIK_MS = 1000;
const MENIT_MS = 60 * DETIK_MS;
const JAM_MS = 60 * MENIT_MS;
const HARI_MS = 24 * JAM_MS;

const dua = (n: number) => n.toString().padStart(2, '0');

function sisaWaktu(selisihMs: number): string {
  const jam = Math.floor((selisihMs % HARI_MS) / JAM_MS);
  const menit = Math.floor((selisihMs % JAM_MS) / MENIT_MS);
  const detik = Math.floor((selisihMs % MENIT_MS) / DETIK_MS);
  return `${dua(jam)}:${dua(menit)}:${dua(detik)}`;
}

/** Sisa waktu "HH:MM:SS" sampai checkout kedaluwarsa; saat habis daftar tagihan dimuat ulang. */
export function useHitungMundurPembayaran(kedaluwarsa: Date | string | null | undefined, onHabis: () => void): string {
  const [sisa, setSisa] = useState('');

  useEffect(() => {
    if (!kedaluwarsa) {
      setSisa('');
      return;
    }
    const batas = new Date(kedaluwarsa).getTime();
    const perbarui = () => {
      const selisih = batas - Date.now();
      if (selisih <= 0) {
        setSisa('Kadaluarsa');
        onHabis();
        return;
      }
      setSisa(sisaWaktu(selisih));
    };

    perbarui();
    const interval = setInterval(perbarui, DETIK_MS);
    return () => clearInterval(interval);
  }, [kedaluwarsa, onHabis]);

  return sisa;
}
