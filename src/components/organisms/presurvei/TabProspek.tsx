import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Users } from 'lucide-react-native';
import { FlatList, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import tw from 'twrnc';

import { EmptyState } from '@/components/atoms/EmptyState';

import { PilihanChip } from '@/components/molecules/PilihanChip';
import { QueryErrorState } from '@/components/molecules/QueryErrorState';
import { SegmenPilihan } from '@/components/molecules/SegmenPilihan';
import {
  JEDA_CARI_PROSPEK_MS,
  JUDUL_PROSPEK_KOSONG,
  LABEL_STATUS_PROSPEK,
  PESAN_PROSPEK_KOSONG,
  PROSPEK_STATUSES,
} from '@/constants/presurvei';
import { RUTE_TAMBAH_PROSPEK, ruteRincianProspek } from '@/constants/rutePresurvei';
import { useDaftarProspek } from '@/hooks/queries/usePresurveiProspek';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  OPSI_FILTER_JENIS_PROSPEK,
  bangunFilterProspek,
  type FilterJenisProspek,
  type FilterStatusProspek,
} from '@/utils/presurvei/filterProspek';
import { KartuProspek } from './KartuProspek';
import { TombolTambahProspek } from './TombolTambahProspek';

const OPSI_STATUS: { nilai: FilterStatusProspek; label: string }[] = [
  { nilai: 'SEMUA', label: 'Semua' },
  ...PROSPEK_STATUSES.map((status) => ({ nilai: status, label: LABEL_STATUS_PROSPEK[status] })),
];

/**
 * Sub-tab Prospek: tombol Tambah prospek, lalu daftar prospek milik sendiri
 * dengan pencarian, saringan jenis (calon pelanggan/perantara), dan status.
 * Tombol tetap tampil saat daftar kosong atau gagal dimuat.
 */
export function TabProspek() {
  const router = useRouter();
  const [status, setStatus] = useState<FilterStatusProspek>('SEMUA');
  const [jenis, setJenis] = useState<FilterJenisProspek>('SEMUA');
  const [cari, setCari] = useState('');
  const cariTertunda = useDebouncedValue(cari, JEDA_CARI_PROSPEK_MS);
  const daftar = useDaftarProspek(bangunFilterProspek(status, cariTertunda, jenis));
  const prospek = daftar.data?.pages.flatMap((halaman) => halaman.data) ?? [];

  return (
    <View style={tw`flex-1 px-4`}>
      <TombolTambahProspek label="Tambah prospek" onTekan={() => router.push(RUTE_TAMBAH_PROSPEK)} />
      <TextInput
        accessibilityLabel="Cari prospek"
        value={cari}
        onChangeText={setCari}
        placeholder="Cari nama atau nomor HP"
        style={tw`bg-white border border-gray-300 rounded-xl px-3 py-2 mb-2`}
      />
      <View style={tw`mb-2`}>
        <SegmenPilihan opsi={OPSI_FILTER_JENIS_PROSPEK} terpilih={jenis} onPilih={setJenis} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`mb-2 flex-grow-0`}>
        <PilihanChip opsi={OPSI_STATUS} terpilih={status} onPilih={setStatus} />
      </ScrollView>
      {daftar.isError ? (
        <QueryErrorState message="Prospek gagal dimuat." onRetry={() => void daftar.refetch()} />
      ) : (
        <FlatList
          data={prospek}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <KartuProspek prospek={item} onBuka={(id) => router.push(ruteRincianProspek(id))} />}
          onEndReached={() => {
            if (daftar.hasNextPage && !daftar.isFetchingNextPage) void daftar.fetchNextPage();
          }}
          refreshControl={<RefreshControl refreshing={daftar.isRefetching} onRefresh={() => void daftar.refetch()} />}
          contentContainerStyle={tw`pb-24`}
          ListEmptyComponent={
            daftar.isPending ? (
              <Text style={tw`text-center text-slate-500 mt-8`}>Memuat…</Text>
            ) : (
              <EmptyState ikon={Users} judul={JUDUL_PROSPEK_KOSONG} pesan={PESAN_PROSPEK_KOSONG} />
            )
          }
        />
      )}
    </View>
  );
}
