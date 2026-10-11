import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { KepalaLayar } from '@/components/molecules/KepalaLayar';
import { QueryErrorState } from '@/components/molecules/QueryErrorState';

interface LayarGalatBerkepalaProps {
  /** Judul kepala, sama dengan judul layar saat datanya berhasil dimuat. */
  judul: string;
  pesan: string;
  /** Tanpa ini tombol "Coba Lagi" tidak ditampilkan — untuk galat yang tidak akan sembuh. */
  onCobaLagi?: () => void;
}

/**
 * Layar penuh untuk data yang gagal dimuat, lengkap dengan tombol kembali.
 *
 * `QueryErrorState` sendirian tidak punya kepala layar. Dipakai sebagai
 * seluruh isi layar — seperti pada tujuan deep-link notifikasi penugasan —
 * hasilnya jalan buntu: tanpa tombol kembali, tanpa tab bar, dan satu-satunya
 * tombol ("Coba Lagi") justru tidak berguna bila datanya memang sudah hilang.
 */
export function LayarGalatBerkepala({ judul, pesan, onCobaLagi }: LayarGalatBerkepalaProps) {
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <KepalaLayar judul={judul} />
      <QueryErrorState message={pesan} onRetry={onCobaLagi} />
    </SafeAreaView>
  );
}
