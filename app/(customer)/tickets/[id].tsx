import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { QueryErrorState } from '@/components/molecules/QueryErrorState';
import { TampilanDetailTiket } from '@/components/organisms/portalPelanggan/TampilanDetailTiket';
import { useDetailTiketPelanggan } from '@/hooks/queries/useTiketPelanggan';
import { getHttpStatus } from '@/lib/queryErrorReporting';

const STATUS_TIDAK_DITEMUKAN = 404;
/** teal-600 */
const WARNA_MEMUAT = '#0d9488';

/** Tiket yang tidak ada atau milik pelanggan lain (server menjawab 404 untuk keduanya). */
function TiketTidakDitemukan() {
  const router = useRouter();
  return (
    <View style={tw`flex-1 items-center justify-center p-6`}>
      <Text style={tw`text-gray-500 mb-4`}>Tiket tidak ditemukan</Text>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.back()}>
        <Text style={tw`text-teal-600 font-bold`}>Kembali ke daftar tiket</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Detail tiket bantuan pelanggan. Tanpa websocket: data dimuat ulang setiap
 * layar mendapat fokus, setelah membalas/menutup, dan saat ditarik.
 */
export default function DetailTiketPelangganScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { data: tiket, isPending, isError, error, isRefetching, refetch } = useDetailTiketPelanggan(id);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={['top', 'bottom']}>
      {isPending ? (
        <ActivityIndicator style={tw`mt-16`} color={WARNA_MEMUAT} />
      ) : tiket ? (
        <TampilanDetailTiket tiket={tiket} isMenyegarkan={isRefetching} onSegarkan={() => void refetch()} />
      ) : isError && getHttpStatus(error) === STATUS_TIDAK_DITEMUKAN ? (
        <TiketTidakDitemukan />
      ) : (
        <QueryErrorState onRetry={() => void refetch()} />
      )}
    </SafeAreaView>
  );
}
