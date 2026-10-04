import { useRouter } from 'expo-router';
import { FilePenLine } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { DaftarKosong } from '@/components/molecules/DaftarKosong';
import { KepalaLayarDaftar } from '@/components/molecules/KepalaLayarDaftar';
import { SegmenPilihan } from '@/components/molecules/SegmenPilihan';
import { KartuPengesahan } from '@/components/organisms/pengesahan/KartuPengesahan';
import { OPSI_KELOMPOK_PENGESAHAN } from '@/constants/pengesahan';
import { ruteDetailPengesahan } from '@/constants/rutePengesahan';
import { useDaftarPengesahan } from '@/hooks/queries/usePengesahan';
import { AMBANG_MUAT_BERIKUTNYA, useMuatHalamanBerikutnya } from '@/hooks/useMuatHalamanBerikutnya';
import { DESAIN_PREMIUM, useTemaPersona } from '@/theme';
import type { KelompokPengesahan, PengesahanSaya } from '@/types/pengesahan';

const PESAN_KOSONG: Readonly<Record<KelompokPengesahan, { judul: string; pesan: string }>> = {
  MENUNGGU: { judul: 'Tidak ada surat menunggu', pesan: 'Surat yang perlu Anda tanda tangani muncul di sini.' },
  SELESAI: { judul: 'Belum ada surat selesai', pesan: 'Surat yang sudah Anda tanda tangani atau tolak muncul di sini.' },
};

/** Daftar surat pengesahan saya: tab Menunggu / Selesai, tarik untuk menyegarkan, muat per halaman. */
export function DaftarPengesahanScreen() {
  const { warna } = useTemaPersona();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<KelompokPengesahan>('MENUNGGU');
  const kueri = useDaftarPengesahan(status);
  const muatBerikutnya = useMuatHalamanBerikutnya(kueri);
  const daftar = kueri.data?.pages.flatMap((halaman) => halaman.items) ?? [];
  const total = kueri.data?.pages[0]?.total;
  const buka = useCallback((surat: PengesahanSaya) => router.push(ruteDetailPengesahan(surat.id)), [router]);

  return (
    <View style={[tw`flex-1`, { paddingTop: insets.top, backgroundColor: DESAIN_PREMIUM.latarLayar }]}>
      <KepalaLayarDaftar judul="Pengesahan surat" subjudul={total === undefined ? 'Tanda tangan elektronik' : `${total} surat`} />
      <View style={tw`px-4 pb-2`}>
        <SegmenPilihan opsi={OPSI_KELOMPOK_PENGESAHAN} terpilih={status} onPilih={setStatus} />
      </View>
      {kueri.isPending ? (
        <ActivityIndicator style={tw`mt-16`} color={warna.utamaKuat} />
      ) : (
        <FlatList
          data={daftar}
          keyExtractor={(item) => item.id}
          contentContainerStyle={tw`pb-12 pt-1`}
          onEndReached={muatBerikutnya}
          onEndReachedThreshold={AMBANG_MUAT_BERIKUTNYA}
          refreshControl={
            <RefreshControl refreshing={kueri.isRefetching && !kueri.isFetchingNextPage} onRefresh={() => void kueri.refetch()} tintColor={warna.utamaKuat} />
          }
          renderItem={({ item }) => <KartuPengesahan surat={item} onTekan={buka} />}
          ListFooterComponent={kueri.isFetchingNextPage ? <ActivityIndicator style={tw`my-4`} color={warna.utamaKuat} /> : null}
          ListEmptyComponent={<DaftarKosong isError={kueri.isError} onCobaLagi={() => void kueri.refetch()} ikon={FilePenLine} {...PESAN_KOSONG[status]} />}
        />
      )}
    </View>
  );
}
