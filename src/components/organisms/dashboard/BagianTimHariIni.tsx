import { useRouter } from 'expo-router';
import React from 'react';

import { ruteTimRencana } from '@/constants/rutePresurvei';
import { useTimHariIni } from '@/hooks/presurvei/useTimHariIni';
import { KartuTimHariIni } from './KartuTimHariIni';

/**
 * Kartu "Tim hari ini" beserta datanya. Dirender hanya untuk pemberi tugas,
 * sehingga sales biasa tidak memanggil rekap (server menjawabnya dengan
 * baris dirinya saja).
 */
export function BagianTimHariIni() {
  const router = useRouter();
  const tim = useTimHariIni();
  return (
    <KartuTimHariIni
      baris={tim.baris}
      isGagal={tim.isGagal}
      onCobaLagi={tim.cobaLagi}
      onBuka={(salesId) => router.push(ruteTimRencana(salesId, Date.now()))}
    />
  );
}
