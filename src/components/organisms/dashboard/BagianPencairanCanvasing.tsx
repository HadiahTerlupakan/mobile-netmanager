import React from 'react';
import { ActivityIndicator } from 'react-native';
import tw from 'twrnc';

import { useStatistikBeranda } from '@/hooks/useStatistikBeranda';
import { KartuPencairanCanvasing } from './KartuPencairanCanvasing';

/**
 * Kartu pencairan bonus canvasing beserta datanya, untuk Beranda sales
 * karyawan (sebelum Task 19 kartu ini ada di Beranda bawaan untuk sales).
 * Kartu baru dirender setelah statistik ada: tanpa data kartu menebak skema
 * (BULANAN 0/30) yang bisa salah, dan tetap salah bila offline tanpa cache
 * (review akhir M2). Selama memuat tampil indikator; gagal tanpa cache → kosong.
 */
export function BagianPencairanCanvasing() {
  const statistik = useStatistikBeranda();
  if (statistik.data === undefined) {
    return statistik.isPending ? <ActivityIndicator testID="pencairan-canvasing-memuat" style={tw`my-4`} /> : null;
  }
  return <KartuPencairanCanvasing statistik={statistik.data} onBerhasilCair={() => void statistik.refetch()} />;
}
