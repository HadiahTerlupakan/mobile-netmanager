import React from 'react';
import { FlatList, Text, View } from 'react-native';
import tw from 'twrnc';

import { PilihanChip } from '@/components/molecules/PilihanChip';
import { useSaringPredikat } from '@/hooks/presurvei/useSaringPredikat';
import type { PenilaianSales } from '@/types/penilaian';
import { BarisAnggotaPenilaian } from './BarisAnggotaPenilaian';

/** Ruang kosong di bawah daftar supaya baris terakhir tidak menempel tepi layar. */
const JARAK_BAWAH_DAFTAR = 24;

interface DaftarPenilaianSalesProps {
  daftar: readonly PenilaianSales[];
  /** Isi di atas chip filter (kepala layar, kartu kepala, dsb.); ikut tergulung. */
  header: React.ReactElement | null;
  penggunaId: string | null;
  /** Nama kepala per id; bila ada, ditulis kecil di tiap baris. */
  namaKepala?: ReadonlyMap<string, string>;
  onBuka: (salesId: string) => void;
}

/**
 * Daftar sales tervirtualisasi (FlatList sebagai penggulung utama) dengan
 * chip filter predikat, urut skor. Dipakai tab Tim, tab Semua sales, dan
 * modal rincian kepala.
 */
export function DaftarPenilaianSales({ daftar, header, penggunaId, namaKepala, onBuka }: DaftarPenilaianSalesProps) {
  const saring = useSaringPredikat(daftar);
  const kepalaDari = (sales: PenilaianSales) =>
    sales.kepalaSalesId && namaKepala?.get(sales.kepalaSalesId) ? `Kepala: ${namaKepala.get(sales.kepalaSalesId)}` : undefined;
  return (
    <FlatList
      data={saring.anggota}
      keyExtractor={(item) => item.salesId}
      ListHeaderComponent={
        <View>
          {header}
          <View style={tw`px-4 mb-3`}>
            <PilihanChip opsi={saring.opsi} terpilih={saring.filter} onPilih={saring.pilih} />
          </View>
        </View>
      }
      ListEmptyComponent={<Text style={tw`text-sm text-gray-500 text-center mt-4`}>Belum ada anggota.</Text>}
      renderItem={({ item }) => (
        <BarisAnggotaPenilaian
          penilaian={item}
          isSaya={item.salesId === penggunaId}
          keterangan={kepalaDari(item)}
          onBuka={() => onBuka(item.salesId)}
        />
      )}
      contentContainerStyle={{ paddingBottom: JARAK_BAWAH_DAFTAR }}
    />
  );
}
