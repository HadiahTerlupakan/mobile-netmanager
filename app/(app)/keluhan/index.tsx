import { Stack, useRouter } from 'expo-router';
import { MessageSquare, Plus } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { DaftarKosong } from '@/components/molecules/DaftarKosong';
import { KepalaLayarDaftar } from '@/components/molecules/KepalaLayarDaftar';
import { SegmenPilihan } from '@/components/molecules/SegmenPilihan';
import { KartuKeluhan } from '@/components/organisms/keluhan/KartuKeluhan';
import { useAuth } from '@/context/AuthContext';
import { useDaftarKeluhan } from '@/hooks/queries/useKeluhan';
import { AMBANG_MUAT_BERIKUTNYA, useMuatHalamanBerikutnya } from '@/hooks/useMuatHalamanBerikutnya';
import { DESAIN_PREMIUM, useTemaPersona } from '@/theme';
import type { KelompokStatusKeluhan, KeluhanRingkas, RingkasanKeluhanSales } from '@/types/keluhan';

const OPSI_STATUS = [
  { nilai: 'TERBUKA' as const, label: 'Berjalan' },
  { nilai: 'SELESAI' as const, label: 'Selesai' },
];
const UKURAN_IKON_TAMBAH = 18;
/** Jarak tombol "Lapor keluhan" mengambang dari tepi bawah area aman. */
const JARAK_BAWAH_TOMBOL_LAPOR = 20;

/** Satu chip saringan sales; tanpa `onTekan` tampil nonaktif (sales tanpa id). */
function ChipSales({ label, isTerpilih, onTekan }: { label: string; isTerpilih: boolean; onTekan?: () => void }) {
  const { tw: twTema } = useTemaPersona();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected: isTerpilih, disabled: !onTekan }}
      disabled={!onTekan}
      onPress={onTekan}
      style={twTema`mr-2 px-3 py-1.5 rounded-full border ${isTerpilih ? 'bg-utama-kuat border-utama-kuat' : 'bg-white border-slate-200'}`}
    >
      <Text style={twTema`text-xs ${isTerpilih ? 'text-white font-semibold' : 'text-slate-700'}`}>{label}</Text>
    </TouchableOpacity>
  );
}

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
  return (
    // flexGrow 0: tanpa ini ScrollView horizontal mengisi sisa tinggi layar dan chip ikut memanjang.
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`flex-grow-0`} contentContainerStyle={tw`px-4 pb-2 items-center`}>
      <ChipSales label="Semua sales" isTerpilih={terpilih === undefined} onTekan={() => onPilih(undefined)} />
      {ringkasan.map(({ salesId, namaSales, jumlahTerbuka }) => (
        <ChipSales
          key={salesId ?? 'tanpa'}
          label={`${namaSales} · ${jumlahTerbuka} berjalan`}
          isTerpilih={salesId !== null && terpilih === salesId}
          onTekan={salesId ? () => onPilih(salesId) : undefined}
        />
      ))}
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
  const muatBerikutnya = useMuatHalamanBerikutnya(kueri);
  const ringkasan = kueriRingkasan.data?.pages[0]?.ringkasanSales ?? null;
  const daftar = kueri.data?.pages.flatMap((halaman) => halaman.data) ?? [];
  const total = kueri.data?.pages[0]?.total;
  const isBerjalan = status === 'TERBUKA';

  const buka = useCallback((keluhan: KeluhanRingkas) => router.push(`/(app)/keluhan/${keluhan.id}`), [router]);
  const muatUlang = () => {
    void kueri.refetch();
    void kueriRingkasan.refetch();
  };

  return (
    <View style={[tw`flex-1`, { paddingTop: insets.top, backgroundColor: DESAIN_PREMIUM.latarLayar }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <KepalaLayarDaftar
        judul="Keluhan pelanggan"
        subjudul={total === undefined ? 'Dipantau sampai selesai' : `${total} keluhan ${isBerjalan ? 'berjalan' : 'selesai'}`}
      />

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
          onEndReachedThreshold={AMBANG_MUAT_BERIKUTNYA}
          refreshControl={
            <RefreshControl refreshing={kueri.isRefetching && !kueri.isFetchingNextPage} onRefresh={muatUlang} tintColor={warna.utamaKuat} />
          }
          renderItem={({ item }) => (
            <KartuKeluhan keluhan={item} isTampilkanSales={ringkasan !== null && item.namaSales !== user?.name} onTekan={buka} />
          )}
          ListFooterComponent={kueri.isFetchingNextPage ? <ActivityIndicator style={tw`my-4`} color={warna.utamaKuat} /> : null}
          ListEmptyComponent={
            <DaftarKosong
              isError={kueri.isError}
              onCobaLagi={() => void kueri.refetch()}
              ikon={MessageSquare}
              judul={isBerjalan ? 'Tidak ada keluhan berjalan' : 'Belum ada keluhan selesai'}
              pesan="Keluhan yang Anda laporkan untuk pelanggan muncul di sini."
            />
          }
        />
      )}

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Lapor keluhan baru"
        onPress={() => router.push('/(app)/pelanggan/saya')}
        style={[
          tw`absolute right-4 flex-row items-center rounded-full px-5 py-3.5 shadow-lg`,
          { bottom: insets.bottom + JARAK_BAWAH_TOMBOL_LAPOR, backgroundColor: warna.utamaKuat },
        ]}
      >
        <Plus size={UKURAN_IKON_TAMBAH} color="white" />
        <Text style={tw`text-white font-bold ml-1.5`}>Lapor keluhan</Text>
      </TouchableOpacity>
    </View>
  );
}
