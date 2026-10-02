import { Stack, useRouter } from 'expo-router';
import { AlertTriangle, ArrowLeft, MessageSquare, Plus } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { EmptyState } from '@/components/atoms/EmptyState';
import { SegmenPilihan } from '@/components/molecules/SegmenPilihan';
import { KartuKeluhan } from '@/components/organisms/keluhan/KartuKeluhan';
import { useAuth } from '@/context/AuthContext';
import { useDaftarKeluhan } from '@/hooks/queries/useKeluhan';
import { DESAIN_PREMIUM, useTemaPersona } from '@/theme';
import type { KelompokStatusKeluhan, KeluhanRingkas, RingkasanKeluhanSales } from '@/types/keluhan';

const OPSI_STATUS = [
  { nilai: 'TERBUKA' as const, label: 'Berjalan' },
  { nilai: 'SELESAI' as const, label: 'Selesai' },
];

/** Chip per sales (kepala / head of sales): jumlah keluhan berjalan, ketuk untuk menyaring. */
function SaringanSales({
  ringkasan,
  terpilih,
  onPilih,
}: {
  ringkasan: RingkasanKeluhanSales[];
  terpilih: string | undefined;
  onPilih: (salesId: string | undefined) => void;
}) {
  const { tw: twTema } = useTemaPersona();
  const chip = (kunci: string, label: string, isTerpilih: boolean, onTekan?: () => void) => (
    <TouchableOpacity
      key={kunci}
      accessibilityRole="button"
      accessibilityState={{ selected: isTerpilih, disabled: !onTekan }}
      disabled={!onTekan}
      onPress={onTekan}
      style={twTema`mr-2 px-3 py-1.5 rounded-full border ${isTerpilih ? 'bg-utama-kuat border-utama-kuat' : 'bg-white border-slate-200'}`}
    >
      <Text style={twTema`text-xs ${isTerpilih ? 'text-white font-semibold' : 'text-slate-700'}`}>{label}</Text>
    </TouchableOpacity>
  );
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`px-4 pb-2`}>
      {chip('semua', 'Semua sales', terpilih === undefined, () => onPilih(undefined))}
      {ringkasan.map((item) =>
        chip(
          item.salesId ?? 'tanpa',
          `${item.namaSales} · ${item.jumlahTerbuka}`,
          item.salesId !== null && terpilih === item.salesId,
          item.salesId ? () => onPilih(item.salesId as string) : undefined,
        ),
      )}
    </ScrollView>
  );
}

/**
 * Keluhan pelanggan yang dicatat / dipantau sales: status penanganan helpdesk
 * dan WO teknisi. Kepala sales melihat timnya, head of sales semua sales.
 */
export default function DaftarKeluhanScreen() {
  const { warna } = useTemaPersona();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<KelompokStatusKeluhan>('TERBUKA');
  const [salesId, setSalesId] = useState<string | undefined>(undefined);
  // Ringkasan per sales selalu dari daftar "berjalan" tanpa saringan sales.
  const kueriRingkasan = useDaftarKeluhan('TERBUKA');
  const kueri = useDaftarKeluhan(status, salesId);
  const ringkasan = kueriRingkasan.data?.pages[0]?.ringkasanSales ?? null;
  const daftar = kueri.data?.pages.flatMap((halaman) => halaman.data) ?? [];
  const total = kueri.data?.pages[0]?.total;

  const buka = useCallback((keluhan: KeluhanRingkas) => router.push(`/(app)/keluhan/${keluhan.id}`), [router]);
  const muatBerikutnya = () => {
    if (kueri.hasNextPage && !kueri.isFetchingNextPage) void kueri.fetchNextPage();
  };

  return (
    <View style={[tw`flex-1`, { paddingTop: insets.top, backgroundColor: DESAIN_PREMIUM.latarLayar }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={tw`flex-row items-center px-4 pt-3 pb-2`}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Kembali" onPress={() => router.back()} style={tw`p-2 -ml-2 mr-1`}>
          <ArrowLeft size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={tw`flex-1`}>
          <Text style={tw`text-2xl font-bold text-slate-900`}>Keluhan pelanggan</Text>
          <Text style={tw`text-sm text-slate-500 mt-0.5`}>
            {total === undefined ? 'Dipantau sampai selesai' : `${total} keluhan ${status === 'TERBUKA' ? 'berjalan' : 'selesai'}`}
          </Text>
        </View>
      </View>

      <View style={tw`px-4 pb-2`}>
        <SegmenPilihan opsi={OPSI_STATUS} terpilih={status} onPilih={setStatus} />
      </View>
      {ringkasan && ringkasan.length > 0 ? <SaringanSales ringkasan={ringkasan} terpilih={salesId} onPilih={setSalesId} /> : null}

      {kueri.isPending ? (
        <ActivityIndicator style={tw`mt-16`} color={warna.utamaKuat} />
      ) : (
        <FlatList
          data={daftar}
          keyExtractor={(item) => item.id}
          contentContainerStyle={tw`pb-28 pt-1`}
          onEndReached={muatBerikutnya}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={kueri.isRefetching && !kueri.isFetchingNextPage}
              onRefresh={() => {
                void kueri.refetch();
                void kueriRingkasan.refetch();
              }}
              tintColor={warna.utamaKuat}
            />
          }
          renderItem={({ item }) => (
            <KartuKeluhan keluhan={item} isTampilkanSales={ringkasan !== null && item.namaSales !== user?.name} onTekan={buka} />
          )}
          ListFooterComponent={kueri.isFetchingNextPage ? <ActivityIndicator style={tw`my-4`} color={warna.utamaKuat} /> : null}
          ListEmptyComponent={
            <EmptyState
              ikon={kueri.isError ? AlertTriangle : MessageSquare}
              judul={kueri.isError ? 'Gagal memuat' : status === 'TERBUKA' ? 'Tidak ada keluhan berjalan' : 'Belum ada keluhan selesai'}
              pesan={kueri.isError ? 'Tarik ke bawah untuk mencoba lagi.' : 'Keluhan yang Anda laporkan untuk pelanggan muncul di sini.'}
              aksi={kueri.isError ? { label: 'Coba lagi', onTekan: () => void kueri.refetch() } : undefined}
            />
          }
        />
      )}

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Lapor keluhan baru"
        onPress={() => router.push('/(app)/pelanggan/saya')}
        style={[tw`absolute right-4 flex-row items-center rounded-full px-5 py-3.5 shadow-lg`, { bottom: insets.bottom + 20, backgroundColor: warna.utamaKuat }]}
      >
        <Plus size={18} color="white" />
        <Text style={tw`text-white font-bold ml-1.5`}>Lapor keluhan</Text>
      </TouchableOpacity>
    </View>
  );
}
