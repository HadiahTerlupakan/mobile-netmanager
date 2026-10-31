import { isAxiosError } from 'axios';
import { useFocusEffect } from 'expo-router';
import React, { useCallback } from 'react';
import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { KepalaLayar } from '@/components/molecules/KepalaLayar';
import { QueryErrorState } from '@/components/molecules/QueryErrorState';
import { TampilanUpgradePaket } from '@/components/organisms/portalPelanggan/TampilanUpgradePaket';
import { usePaketPelanggan } from '@/hooks/queries/usePaketPelanggan';
import { extractApiErrorMessage } from '@/utils/errorHandling';

/** teal-600 */
const WARNA_MEMUAT = '#0d9488';

/** Pesan server (mis. "Paket langganan tidak ditemukan") lebih jelas daripada galat umum. */
function pesanGalatPaket(error: unknown): string | undefined {
  return isAxiosError(error) ? extractApiErrorMessage(error.response?.data) : undefined;
}

/** Upgrade paket pelanggan; perubahan berlaku pada siklus tagihan berikutnya. */
export default function UpgradePaketScreen() {
  const { data: paket, isPending, error, isRefetching, refetch } = usePaketPelanggan();
  // Pengajuan bisa dibatalkan atau diterapkan dari portal web selama layar ini tertutup.
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
      <KepalaLayar judul="Upgrade Paket" />
      {isPending ? (
        <ActivityIndicator style={tw`mt-16`} color={WARNA_MEMUAT} />
      ) : paket ? (
        <TampilanUpgradePaket paket={paket} isMenyegarkan={isRefetching} onSegarkan={() => void refetch()} />
      ) : (
        <QueryErrorState message={pesanGalatPaket(error)} onRetry={() => void refetch()} />
      )}
    </SafeAreaView>
  );
}
