import React from 'react';
import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { KepalaLayar } from '@/components/molecules/KepalaLayar';
import { QueryErrorState } from '@/components/molecules/QueryErrorState';
import { FormProfilPelanggan } from '@/components/organisms/portalPelanggan/FormProfilPelanggan';
import { useProfilPelanggan } from '@/hooks/queries/useAkunPelanggan';

/** teal-600 */
const WARNA_MEMUAT = '#0d9488';

/** Edit nomor telepon dan preferensi notifikasi pelanggan. */
export default function EditProfilPelangganScreen() {
  const { data: profil, isPending, refetch } = useProfilPelanggan();
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
      <KepalaLayar judul="Edit Profil" />
      {isPending ? (
        <ActivityIndicator style={tw`mt-16`} color={WARNA_MEMUAT} />
      ) : profil ? (
        <FormProfilPelanggan profil={profil} />
      ) : (
        <QueryErrorState onRetry={() => void refetch()} />
      )}
    </SafeAreaView>
  );
}
