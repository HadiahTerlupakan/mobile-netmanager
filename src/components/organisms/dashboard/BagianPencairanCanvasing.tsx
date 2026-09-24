import React from 'react';

import { useStatistikBeranda } from '@/hooks/useStatistikBeranda';
import { KartuPencairanCanvasing } from './KartuPencairanCanvasing';

/**
 * Kartu pencairan bonus canvasing beserta datanya, untuk Beranda sales
 * karyawan (sebelum Task 19 kartu ini ada di Beranda bawaan untuk sales).
 */
export function BagianPencairanCanvasing() {
  const statistik = useStatistikBeranda();
  return <KartuPencairanCanvasing statistik={statistik.data} onBerhasilCair={() => void statistik.refetch()} />;
}
