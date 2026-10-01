import React from 'react';
import { Text } from 'react-native';
import tw from 'twrnc';

import { LABEL_STATUS_RENCANA, type RencanaStatusTampil } from '@/constants/presurvei';

/** Warna pil per status tampil rencana. */
const GAYA_STATUS: Record<RencanaStatusTampil, string> = {
  DIRENCANAKAN: 'text-blue-700 bg-blue-50',
  TERLEWAT: 'text-rose-700 bg-rose-50',
  SELESAI: 'text-emerald-700 bg-emerald-50',
  BATAL: 'text-gray-600 bg-gray-100',
};

const GAYA_MENUNGGU_KIRIM = 'text-amber-700 bg-amber-100';

interface LencanaStatusRencanaProps {
  status: RencanaStatusTampil;
  /** Laporannya masih di antrean offline: ditampilkan "Menunggu kirim" alih-alih status server. */
  isMenungguKirim?: boolean;
}

/** Pil status rencana (Direncanakan/Terlewat/Selesai/Batal, atau Menunggu kirim). */
export function LencanaStatusRencana({ status, isMenungguKirim = false }: LencanaStatusRencanaProps) {
  const gaya = isMenungguKirim ? GAYA_MENUNGGU_KIRIM : GAYA_STATUS[status];
  const label = isMenungguKirim ? 'Menunggu kirim' : LABEL_STATUS_RENCANA[status];
  return <Text style={tw`text-xs font-semibold rounded-full px-2 py-0.5 ${gaya}`}>{label}</Text>;
}
