import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import tw from 'twrnc';

import { PilihanChip } from '@/components/molecules/PilihanChip';
import { QueryErrorState } from '@/components/molecules/QueryErrorState';
import { JEDA_CARI_PROSPEK_MS, LABEL_STATUS_PROSPEK, PROSPEK_STATUSES } from '@/constants/presurvei';
import { ruteRincianProspek } from '@/constants/rutePresurvei';
import { useDaftarProspek } from '@/hooks/queries/usePresurveiProspek';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { bangunFilterProspek, type FilterStatusProspek } from '@/utils/presurvei/filterProspek';
import { KartuProspek } from './KartuProspek';

const OPSI_STATUS: { nilai: FilterStatusProspek; label: string }[] = [
  { nilai: 'SEMUA', label: 'Semua' },
  ...PROSPEK_STATUSES.map((status) => ({ nilai: status, label: LABEL_STATUS_PROSPEK[status] })),
];

/** Sub-tab Prospek: daftar prospek milik sendiri per status, dengan pencarian. */
export function TabProspek() {
  const router = useRouter();
  const [status, setStatus] = useState<FilterStatusProspek>('SEMUA');
  const [cari, setCari] = useState('');
  const cariTertunda = useDebouncedValue(cari, JEDA_CARI_PROSPEK_MS);
  const daftar = useDaftarProspek(bangunFilterProspek(status, cariTertunda));
  const prospek = daftar.data?.pages.flatMap((halaman) => halaman.data) ?? [];

  return (
    <View style={tw`flex-1 px-4`}>
      <TextInput
        accessibilityLabel="Cari prospek"
        value={cari}
        onChangeText={setCari}
        placeholder="Cari nama atau nomor HP"
        style={tw`bg-white border border-gray-300 rounded-xl px-3 py-2 mb-2`}
      />
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
            <Text style={tw`text-center text-gray-500 mt-8`}>
              {daftar.isPending ? 'Memuat…' : 'Belum ada prospek.'}
            </Text>
          }
        />
      )}
    </View>
  );
}
