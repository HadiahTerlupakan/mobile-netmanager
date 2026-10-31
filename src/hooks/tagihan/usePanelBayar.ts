import { useState } from 'react';

type ModePanel = 'tutup' | 'bayar' | 'ganti-metode';

/** Keadaan panel "Rincian Pembayaran": tertutup, bayar baru, atau ganti metode checkout yang menunggu. */
export function usePanelBayar() {
  const [mode, setMode] = useState<ModePanel>('tutup');
  const [kodeMetode, setKodeMetode] = useState('');
  return {
    isTerbuka: mode !== 'tutup',
    /** Checkout yang menunggu sedang diganti metodenya: panel tampil menggantikan kartunya. */
    isGantiMetode: mode === 'ganti-metode',
    kodeMetode,
    setKodeMetode,
    buka: () => setMode('bayar'),
    bukaGantiMetode: () => setMode('ganti-metode'),
    tutup: () => setMode('tutup'),
  };
}
