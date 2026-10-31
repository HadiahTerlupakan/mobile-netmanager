import { useEffect, useRef, useState } from 'react';

const DETIK_MS = 1000;
const MENIT_MS = 60 * DETIK_MS;
const JAM_MS = 60 * MENIT_MS;

/** Keadaan hitung mundur checkout yang menunggu dibayar. */
export interface HitungMundur {
  /** "HH:MM:SS"; kosong bila tanpa batas waktu atau sudah lewat. */
  sisa: string;
  isKedaluwarsa: boolean;
}

const dua = (n: number) => n.toString().padStart(2, '0');

/** Jam dihitung penuh: VA 24 jam baru dibuat terbaca "24:00:00", bukan "00:00:00". */
function tulisSisa(selisihMs: number): string {
  const jam = Math.floor(selisihMs / JAM_MS);
  const menit = Math.floor((selisihMs % JAM_MS) / MENIT_MS);
  const detik = Math.floor((selisihMs % MENIT_MS) / DETIK_MS);
  return `${dua(jam)}:${dua(menit)}:${dua(detik)}`;
}

function bacaBatas(kedaluwarsa: Date | string | null | undefined): number | null {
  if (!kedaluwarsa) return null;
  const batas = new Date(kedaluwarsa).getTime();
  return Number.isFinite(batas) ? batas : null;
}

function hitungKeadaan(batas: number | null): HitungMundur {
  if (batas === null) return { sisa: '', isKedaluwarsa: false };
  const selisih = batas - Date.now();
  return selisih > 0 ? { sisa: tulisSisa(selisih), isKedaluwarsa: false } : { sisa: '', isKedaluwarsa: true };
}

/**
 * Hitung mundur ke `expiresAt` checkout dari server. Saat batasnya lewat,
 * `onHabis` dipanggil SEKALI dan interval berhenti; layar lalu menampilkan
 * keadaan kedaluwarsa alih-alih memuat ulang setiap detik. Checkout yang sudah
 * lewat batas saat layar dibuka tidak memanggil `onHabis`: datanya baru dimuat.
 */
export function useHitungMundurPembayaran(kedaluwarsa: Date | string | null | undefined, onHabis: () => void): HitungMundur {
  const batas = bacaBatas(kedaluwarsa);
  const onHabisRef = useRef(onHabis);
  const [tercatat, setTercatat] = useState(() => ({ batas, keadaan: hitungKeadaan(batas) }));

  useEffect(() => {
    onHabisRef.current = onHabis;
  });

  useEffect(() => {
    setTercatat({ batas, keadaan: hitungKeadaan(batas) });
    if (batas === null || batas <= Date.now()) return;
    const interval = setInterval(() => {
      const keadaan = hitungKeadaan(batas);
      setTercatat({ batas, keadaan });
      if (!keadaan.isKedaluwarsa) return;
      clearInterval(interval);
      onHabisRef.current();
    }, DETIK_MS);
    return () => clearInterval(interval);
  }, [batas]);

  // Batas baru dihitung langsung saat render: menunggu efek berarti satu render
  // dengan keadaan checkout sebelumnya (mis. SSE dibuka untuk checkout kedaluwarsa).
  return tercatat.batas === batas ? tercatat.keadaan : hitungKeadaan(batas);
}
